import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { ApiKeyManager } from "../apiKeyManager";
import { ILogger } from "ai-l10n-sdk";

suite("ApiKeyManager Configuration Migration Tests", () => {
  let mockContext: any;
  let mockSecrets: any;
  let mockConfiguration: any;
  let mockLogger: ILogger;
  let mockSharedApiKeyManager: any;
  let apiKeyManager: ApiKeyManager;

  setup(() => {
    // Mock VS Code secrets API
    mockSecrets = {
      get: sinon.stub(),
      store: sinon.stub(),
      delete: sinon.stub(),
    };

    // Mock VS Code configuration API
    mockConfiguration = {
      get: sinon.stub(),
      update: sinon.stub(),
    };

    // Mock logger
    mockLogger = {
      logInfo: sinon.stub(),
      logWarning: sinon.stub(),
      logError: sinon.stub(),
      showAndLogError: sinon.stub(),
    };

    // Mock the key store shared with the ai-l10n CLI and the MCP server.
    // Injected so tests never touch the real ~/.ai-l10n/config.json.
    mockSharedApiKeyManager = {
      getStoredApiKey: sinon.stub().resolves(undefined),
      clearStoredApiKey: sinon.stub().resolves(),
    };

    // Mock VS Code workspace API
    sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfiguration);
    sinon.stub(vscode.window, "showInformationMessage");
    sinon.stub(vscode.window, "showWarningMessage");

    // Mock extension context
    mockContext = {
      secrets: mockSecrets,
    };

    apiKeyManager = new ApiKeyManager(
      mockContext,
      mockLogger,
      mockSharedApiKeyManager
    );
  });

  teardown(() => {
    sinon.restore();
  });

  test("prefers configuration API Key over secure storage (for updates)", async () => {
    // Arrange
    const oldApiKey = "old-expired-key";
    const newApiKey = "new-fresh-key";
    mockSecrets.get.resolves(oldApiKey); // Old key in secure storage
    mockConfiguration.get.withArgs("apiKey").returns(newApiKey); // New key in config
    mockSecrets.store.resolves();
    mockConfiguration.update.resolves();

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, newApiKey);
    assert.ok(
      mockSecrets.store.calledWith("l10n-translate-i18n.apiKey", newApiKey)
    );
    assert.ok(
      mockConfiguration.update.calledWith(
        "apiKey",
        undefined,
        vscode.ConfigurationTarget.Global
      )
    );
    assert.ok(
      (vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
        "API Key updated securely! 🔐"
      )
    );
  });

  test("migrates API Key from configuration to secure storage", async () => {
    // Arrange
    const testApiKey = "test-api-key-from-config";
    mockSecrets.get.resolves(undefined); // No API Key in secure storage
    mockConfiguration.get.withArgs("apiKey").returns(testApiKey); // API Key in config
    mockSecrets.store.resolves();
    mockConfiguration.update.resolves();

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, testApiKey);
    assert.ok(
      mockSecrets.store.calledWith("l10n-translate-i18n.apiKey", testApiKey)
    );
    assert.ok(
      mockConfiguration.update.calledWith(
        "apiKey",
        undefined,
        vscode.ConfigurationTarget.Global
      )
    );
    assert.ok(
      (vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
        "API Key migrated to secure storage for better security! 🔐"
      )
    );
  });

  test("returns API Key from secure storage when available", async () => {
    // Arrange
    const testApiKey = "test-api-key-from-secrets";
    mockSecrets.get.resolves(testApiKey); // API Key in secure storage

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, testApiKey);
  });

  test("returns undefined when no API Key is found anywhere", async () => {
    // Arrange
    mockSecrets.get.resolves(undefined); // No API Key in secure storage
    mockConfiguration.get.withArgs("apiKey").returns(undefined); // No API Key in config

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, undefined);
  });

  test("falls back to the key shared with the CLI and MCP server", async () => {
    // Arrange: nothing in VS Code, but a key was set via the CLI or an agent
    const sharedApiKey = "key-from-ai-l10n-config";
    mockSecrets.get.resolves(undefined);
    mockConfiguration.get.withArgs("apiKey").returns(undefined);
    mockSharedApiKeyManager.getStoredApiKey.resolves(sharedApiKey);

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, sharedApiKey);
  });

  test("prefers secure storage over the shared key store", async () => {
    // Arrange
    mockSecrets.get.resolves("key-from-vscode-secrets");
    mockSharedApiKeyManager.getStoredApiKey.resolves("key-from-ai-l10n-config");

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, "key-from-vscode-secrets");
    assert.ok(
      mockSharedApiKeyManager.getStoredApiKey.notCalled,
      "the shared store is only a fallback"
    );
  });

  test("setApiKey never writes to the shared key store", async () => {
    // Arrange
    sinon.stub(vscode.window, "showInputBox").resolves("brand-new-key");
    mockSecrets.store.resolves();

    // Act
    await apiKeyManager.setApiKey();

    // Assert
    assert.ok(
      mockSecrets.store.calledWith("l10n-translate-i18n.apiKey", "brand-new-key")
    );
    assert.strictEqual(
      mockSharedApiKeyManager.storeApiKey,
      undefined,
      "the shared store must never be written to from the extension"
    );
  });

  test("clearApiKey offers to clear the shared key store too", async () => {
    // Arrange
    mockSecrets.delete = sinon.stub().resolves();
    mockConfiguration.update.resolves();
    mockSharedApiKeyManager.getStoredApiKey.resolves("key-from-ai-l10n-config");
    (vscode.window.showWarningMessage as sinon.SinonStub).resolves("Remove");

    // Act
    await apiKeyManager.clearApiKey();

    // Assert
    assert.ok(mockSharedApiKeyManager.clearStoredApiKey.calledOnce);
  });

  test("clearApiKey keeps the shared key when the user declines", async () => {
    // Arrange
    mockSecrets.delete = sinon.stub().resolves();
    mockConfiguration.update.resolves();
    mockSharedApiKeyManager.getStoredApiKey.resolves("key-from-ai-l10n-config");
    (vscode.window.showWarningMessage as sinon.SinonStub).resolves("Keep");

    // Act
    await apiKeyManager.clearApiKey();

    // Assert
    assert.ok(mockSharedApiKeyManager.clearStoredApiKey.notCalled);
    assert.ok(mockSecrets.delete.called, "VS Code's own copy is still cleared");
  });

  test("clearApiKey removes key from both storages", async () => {
    // Arrange
    mockSecrets.delete = sinon.stub().resolves();
    mockConfiguration.update.resolves();

    // Act
    await apiKeyManager.clearApiKey();

    // Assert
    assert.ok(mockSecrets.delete.calledWith("l10n-translate-i18n.apiKey"));
    assert.ok(
      mockConfiguration.update.calledWith(
        "apiKey",
        undefined,
        vscode.ConfigurationTarget.Global
      )
    );
    assert.ok(
      (vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
        "API Key cleared. You can set a new one in the extension settings or using the 'Set API Key' command."
      )
    );
  });
});
