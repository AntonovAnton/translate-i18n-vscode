import * as vscode from "vscode";

// API Types based on the OpenAPI specification
export interface TranslationRequest {
  sourceStrings: string | Record<string, any>;
  targetLanguageCode: string;
  useContractions?: boolean;
  useShortening?: boolean;
}

export interface TranslationResult {
  targetLanguageCode: string;
  translations?: Record<string, any>;
  usage: TranslationUsage;
  finishReason?: FinishReason;
  completedChunks: number;
  totalChunks: number;
}

export interface TranslationUsage {
  charsUsed?: number;
}

export enum FinishReason {
  stop = "stop",
  length = "length",
  contentFilter = "contentFilter",
  insufficientBalance = "insufficientBalance",
  error = "error",
}

export interface Language {
  code: string;
  name: string;
}

export interface LanguagePredictionResponse {
  languages: Language[];
}

export class L10nTranslationService {
  private readonly baseUrl = "https://l10n.dev/api";
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getApiKey(): Promise<string | undefined> {
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
