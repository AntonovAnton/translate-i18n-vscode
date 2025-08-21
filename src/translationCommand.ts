// VS Code API imports
import * as vscode from "vscode";

// Node.js standard library imports
import * as fs from "fs";
import * as path from "path";

// Local service imports
import { ApiKeyManager } from "./apiKeyManager";
import { I18nProjectManager } from "./i18nProjectManager";
import {
  L10nTranslationService,
  TranslationRequest,
} from "./translationService";
import { LanguageSelector } from "./languageSelector";
import { showAndLogError, logInfo } from "./logger";

import { CONFIG, VSCODE_COMMANDS } from "./constants";

/**
 * Handles the main translate command workflow
 * Validates file, gets API Key, selects target language, and performs translation
 */
export async function handleTranslateCommand(
  uri: vscode.Uri,
  apiKeyManager: ApiKeyManager,
  translationService: L10nTranslationService,
  i18nProjectManager: I18nProjectManager,
  languageSelector: LanguageSelector
) {
  try {
    // Ensure we have an API Key (will prompt user if needed)
    const apiKey = await apiKeyManager.ensureApiKey();
    if (!apiKey) {
      return; // User cancelled API Key setup
    }

    // Get the file to translate
    let fileUri = uri || vscode.window.activeTextEditor?.document.uri;

    // If no valid JSON file is available, prompt user to search and open one
    if (!fileUri || !fileUri.fsPath.endsWith(".json")) {
      logInfo("No selected JSON file, opening Quick Open panel");

      // Use VS Code's Quick Open panel (Ctrl+P equivalent)
      await vscode.commands.executeCommand(VSCODE_COMMANDS.QUICK_OPEN);

      logInfo("Quick Open panel activated for user to search files");

      // Show a message to guide the user
      vscode.window.showInformationMessage(
        "Search for and open a JSON file, then run the translate command again.",
        { modal: false }
      );

      return;
    }

    // Detect available languages from project structure
    const detectedLanguages = i18nProjectManager.detectLanguagesFromProject(
      fileUri.fsPath
    );

    // Let user choose target language
    const targetLanguage = await languageSelector.selectTargetLanguage(
      detectedLanguages
    );

    if (!targetLanguage) {
      return; // User cancelled language selection
    }

    if (!i18nProjectManager.validateLanguageCode(targetLanguage)) {
      const message = "Invalid language code format. Please use BCP-47 format.";
      vscode.window.showErrorMessage(message);
      logInfo(`Validation error: ${message} (Language: ${targetLanguage})`);
      return;
    }

    // Show progress and perform translation
    await performTranslation(
      fileUri,
      targetLanguage,
      translationService,
      i18nProjectManager
    );
  } catch (error) {
    showAndLogError(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
      "Translation command execution"
    );
  }
}

/**
 * Performs the actual translation with progress indication
 * Reads file, calls translation service, and saves result
 */
async function performTranslation(
  fileUri: vscode.Uri,
  targetLanguage: string,
  translationService: L10nTranslationService,
  i18nProjectManager: I18nProjectManager
) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Translating to ${targetLanguage}...`,
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Sending translation request..." });

        // Read JSON file
        const fileContent = fs.readFileSync(fileUri.fsPath, "utf8");

        // Normalize target language for API call
        const normalizedTargetLanguage =
          i18nProjectManager.normalizeLanguageCode(targetLanguage);

        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const request: TranslationRequest = {
          sourceStrings: fileContent,
          targetLanguageCode: normalizedTargetLanguage,
          useContractions: config.get(CONFIG.KEYS.USE_CONTRACTIONS, true),
          useShortening: config.get(CONFIG.KEYS.USE_SHORTENING, false),
        };

        const result = await translationService.translateJson(request);
        if (!result) {
          logInfo(`Translation failed for file: ${fileUri.fsPath}`);
          return;
        }

        if (!result.translations) {
          const message =
            "No translation results received. Please verify that source file contains content.";
          vscode.window.showInformationMessage(message);
          logInfo(message);
          return;
        }

        progress.report({ message: "Saving translated file..." });

        // Generate output file path using the new structure detection logic
        const outputPath = i18nProjectManager.generateTargetFilePath(
          fileUri.fsPath,
          targetLanguage
        );

        // Save translated file
        const translatedContent = JSON.stringify(result.translations, null, 2);
        fs.writeFileSync(outputPath, translatedContent, "utf8");

        // Show success message with usage info after progress completes
        await showTranslationSuccess(result, outputPath);

        // Log successful translation
        logInfo(
          `Translation completed successfully. File: ${path.basename(
            outputPath
          )}, Characters used: ${result.usage.charsUsed || 0}`
        );
      } catch (error) {
        showAndLogError(
          `Translation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          error,
          `File: ${fileUri.fsPath}, Target: ${targetLanguage}`
        );
      }
    }
  );
}

/**
 * Shows translation success message with usage stats and option to open result file
 */
async function showTranslationSuccess(result: any, outputPath: string) {
  // Small delay to ensure progress dialog closes first
  setTimeout(async () => {
    const charsUsed = result.usage.charsUsed || 0;
    const message = `✅ Translation completed! Used ${charsUsed} characters. File saved as ${path.basename(
      outputPath
    )}`;

    const action = await vscode.window.showInformationMessage(
      message,
      "Open File"
    );

    if (action === "Open File") {
      const doc = await vscode.workspace.openTextDocument(outputPath);
      await vscode.window.showTextDocument(doc);
    }
  }, 100);
}
