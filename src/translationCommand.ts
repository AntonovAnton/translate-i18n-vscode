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

import { CONFIG } from "./constants";

// Create output channel for detailed logging
const outputChannel = vscode.window.createOutputChannel("L10n Translation");

/**
 * Handles errors with both user notification and detailed logging
 */
function handleError(userMessage: string, error: unknown, context?: string) {
  // Show user-friendly message
  vscode.window.showErrorMessage(userMessage);
  
  // Log detailed error information
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : '';
  
  outputChannel.appendLine(`[${timestamp}] ERROR: ${userMessage}`);
  if (context) {
    outputChannel.appendLine(`Context: ${context}`);
  }
  outputChannel.appendLine(`Details: ${errorMessage}`);
  if (stackTrace) {
    outputChannel.appendLine(`Stack trace: ${stackTrace}`);
  }
  outputChannel.appendLine('---');
  
  // Also log to console for development
  console.error(`[L10n Translation] ${userMessage}:`, error);
}

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
    const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!fileUri || !fileUri.fsPath.endsWith(".json")) {
      const message = "Please select a JSON file to translate.";
      vscode.window.showErrorMessage(message);
      outputChannel.appendLine(`[${new Date().toISOString()}] User error: ${message}`);
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
      outputChannel.appendLine(`[${new Date().toISOString()}] Validation error: ${message} (Language: ${targetLanguage})`);
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
    handleError(
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

        if (!result.translations) {
          const message = "No translation results received.";
          vscode.window.showErrorMessage(message);
          outputChannel.appendLine(`[${new Date().toISOString()}] API error: ${message}`);
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
        outputChannel.appendLine(`[${new Date().toISOString()}] Translation completed successfully. File: ${path.basename(outputPath)}, Characters used: ${result.usage.charsUsed || 0}`);
      } catch (error) {
        handleError(
          `Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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

/**
 * Gets the output channel for logging
 * Useful for other parts of the extension that need to log information
 */
export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}
