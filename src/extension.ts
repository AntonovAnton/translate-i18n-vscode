import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { LanguageDetector } from "./languageDetector";

// API Types based on the OpenAPI specification
interface TranslationRequest {
  sourceStrings: string | Record<string, any>;
  targetLanguageCode: string;
  useContractions?: boolean;
  useShortening?: boolean;
}

interface TranslationResult {
  targetLanguageCode: string;
  translations?: Record<string, any>;
  usage: TranslationUsage;
  finishReason?: FinishReason;
  completedChunks: number;
  totalChunks: number;
}

interface TranslationUsage {
  charsUsed?: number;
}

enum FinishReason {
  stop = "stop",
  length = "length",
  contentFilter = "contentFilter",
  insufficientBalance = "insufficientBalance",
  error = "error",
}

interface Language {
  code: string;
  name: string;
}

interface LanguagePredictionResponse {
  languages: Language[];
}

class L10nTranslationService {
  private readonly baseUrl = "https://l10n.dev/api";
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private async getApiKey(): Promise<string | undefined> {
    // Try to get API key from secure storage first
    let apiKey = await this.context.secrets.get("l10n-translate-i18n.apiKey");

    if (!apiKey) {
      // Fallback to configuration (for backward compatibility)
      apiKey = vscode.workspace
        .getConfiguration("l10n-translate-i18n")
        .get("apiKey");
      if (apiKey) {
        // Migrate to secure storage
        await this.context.secrets.store("l10n-translate-i18n.apiKey", apiKey);
        // Clear from configuration
        await vscode.workspace
          .getConfiguration("l10n-translate-i18n")
          .update("apiKey", undefined, vscode.ConfigurationTarget.Global);
      }
    }

    return apiKey;
  }

