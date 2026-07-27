import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { ILogger } from "ai-l10n-sdk";
import { registerMcpServerProvider } from "../mcpServerProvider";

suite("MCP Server Provider Tests", () => {
  let mockContext: any;
  let mockConfiguration: any;
  let mockLogger: ILogger;
  let mockApiKeyManager: any;
  let registeredProvider: vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition>;
  let registerStub: sinon.SinonStub;

  const EXTENSION_VERSION = "1.13.0";
  const SERVER_PATH = "/ext/dist/mcp-server.js";

  setup(() => {
    mockConfiguration = {
      get: sinon.stub().returns(true),
      update: sinon.stub(),
    };

    mockLogger = {
      logInfo: sinon.stub(),
      logWarning: sinon.stub(),
      logError: sinon.stub(),
      showAndLogError: sinon.stub(),
    };

    mockApiKeyManager = {
      getApiKey: sinon.stub().resolves("test-api-key"),
    };

    mockContext = {
      asAbsolutePath: sinon.stub().returns(SERVER_PATH),
      extension: { packageJSON: { version: EXTENSION_VERSION } },
    };

    sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfiguration);

    registerStub = sinon
      .stub(vscode.lm, "registerMcpServerDefinitionProvider")
      .callsFake((_id: string, provider: any) => {
        registeredProvider = provider;
        return { dispose: sinon.stub() } as any;
      });
  });

  teardown(() => {
    sinon.restore();
  });

  function register() {
    return registerMcpServerProvider(mockContext, mockApiKeyManager, mockLogger);
  }

  async function provide() {
    return (await registeredProvider.provideMcpServerDefinitions(
      new vscode.CancellationTokenSource().token,
    )) as vscode.McpStdioServerDefinition[];
  }

  test("registers the provider with the id declared in package.json", () => {
    register();

    assert.ok(registerStub.calledOnce);
    assert.strictEqual(registerStub.firstCall.args[0], "l10nDevMcpProvider");
  });

  test("provides the bundled server running on the editor's Node", async () => {
    register();

    const servers = await provide();

    assert.strictEqual(servers.length, 1);
    assert.strictEqual(servers[0].label, "l10n.dev");
    assert.strictEqual(servers[0].command, process.execPath);
    assert.deepStrictEqual(servers[0].args, [SERVER_PATH]);
    assert.strictEqual(servers[0].env.ELECTRON_RUN_AS_NODE, "1");
    assert.strictEqual(servers[0].version, EXTENSION_VERSION);
    assert.ok(mockContext.asAbsolutePath.calledWith("dist/mcp-server.js"));
  });

  test("does not expose the API Key before the server is resolved", async () => {
    register();

    const servers = await provide();

    // The editor caches definitions, so the key must not appear anywhere in one
    assert.strictEqual(servers[0].env.L10N_API_KEY, undefined);
    assert.ok(
      !JSON.stringify(servers[0]).includes("test-api-key"),
      "the key must not reach the definitions the editor caches",
    );
  });

  test("marks the version when no key is available, so a later key restarts it", async () => {
    mockApiKeyManager.getApiKey.resolves(undefined);
    register();

    const servers = await provide();

    assert.strictEqual(servers[0].version, `${EXTENSION_VERSION}+no-api-key`);
  });

  test("provides no server when enableMcpServer is disabled", async () => {
    mockConfiguration.get.withArgs("enableMcpServer", true).returns(false);
    register();

    const servers = await provide();

    assert.strictEqual(servers.length, 0);
  });

  test("injects the stored API Key when resolving the server", async () => {
    register();
    const [server] = await provide();

    const resolved = (await registeredProvider.resolveMcpServerDefinition!(
      server,
      new vscode.CancellationTokenSource().token,
    )) as vscode.McpStdioServerDefinition;

    assert.strictEqual(resolved.env.L10N_API_KEY, "test-api-key");
    // The Node-mode flag must survive the merge
    assert.strictEqual(resolved.env.ELECTRON_RUN_AS_NODE, "1");
  });

  test("still starts the server when the extension has no API Key", async () => {
    // The server resolves a key itself from ~/.ai-l10n/config.json, so blocking the
    // start would break users who configured one via the CLI or npm package.
    mockApiKeyManager.getApiKey.resolves(undefined);
    register();
    const [server] = await provide();

    const resolved = (await registeredProvider.resolveMcpServerDefinition!(
      server,
      new vscode.CancellationTokenSource().token,
    )) as vscode.McpStdioServerDefinition;

    assert.ok(resolved, "server must still start");
    assert.strictEqual(
      resolved.env.L10N_API_KEY,
      undefined,
      "must not inject an empty key that would shadow the server's own",
    );
    assert.strictEqual(resolved.env.ELECTRON_RUN_AS_NODE, "1");
  });

  test("refresh fires the change event", async () => {
    const { refresh } = register();
    const listener = sinon.stub();
    registeredProvider.onDidChangeMcpServerDefinitions!(listener);

    refresh();

    assert.ok(listener.calledOnce);
  });

  test("survives an editor without the MCP API", () => {
    registerStub.throws(new Error("not available"));

    const registration = register();

    assert.ok(registration.disposable);
    assert.ok((mockLogger.logWarning as sinon.SinonStub).called);
    // Must not throw when disposed
    registration.disposable.dispose();
  });
});
