import { ApiKeyManager } from "./apiKeyManager";
import { URLS } from "./constants";
import { logInfo, logWarning, showAndLogError } from "./logger";

// API Types based on the OpenAPI specification
export interface TranslationRequest {
  sourceStrings: string | Record<string, any>;
  targetLanguageCode: string;
  useContractions?: boolean;
  useShortening?: boolean;
  generatePluralForms?: boolean;
  client: string;
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
  private readonly baseUrl = URLS.API_BASE;
  private readonly apiKeyManager: ApiKeyManager;

  constructor(apiKeyManager: ApiKeyManager) {
    this.apiKeyManager = apiKeyManager;
  }

  async predictLanguages(
    input: string,
    limit: number = 10
  ): Promise<Language[]> {
    const url = new URL(`${this.baseUrl}/languages/predict`);
    url.searchParams.append("input", input);
    url.searchParams.append("limit", limit.toString());

    logInfo(`Predicting languages for input (${input.length} characters)`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = new Error(
        `Failed to predict languages: ${response.statusText}`
      );
      logWarning(
        `Language prediction failed - ${response.status} ${response.statusText}`
      );
      throw error;
    }

    const result: LanguagePredictionResponse =
      (await response.json()) as LanguagePredictionResponse;

    logInfo(`Successfully predicted ${result.languages.length} languages`);
    return result.languages;
  }

  async translateJson(
    request: TranslationRequest
  ): Promise<TranslationResult | null> {
    const apiKey = await this.apiKeyManager.getApiKey();
    if (!apiKey) {
      throw new Error("API Key not set. Please configure your API Key first.");
    }

    logInfo(`Starting translation to ${request.targetLanguageCode}`);

    const response = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(request),
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

      logWarning(
        `Translation API error - ${response.status} ${response.statusText}`
      );
      if (errorData) {
        logWarning(`API error details - ${JSON.stringify(errorData)}`);
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
          errorMessage = "Unauthorized. Please check your API Key.";
          break;
        case 402: {
          // Try to extract required characters from the error response
          let message =
            "Not enough characters remaining for this translation. You can try translating a smaller portion of your file or purchase more characters.";

          const requiredBalance = errorData?.data?.requiredBalance as number;
          if (requiredBalance) {
            const currentBalance =
              (errorData?.data?.currentBalance as number) ?? 0;
            message = `This translation requires ${requiredBalance.toLocaleString()} characters, but you only have ${currentBalance.toLocaleString()} characters available. You can try translating a smaller portion of your file or purchase more characters.`;
          }

          showAndLogError(
            message,
            errorData,
            "",
            "Visit l10n.dev",
            URLS.PRICING
          );
          return null;
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

    const result = (await response.json()) as TranslationResult;

    // Handle finish reasons by throwing errors
    if (result.finishReason) {
      if (result.finishReason !== FinishReason.stop) {
        logWarning(`Translation finished with reason: ${result.finishReason}`);
      }

      switch (result.finishReason) {
        case FinishReason.insufficientBalance:
          const message = `Not enough characters remaining for this translation. You can try translating a smaller portion of your file or purchase more characters.`;
          showAndLogError(
            message,
            undefined,
            "",
            "Visit l10n.dev",
            URLS.PRICING
          );
          return null;
        case FinishReason.contentFilter:
          throw new Error("Translation blocked by content filter.");
        case FinishReason.error:
          throw new Error("Translation failed due to an error.");
        // Note: FinishReason.length is not treated as an error - translation is still usable
      }
    }

    return result;
  }
}
