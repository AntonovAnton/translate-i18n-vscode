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
  TranslationResult,
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
  languageSelector: LanguageSelector,
  isArbFile: boolean = false
) {
  try {
    // Ensure we have an API Key (will prompt user if needed)
    const apiKey = await apiKeyManager.ensureApiKey();
    if (!apiKey) {
      return; // User cancelled API Key setup
    }

    // Get the file to translate
    let fileUri = uri || vscode.window.activeTextEditor?.document.uri;

    const expectedExtension = isArbFile ? ".arb" : ".json";
    const fileType = isArbFile ? "ARB" : "JSON";

    // If no valid file is available, prompt user to search and open one
    if (!fileUri || !fileUri.fsPath.endsWith(expectedExtension)) {
      logInfo(`No selected ${fileType} file, opening Quick Open panel`);

      // Use VS Code's Quick Open panel (Ctrl+P equivalent)
      await vscode.commands.executeCommand(VSCODE_COMMANDS.QUICK_OPEN);

      logInfo("Quick Open panel activated for user to search files");

      // Show a message to guide the user
      vscode.window.showInformationMessage(
        `Search for and open a ${fileType} file, then run the translate command again.`,
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
      detectedLanguages,
      isArbFile
    );

    if (!targetLanguage) {
      return; // User cancelled language selection
    }

    if (!i18nProjectManager.validateLanguageCode(targetLanguage)) {
      const message = `Invalid language code format. Please use BCP-47 format (e.g., en-US, en_US).`;
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
  // Generate output file path to check if it exists
  const outputPath = i18nProjectManager.generateTargetFilePath(
    fileUri.fsPath,
    targetLanguage
  );

  // Check if target file exists and ask user if they want to translate only new strings
  let translateOnlyNewStrings = false;
  let targetStrings: string | undefined = undefined;

  if (fs.existsSync(outputPath)) {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: "$(sync) Translate Only New Strings",
          description: "Update existing file with only new translations",
          value: "update",
        },
        {
          label: "$(file-add) Create New File",
          description: "Creates a copy with unique name",
          value: "create",
        },
      ],
      {
        placeHolder: `Target file "${path.basename(
          outputPath
        )}" already exists. What would you like to do?`,
        ignoreFocusOut: true,
      }
    );

    if (!choice) {
      return; // User cancelled
    }

    if (choice.value === "update") {
      translateOnlyNewStrings = true;
      // Read existing target file
      targetStrings = fs.readFileSync(outputPath, "utf8");
      logInfo(
        `User chose to translate only new strings for: ${path.basename(
          outputPath
        )}`
      );
    } else {
      logInfo(
        `User chose to create new file instead of updating: ${path.basename(
          outputPath
        )}`
      );
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Translating ${path.basename(
        fileUri.fsPath
      )} to ${targetLanguage} `,
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Sending translation request..." });

        // Read file
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
          generatePluralForms: config.get(
            CONFIG.KEYS.GENERATE_PLURAL_FORMS,
            false
          ),
          client: "vscode-extension",
          returnTranslationsAsString: true,
          translateOnlyNewStrings,
          targetStrings,
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

        // Determine final output path
        let finalOutputPath = outputPath;

        // If not replacing file generate a new path with copy number
        if (!translateOnlyNewStrings) {
          finalOutputPath = i18nProjectManager.getUniqueFilePath(outputPath);
        }

        // Save translated file
        fs.writeFileSync(finalOutputPath, result.translations, "utf8");

        // Show success message with usage info after progress completes
        await showTranslationSuccess(result, finalOutputPath);

        // Log successful translation
        logInfo(
          `Translation completed successfully. File: ${path.basename(
            finalOutputPath
          )}, Characters used: ${
            result.usage.charsUsed || 0
          }, Translate only new strings: ${translateOnlyNewStrings}`
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
async function showTranslationSuccess(
  result: TranslationResult,
  outputPath: string
) {
  // Small delay to ensure progress dialog closes first
  setTimeout(async () => {
    const charsUsed = result.usage.charsUsed || 0;
    const remainingBalance = result.remainingBalance || 0;
    const message = `✅ Translation completed! Used ${charsUsed.toLocaleString()} characters. Remaining: ${remainingBalance.toLocaleString()} characters. File saved as ${path.basename(
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