  async setApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your l10n.dev API Key",
      placeHolder: "Get your API Key from https://l10n.dev/ws/keys",
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await this.context.secrets.store("l10n-translate-i18n.apiKey", apiKey);
      vscode.window.showInformationMessage("API Key saved securely! 🔐");
    }
  }

  async predictLanguages(
    input: string,
    limit: number = 10
  ): Promise<Language[]> {
    const url = new URL(`${this.baseUrl}/languages/predict`);
    url.searchParams.append("input", input);
    url.searchParams.append("limit", limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to predict languages: ${response.statusText}`);
    }

    const result: LanguagePredictionResponse =
      (await response.json()) as LanguagePredictionResponse;
    return result.languages;
  }

  async translateJson(
    sourceStrings: string | Record<string, any>,
    targetLanguageCode: string
  ): Promise<TranslationResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("API Key not set. Please configure your API key first.");
    }

    const config = vscode.workspace.getConfiguration("l10n-translate-i18n");
    const translationRequest: TranslationRequest = {
      sourceStrings,
      targetLanguageCode,
      useContractions: config.get("useContractions", true),
      useShortening: config.get("useShortening", false),
    };

    const response = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(translationRequest),
    });
    if (!response.ok) {
      let errorMessage: string;
      let errorData: any = null;

      // Try to parse error response body
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      switch (response.status) {
        case 400: {
          // Try to extract validation errors from the error response
          let validationMessage =
            "Invalid request. Please check your input and try again.";
          if (errorData && errorData.errors) {
            const errorDetails = errorData.errors;
            if (Array.isArray(errorDetails)) {
              validationMessage = errorDetails.join(" ");
            } else if (typeof errorDetails === "object") {
              validationMessage = Object.values(errorDetails)
                .map((v) => (Array.isArray(v) ? v.join(" ") : v))
                .join(" ");
            }
          }
          errorMessage = validationMessage;
          break;
        }
        case 401:
          errorMessage = "Invalid API Key. Please check your API key.";
          break;
        case 402: {
          // Try to extract required characters from the error response
          let message =
            "Insufficient balance. Please top up your account to continue translating.";
          if (
            errorData?.data?.requiredCharactersForTranslation &&
            typeof errorData.data.requiredCharactersForTranslation === "number"
          ) {
            const requiredChars =
              errorData.data.requiredCharactersForTranslation.toLocaleString();
            message = `Insufficient balance. You need ${requiredChars} characters to proceed with the translation. Please visit https://l10n.dev/#pricing to purchase more characters.`;
          }
          errorMessage = message;
          break;
        }
        case 413:
          errorMessage = "Request too large. Maximum request size is 10 MB.";
          break;
        case 500:
          errorMessage = `An internal server error occurred (Error code: ${
            errorData?.errorCode || "unknown"
          }). Please try again later.`;
          break;
        default:
          errorMessage =
            "Failed to translate. Please check your connection and try again.";
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as TranslationResult;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("l10n.dev Translation extension is now active!");

  const translationService = new L10nTranslationService(context);
  const languageDetector = new LanguageDetector();

  // Show welcome message for new users
  const hasShownWelcome = context.globalState.get("hasShownWelcome", false);
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "🎉 Welcome to l10n.dev! New users get 30,000 characters free for 3 days. Get your API key from https://l10n.dev/ws/keys",
        "Set API Key",
        "Learn More"
      )
      .then((selection) => {
        if (selection === "Set API Key") {
          vscode.commands.executeCommand("l10n.translate-i18n.setApiKey");
        } else if (selection === "Learn More") {
          vscode.env.openExternal(vscode.Uri.parse("https://l10n.dev"));
        }
      });
    context.globalState.update("hasShownWelcome", true);
  }

  // Register set API key command
  const setApiKeyDisposable = vscode.commands.registerCommand(
    "l10n.translate-i18n.setApiKey",
    async () => {
      await translationService.setApiKey();
    }
  );

  // Register configure options command
  const configureOptionsDisposable = vscode.commands.registerCommand(
    "l10n.translate-i18n.configureOptions",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "l10n"
      );
    }
  );

  // Register translate command
  const translateDisposable = vscode.commands.registerCommand(
    "l10n.translate-i18n.translate",
    async (uri: vscode.Uri) => {
      try {
        // Ensure we have an API key
        const apiKey = await translationService["getApiKey"]();
        if (!apiKey) {
          const action = await vscode.window.showWarningMessage(
            "API Key not configured. Please set your l10n.dev API key first.",
            "Set API Key",
            "Get API Key"
          );

          if (action === "Set API Key") {
            await translationService.setApiKey();
            return;
          } else if (action === "Get API Key") {
            vscode.env.openExternal(
              vscode.Uri.parse("https://l10n.dev/ws/keys")
            );
            return;
          }
          return;
        }

        // Get the file to translate
        const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!fileUri || !fileUri.fsPath.endsWith(".json")) {
          vscode.window.showErrorMessage(
            "Please select a JSON file to translate."
          );
          return;
        }

        // Detect available languages from project structure
        const detectedLanguages = languageDetector.detectLanguagesFromProject(
          fileUri.fsPath
        );

        // Let user choose target language
        let targetLanguage: string | undefined;

        if (detectedLanguages.length > 0) {
          const options = [
            ...detectedLanguages.map((lang) => ({
              label: lang,
              description: "Detected in project",
            })),
            {
              label: "$(search) Search for language...",
              description: "Type to select target language",
            },
          ];

          const selection = await vscode.window.showQuickPick(options, {
            placeHolder: "Select target language",
            matchOnDescription: true,
          });

          if (!selection) {
            return;
          }

          if (!selection.label.startsWith("$(search)")) {
            targetLanguage = selection.label;
          }
        }

        if (!targetLanguage) {
          // User wants to search for language
          const searchInput = await vscode.window.showInputBox({
            prompt: "Type to select target language",
            placeHolder: 'e.g., "spanish", "es", "zh-CN"',
          });

          if (!searchInput) {
            return;
          }

          // Predict languages using API
          try {
            const predictedLanguages =
              await translationService.predictLanguages(searchInput);

            if (predictedLanguages.length === 0) {
              vscode.window.showWarningMessage(
                "No languages found for your search."
              );
              return;
            }

            const languageOptions = predictedLanguages.map((lang) => ({
              label: lang.code,
              description: lang.name,
            }));

            const languageSelection = await vscode.window.showQuickPick(
              languageOptions,
              {
                placeHolder: "Select target language",
              }
            );

            if (!languageSelection) {
              return;
            }
            targetLanguage = languageSelection.label;
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to search languages: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            return;
          }
        }

        if (!targetLanguage) {
          // No detected languages, ask user to input
          const searchInput = await vscode.window.showInputBox({
            prompt: "Enter target language code (BCP-47 format)",
            placeHolder: 'e.g., "es", "fr", "zh-CN", "en-US"',
          });

          if (languageDetector.validateLanguageCode(searchInput || "")) {
            targetLanguage = searchInput!;
          } else {
            vscode.window.showErrorMessage(
              "Invalid language code format. Please use BCP-47 format."
            );
            return;
          }
        }

        // Read JSON file
        const fileContent = fs.readFileSync(fileUri.fsPath, "utf8");

        // Normalize target language for API call
        const normalizedTargetLanguage =
          languageDetector.normalizeLanguageCode(targetLanguage);

        // Show progress
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Translating to ${targetLanguage}...`,
            cancellable: false,
          },
          async (progress) => {
            try {
              progress.report({ message: "Sending translation request..." });

              const result = await translationService.translateJson(
                fileContent,
                normalizedTargetLanguage // Use normalized version for API
              );

              // Handle finish reasons
              if (result.finishReason) {
                switch (result.finishReason) {
                  case FinishReason.insufficientBalance:
                    vscode.window.showWarningMessage(
                      "Insufficient balance. Please visit https://l10n.dev/#pricing to purchase more characters."
                    );
                    return;
                  case FinishReason.contentFilter:
                    vscode.window.showWarningMessage(
                      "Translation blocked by content filter."
                    );
                    return;
                  case FinishReason.error:
                    vscode.window.showErrorMessage(
                      "Translation failed due to an error."
                    );
                    return;
                  case FinishReason.length:
                    vscode.window.showWarningMessage(
                      "Translation truncated due to length limits."
                    );
                    break;
                }
              }

              if (!result.translations) {
                vscode.window.showErrorMessage(
                  "No translation results received."
                );
                return;
              }

              progress.report({ message: "Saving translated file..." });

              // Generate output file path using the new structure detection logic
              const outputPath = languageDetector.generateTargetFilePath(
                fileUri.fsPath,
                targetLanguage
              );

              // Save translated file
              const translatedContent = JSON.stringify(
                result.translations,
                null,
                2
              );
              fs.writeFileSync(outputPath, translatedContent, "utf8");

              // Progress is complete - the withProgress callback will end here
              // and the progress notification will disappear automatically

              // Show success message with usage info after progress completes
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
                  const doc = await vscode.workspace.openTextDocument(
                    outputPath
                  );
                  await vscode.window.showTextDocument(doc);
                }
              }, 100); // Small delay to ensure progress dialog closes first
            } catch (error) {
              vscode.window.showErrorMessage(
                `Translation failed: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  );

  context.subscriptions.push(
    setApiKeyDisposable,
    configureOptionsDisposable,
    translateDisposable
  );
}

export function deactivate() {}
