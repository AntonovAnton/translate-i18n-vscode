// VS Code API imports
import * as vscode from "vscode";

// Node.js standard library imports
import * as fs from "fs";
import * as path from "path";

// Local service imports
import {
  I18nProjectManager,
  URLS,
  validateLanguageCode,
  normalizeLanguageCode,
} from "ai-l10n-sdk";
import {
  FileSchema,
  FinishReason,
  L10nTranslationService,
  TranslationRequest,
  TranslationResult,
  ILogger,
} from "ai-l10n-sdk";
import { LanguageSelector } from "./languageSelector";

import { CONFIG, VSCODE_COMMANDS } from "./constants";

/**
 * Asks user how to handle existing target files
 * Returns user's choice or undefined if cancelled
 */
async function askFileSavingPreference(
  existingFileCount: number,
  fileName?: string,
): Promise<"update" | "create" | "replace" | undefined> {
  const isMultipleFiles = existingFileCount > 1;
  const placeHolder = isMultipleFiles
    ? `${existingFileCount} target file(s) already exist. What would you like to do?`
    : `Target file "${fileName}" already exists. What would you like to do?`;

  const choice = await vscode.window.showQuickPick(
    [
      {
        label: "$(sync) Translate Only New Strings",
        description: isMultipleFiles
          ? "Update existing files with only new translations"
          : "Update existing file with only new translations",
        value: "update" as const,
      },
      {
        label: isMultipleFiles
          ? "$(pencil) Replace Existing Files"
          : "$(pencil) Replace Existing File",
        description: isMultipleFiles
          ? "Replace all existing files with new translations"
          : "Replace existing file with new translations",
        value: "replace" as const,
      },
      {
        label: isMultipleFiles
          ? "$(file-add) Create New Files"
          : "$(file-add) Create New File",
        description: isMultipleFiles
          ? "Creates copies with unique names for all translations"
          : "Creates a copy with unique name",
        value: "create" as const,
      },
    ],
    {
      placeHolder,
      ignoreFocusOut: true,
    },
  );

  return choice?.value;
}

/**
 * Handles the main translate command workflow
 * Validates file, gets API Key, selects target language, and performs translation
 */
