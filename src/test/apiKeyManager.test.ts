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
