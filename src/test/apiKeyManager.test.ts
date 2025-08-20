import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { ApiKeyManager } from "../apiKeyManager";

suite("ApiKeyManager Configuration Migration Tests", () => {
  let mockContext: any;
  let mockSecrets: any;
  let mockConfiguration: any;
  let apiKeyManager: ApiKeyManager;

  setup(() => {
    // Mock VS Code secrets API
    mockSecrets = {
      get: sinon.stub(),
      store: sinon.stub(),
    };

    // Mock VS Code configuration API
    mockConfiguration = {
      get: sinon.stub(),
      update: sinon.stub(),
    };

    // Mock VS Code workspace API
    sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfiguration);
    sinon.stub(vscode.window, "showInformationMessage");

    // Mock extension context
    mockContext = {
      secrets: mockSecrets,
    };

    apiKeyManager = new ApiKeyManager(mockContext);
  });

  teardown(() => {
    sinon.restore();
  });

  test("migrates API key from configuration to secure storage", async () => {
    // Arrange
    const testApiKey = "test-api-key-from-config";
    mockSecrets.get.resolves(undefined); // No API key in secure storage
    mockConfiguration.get.withArgs("apiKey").returns(testApiKey); // API key in config
    mockSecrets.store.resolves();
    mockConfiguration.update.resolves();

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, testApiKey);
    assert.ok(mockSecrets.store.calledWith("l10n-translate-i18n.apiKey", testApiKey));
    assert.ok(mockConfiguration.update.calledWith("apiKey", undefined, vscode.ConfigurationTarget.Global));
    assert.ok((vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
      "API Key migrated to secure storage for better security! 🔐"
    ));
  });

  test("returns API key from secure storage when available", async () => {
    // Arrange
    const testApiKey = "test-api-key-from-secrets";
    mockSecrets.get.resolves(testApiKey); // API key in secure storage

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, testApiKey);
    assert.ok(!mockConfiguration.get.called); // Should not check configuration
  });

  test("returns undefined when no API key is found anywhere", async () => {
    // Arrange
    mockSecrets.get.resolves(undefined); // No API key in secure storage
    mockConfiguration.get.withArgs("apiKey").returns(undefined); // No API key in config

    // Act
    const result = await apiKeyManager.getApiKey();

    // Assert
    assert.strictEqual(result, undefined);
  });
});