export async function handleTranslateCommand(
  uri: vscode.Uri,
  logger: ILogger,
  apiKey: string,
  translationService: L10nTranslationService,
  i18nProjectManager: I18nProjectManager,
  languageSelector: LanguageSelector,
) {
  try {
    // Get the file to translate
    let fileUri = uri || vscode.window.activeTextEditor?.document.uri;

    // If no valid file is available, prompt user to search and open one
    if (!fileUri) {
      logger.logInfo(`No file selected, opening Quick Open panel`);

      // Use VS Code's Quick Open panel (Ctrl+P equivalent)
      await vscode.commands.executeCommand(VSCODE_COMMANDS.QUICK_OPEN);

      logger.logInfo("Quick Open panel activated for user to search files");

      // Show a message to guide the user
      vscode.window.showInformationMessage(
        `Search for and open a localization file, then run the translate command again.`,
        { modal: false },
      );

      return;
    }

    // Reject directories (context menu appears on folders too since we use resourceScheme == file)
    try {
      if (fs.statSync(fileUri.fsPath).isDirectory()) {
        vscode.window.showErrorMessage(`Please select a file, not a folder.`);
        return;
      }
    } catch {
      // If stat fails the file path is not a directory — proceed with translation
    }

    // Detect available languages from project structure
    const detectedLanguages = i18nProjectManager.detectLanguagesFromProject(
      fileUri.fsPath,
    );

    const format = path.extname(fileUri.fsPath).slice(1);
    const isArbFile = format === "arb";

    // Let user choose target language(s)
    const targetLanguageSelection = await languageSelector.selectTargetLanguage(
      detectedLanguages,
      isArbFile,
    );

    if (!targetLanguageSelection) {
      return; // User cancelled language selection
    }

    // Convert to array for uniform handling
    const targetLanguages = Array.isArray(targetLanguageSelection)
      ? targetLanguageSelection
      : [targetLanguageSelection];

    // Validate all target languages
    for (const targetLanguage of targetLanguages) {
      if (!validateLanguageCode(targetLanguage)) {
        const message = `Invalid language code format: ${targetLanguage}. Please use BCP-47 format (e.g., en-US, en_US).`;
        vscode.window.showErrorMessage(message);
        logger.logInfo(`Validation error: ${message}`);
        return;
      }
    }

    // Ask user once about translate only new strings preference (if multiple files might exist)
    let translateOnlyNewStrings = false;
    let replaceExistingFiles = false;
    const targetFilePaths = targetLanguages.map((lang) =>
      i18nProjectManager.generateTargetFilePath(fileUri.fsPath, lang),
    );
    const existingFiles = targetFilePaths.filter((targetFilePath) =>
      fs.existsSync(targetFilePath),
    );

    if (existingFiles.length > 0) {
      const choice = await askFileSavingPreference(
        existingFiles.length,
        path.basename(existingFiles[0]),
      );

      if (!choice) {
        return; // User cancelled
      }

      translateOnlyNewStrings = choice === "update";
      replaceExistingFiles = choice === "replace";

      logger.logInfo(
        `User chose to ${
          choice === "update"
            ? "update existing files"
            : choice === "create"
              ? "create new files"
              : "replace existing files"
        } for ${targetLanguages.length} target language(s)`,
      );
    }

    // Perform translations in parallel
    const totalLanguages = targetLanguages.length;

    const translationPromises = targetLanguages.map(
      async (targetLanguage, i) => {
        const targetFilePath = targetFilePaths[i];

        try {
          logger.logInfo(
            `Translating (${i + 1}/${totalLanguages}) to ${targetLanguage}`,
          );

          const success = await performTranslation(
            logger,
            fileUri.fsPath,
            targetLanguage,
            targetFilePath,
            translationService,
            i18nProjectManager,
            apiKey,
            translateOnlyNewStrings,
            replaceExistingFiles,
            isArbFile ? FileSchema.ARBFlutter : null,
            format,
          );

          return { success, language: targetLanguage };
        } catch (error) {
          logger.showAndLogError(
            `Translation to ${targetLanguage} failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            error,
            `File: ${fileUri.fsPath}, Target: ${targetLanguage}`,
          );
          return { success: false, language: targetLanguage };
        }
      },
    );

    // Wait for all translations to complete
    const results = await Promise.all(translationPromises);

    const successCount = results.filter((r) => r.success).length;
    const failedLanguages = results
      .filter((r) => !r.success)
      .map((r) => r.language);

    if (totalLanguages > 1) {
      showSummaryForMultipleTranslations(
        totalLanguages,
        successCount,
        failedLanguages,
      );
    }
  } catch (error) {
    logger.showAndLogError(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
      "Translation command execution",
    );
  }
}

/**
 * Performs the actual translation with progress indication
 * Reads file, calls translation service, and saves result
 * Returns true on success, false if the error was already handled and shown to the user
 */
async function performTranslation(
  logger: ILogger,
  sourceFilePath: string,
  targetLanguage: string,
  targetFilePath: string,
  translationService: L10nTranslationService,
  i18nProjectManager: I18nProjectManager,
  apiKey: string,
  translateOnlyNewStrings: boolean,
  replaceExistingFiles: boolean,
  schema: FileSchema | null,
  format?: string,
): Promise<boolean> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Translating ${path.basename(
        sourceFilePath,
      )} to ${targetLanguage} `,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Sending translation request..." });

      // Read file
      const fileContent = fs.readFileSync(sourceFilePath, "utf8");
      const fileName = path.basename(sourceFilePath);

      const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
      const generateGlossary = config.get(CONFIG.KEYS.GENERATE_GLOSSARY, false);
      let targetStrings: string | undefined = undefined;
      if (
        (translateOnlyNewStrings || generateGlossary) &&
        fs.existsSync(targetFilePath)
      ) {
        targetStrings = fs.readFileSync(targetFilePath, "utf8");
      }

      // Normalize target language for API call
      const normalizedTargetLanguage = normalizeLanguageCode(targetLanguage);

      const request: TranslationRequest = {
        sourceStrings: fileContent,
        targetLanguageCode: normalizedTargetLanguage,
        useContractions: config.get(CONFIG.KEYS.USE_CONTRACTIONS, true),
        useShortening: config.get(CONFIG.KEYS.USE_SHORTENING, false),
        generateGlossary,
        generatePluralForms: config.get(
          CONFIG.KEYS.GENERATE_PLURAL_FORMS,
          false,
        ),
        translateMetadata: config.get(CONFIG.KEYS.TRANSLATE_METADATA, false),
        client: CONFIG.CLIENT,
        translateOnlyNewStrings,
        targetStrings,
        schema,
        format,
        scope: fileName, // Use file name as scope for better incremental translation
      };

      const result = await translationService.translate(request, apiKey);
      if (!result.success) {
        return false;
      }

      const translationData = result.data;

      if (fileContent.length > 0 && !translationData.translations) {
        const message =
          "No translation results received. Please verify that source file contains text content.";
        await showInformationMessage(logger, message);
        return false;
      }

      progress.report({ message: "Saving translated file..." });

      // Determine final output path
      let outputPath = targetFilePath;

      // If not replacing file generate a new path with copy number
      if (!translateOnlyNewStrings && !replaceExistingFiles) {
        outputPath = i18nProjectManager.getUniqueFilePath(targetFilePath);
      }

      // Save translated file
      fs.writeFileSync(outputPath, translationData.translations ?? "", "utf8");

      // Handle filtered strings if present
      if (
        translationData.filteredStrings &&
        translationData.filteredStrings.length > 0
      ) {
        await handleFilteredStrings(logger, translationData, outputPath);
      }

      // Show success message with usage info after progress completes
      await showTranslationSuccess(
        logger,
        translationData,
        outputPath,
        result.currentBalance,
      );

      return true;
    },
  );
}

async function handleFilteredStrings(
  logger: ILogger,
  result: TranslationResult,
  targetFilePath: string,
) {
  let reasonMessage: string;
  if (result.finishReason === FinishReason.contentFilter) {
    reasonMessage = "content policy violations";
  } else if (result.finishReason === FinishReason.length) {
    reasonMessage = "AI context limit was reached (content too long)";
  } else {
    return;
  }

  const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
  const saveFilteredStrings = config.get(
    CONFIG.KEYS.SAVE_FILTERED_STRINGS,
    true,
  );
  const filteredStringsContent = result.filteredStrings ?? "";
  let warningMessage = `Some string(s) were excluded due to ${reasonMessage}.`;

  if (saveFilteredStrings) {
    const ext = path.extname(targetFilePath);
    const base = path.basename(targetFilePath, ext);
    const dir = path.dirname(targetFilePath);
    const filteredPath = path.join(dir, `${base}.filtered${ext}`);

    fs.writeFileSync(filteredPath, filteredStringsContent, "utf8");

    warningMessage += ` Saved to: ${filteredPath}`;
    logger.logWarning(warningMessage);
  } else {
    logger.logInfo(
      `${warningMessage} Filtered strings:\n${filteredStringsContent}`,
    );
    warningMessage += ` Filtered strings are logged.`;
  }

  // Show notification without blocking parallel translations
  setTimeout(() => {
    const buttons =
      result.finishReason === FinishReason.contentFilter
        ? ["View Content Policy"]
        : [];
    vscode.window
      .showWarningMessage(warningMessage, ...buttons)
      .then((action) => {
        if (action === "View Content Policy") {
          vscode.env.openExternal(vscode.Uri.parse(URLS.CONTENT_POLICY));
        }
      });
  }, 100);
}

async function showInformationMessage(logger: ILogger, message: string) {
  logger.logInfo(message);
  setTimeout(() => {
    vscode.window.showInformationMessage(message);
  }, 100); // Small delay to ensure progress dialog closes first
}

/**
 * Shows translation success message with usage stats and option to open result file
 */
async function showTranslationSuccess(
  logger: ILogger,
  result: TranslationResult,
  targetFilePath: string,
  currentBalance?: number,
) {
  const charsUsed = result.usage.charsUsed || 0;
  const remainingBalance = currentBalance || 0;
  let message = `✅ Translation completed! Used ${charsUsed.toLocaleString()} characters`;

  const contentChars = result.usage.details.sourceStringsCharCount || 0;
  const glossaryChars = result.usage.details.glossaryCharCount || 0;
  const instructionsChars = result.usage.details.instructionCharCount || 0;
  if (charsUsed > contentChars) {
    message += ` (content: ${contentChars.toLocaleString()}, glossary: ${glossaryChars.toLocaleString()}, instruction: ${instructionsChars.toLocaleString()}).`;
  } else {
    message += `.`;
  }
  if (charsUsed > 0) {
    message += ` Remaining: ${remainingBalance.toLocaleString()} characters. File saved as ${path.basename(
      targetFilePath,
    )}`;
  }
  logger.logInfo(message);

  // Small delay to ensure progress dialog closes first
  setTimeout(async () => {
    const action = await vscode.window.showInformationMessage(
      message,
      "Open File",
    );

    if (action === "Open File") {
      const doc = await vscode.workspace.openTextDocument(targetFilePath);
      await vscode.window.showTextDocument(doc);
    }
  }, 100);
}

async function showSummaryForMultipleTranslations(
  totalLanguages: number,
  successCount: number,
  failedLanguages: string[],
) {
  // Small delay to ensure progress dialog closes first
  setTimeout(async () => {
    if (successCount === totalLanguages) {
      vscode.window.showInformationMessage(
        `✅ Successfully translated to all ${totalLanguages} languages!`,
      );
    } else if (successCount > 0) {
      vscode.window.showWarningMessage(
        `Translated to ${successCount}/${totalLanguages} languages. Failed: ${failedLanguages.join(
          ", ",
        )}`,
      );
    } else {
      vscode.window.showErrorMessage(
        `❌ All translations failed. Please check the logs.`,
      );
    }
  }, 500);
}
