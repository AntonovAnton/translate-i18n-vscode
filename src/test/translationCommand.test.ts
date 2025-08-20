import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";

// Import the translation command handler
import { handleTranslateCommand } from "../translationCommand";

suite("Translation Command Tests", () => {
  let mockApiKeyManager: any;
  let mockTranslationService: any;
  let mockI18nProjectManager: any;
  let mockLanguageSelector: any;

  setup(() => {
    // Create mocks for all dependencies
    mockApiKeyManager = {
      getApiKey: sinon.stub(),
      ensureApiKey: sinon.stub(),
      setApiKey: sinon.stub(),
    };

    mockTranslationService = {
      translateJson: sinon.stub(),
    };

    mockI18nProjectManager = {
      detectLanguagesFromProject: sinon.stub(),
      validateLanguageCode: sinon.stub(),
      normalizeLanguageCode: sinon.stub(),
      generateTargetFilePath: sinon.stub(),
    };

    mockLanguageSelector = {
      selectTargetLanguage: sinon.stub(),
    };

    // Mock VS Code APIs
    sinon.stub(vscode.window, "showErrorMessage");
    sinon.stub(vscode.window, "showInformationMessage");
    sinon.stub(vscode.window, "withProgress");
  });

  teardown(() => {
    sinon.restore();
  });

  test("handleTranslateCommand returns early when API Key is not provided", async () => {
    // Arrange
    mockApiKeyManager.ensureApiKey.resolves(undefined);
    const mockUri = { fsPath: "/test/file.json" } as vscode.Uri;

    // Act
    await handleTranslateCommand(
      mockUri,
      mockApiKeyManager,
      mockTranslationService,
      mockI18nProjectManager,
      mockLanguageSelector
    );

    // Assert
    assert.ok(mockApiKeyManager.ensureApiKey.called);
    // Should not proceed to other operations when no API Key
    assert.ok(!mockI18nProjectManager.detectLanguagesFromProject.called);
  });

  test("handleTranslateCommand shows error for non-JSON files", async () => {
    // Arrange
    mockApiKeyManager.ensureApiKey.resolves("test-api-key");
    const mockUri = { fsPath: "/test/file.txt" } as vscode.Uri;

    // Act
    await handleTranslateCommand(
      mockUri,
      mockApiKeyManager,
      mockTranslationService,
      mockI18nProjectManager,
      mockLanguageSelector
    );

    // Assert
    assert.ok(
      (vscode.window.showErrorMessage as sinon.SinonStub).calledWith(
        "Please select a JSON file to translate."
      )
    );
  });
});
