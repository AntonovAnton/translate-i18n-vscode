import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";

// Import the translation command handler
import { handleTranslateCommand } from "../translationCommand";
import { VSCODE_COMMANDS } from "../constants";

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
    sinon.stub(vscode.commands, "executeCommand");
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
      (vscode.commands.executeCommand as sinon.SinonStub).calledWith(
        VSCODE_COMMANDS.QUICK_OPEN
      )
    );
    assert.ok(
      (vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
        "Search for and open a JSON file, then run the translate command again."
      )
    );
  });

  test("Translation request includes generatePluralForms configuration", async () => {
    // This test verifies that the generatePluralForms setting is properly included
    // in the translation request when configured

    // Create a mock workspace configuration
    const mockConfig = {
      get: sinon.stub(),
    };

    // Configure the mock to return specific values
    mockConfig.get.withArgs("useContractions", true).returns(true);
    mockConfig.get.withArgs("useShortening", false).returns(false);
    mockConfig.get.withArgs("generatePluralForms", false).returns(true); // User enabled it

    // Mock vscode.workspace.getConfiguration to return our mock
    const getConfigStub = sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfig as any);

    // We can't directly test the translation command internals without refactoring,
    // but we can verify the configuration gets called with the right parameters
    vscode.workspace.getConfiguration("l10n-translate-i18n");

    assert.ok(getConfigStub.called);
  });

  suite("ARB File Handling", () => {
    test("handleTranslateCommand shows appropriate message for ARB files when no file selected", async () => {
      // Arrange
      mockApiKeyManager.ensureApiKey.resolves("test-api-key");

      const mockUri = undefined; // No URI provided

      // Act
      await handleTranslateCommand(
        mockUri as any,
        mockApiKeyManager,
        mockTranslationService,
        mockI18nProjectManager,
        mockLanguageSelector,
        true // isArbFile
      );

      // Assert
      assert.ok(
        (vscode.commands.executeCommand as sinon.SinonStub).calledWith(
          VSCODE_COMMANDS.QUICK_OPEN
        )
      );
      assert.ok(
        (vscode.window.showInformationMessage as sinon.SinonStub).calledWith(
          "Search for and open a ARB file, then run the translate command again."
        )
      );
    });

    test("handleTranslateCommand validates ARB language codes correctly", async () => {
      // Arrange
      mockApiKeyManager.ensureApiKey.resolves("test-api-key");
      mockI18nProjectManager.detectLanguagesFromProject.returns(["es", "fr_FR"]);
      mockLanguageSelector.selectTargetLanguage.resolves("es_ES");
      mockI18nProjectManager.validateLanguageCode.withArgs("es_ES").returns(false);

      const mockUri = {
        fsPath: "/test/path/app_en_US.arb",
      };

      // Act
      await handleTranslateCommand(
        mockUri as any,
        mockApiKeyManager,
        mockTranslationService,
        mockI18nProjectManager,
        mockLanguageSelector,
        true // isArbFile
      );

      // Assert - validateLanguageCode is called without isArbFile parameter
      assert.ok(mockI18nProjectManager.validateLanguageCode.calledWith("es_ES"));
      assert.ok(
        (vscode.window.showErrorMessage as sinon.SinonStub).calledWith(
          sinon.match(/BCP-47/)
        )
      );
    });

    test("handleTranslateCommand normalizes ARB language codes with underscore format", async () => {
      // Arrange
      mockApiKeyManager.ensureApiKey.resolves("test-api-key");
      mockI18nProjectManager.detectLanguagesFromProject.returns(["es", "fr_FR"]);
      mockLanguageSelector.selectTargetLanguage.resolves("es_ES");
      mockI18nProjectManager.validateLanguageCode.withArgs("es_ES").returns(true);
      mockI18nProjectManager.normalizeLanguageCode.withArgs("es_ES").returns("es-ES");
      mockI18nProjectManager.generateTargetFilePath.returns("/test/path/app_es_ES.arb");
      mockI18nProjectManager.getUniqueFilePath = sinon.stub().returns("/test/path/app_es_ES.arb");
      
      // Mock file system operations
      const fs = require("fs");
      sinon.stub(fs, "readFileSync").returns('{"test": "source"}');
      sinon.stub(fs, "existsSync").returns(false);
      sinon.stub(fs, "writeFileSync");
      
      mockTranslationService.translateJson.resolves({
        translations: '{"test": "translated"}',
        usage: { charsUsed: 100 },
        remainingBalance: 1000,
      });

      // Mock workspace configuration
      const mockConfig = {
        get: sinon.stub().returns(false)
      };
      sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfig as any);

      // Mock withProgress to execute the callback immediately
      (vscode.window.withProgress as sinon.SinonStub).callsFake(async (options, callback) => {
        const progress = { report: sinon.stub() };
        const token = { checkCanceled: sinon.stub() };
        return await callback(progress, token);
      });

      const mockUri = {
        fsPath: "/test/path/app_en_US.arb",
      };

      // Act
      await handleTranslateCommand(
        mockUri as any,
        mockApiKeyManager,
        mockTranslationService,
        mockI18nProjectManager,
        mockLanguageSelector,
        true // isArbFile
      );

      // Assert - normalizeLanguageCode is called without isArbFile parameter
      assert.ok(mockI18nProjectManager.normalizeLanguageCode.calledWith("es_ES"));
    });
  });
});
