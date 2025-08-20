import * as vscode from "vscode";
import { L10nTranslationService } from "./translationService";

export class LanguageSelector {
  constructor(private readonly translationService: L10nTranslationService) {}

  async selectTargetLanguage(
    detectedLanguages: string[] = []
  ): Promise<string | undefined> {
    let targetLanguage: string | undefined;

    // Step 1: Show detected languages from project if available
    if (detectedLanguages.length > 0) {
      const result = await this.showDetectedLanguagesQuickPick(
        detectedLanguages
      );

      if (result === null) {
        return; // User cancelled
      }

      targetLanguage = result;
    }

    // Step 2: If no language selected, show search input
    if (!targetLanguage) {
      const result = await this.showLanguageSearchInput();

      if (result === null) {
        return; // User cancelled
      }

      targetLanguage = result;
    }

    // Step 3: If still no language, show manual input for BCP-47 format
    if (!targetLanguage) {
      targetLanguage = await this.showManualLanguageInput();
    }

    return targetLanguage;
  }

  private async showDetectedLanguagesQuickPick(
    detectedLanguages: string[]
  ): Promise<string | null | undefined> {
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
      return null; // User cancelled
    }

    if (selection.label.startsWith("$(search)")) {
      return undefined; // User wants to search
    }

    return selection.label;
  }

  private async showLanguageSearchInput(): Promise<string | null | undefined> {
    const searchInput = await vscode.window.showInputBox({
      prompt: "Type to select target language",
      placeHolder: 'e.g., "spanish", "es", "zh-CN"',
    });

    if (!searchInput) {
      return null; // User cancelled
    }

    try {
      // Predict languages using API
      const predictedLanguages = await this.translationService.predictLanguages(
        searchInput
      );

      if (predictedLanguages.length === 0) {
        vscode.window.showWarningMessage("No languages found for your search.");
        return undefined;
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
        return null; // User cancelled
      }

      return languageSelection.label;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to search languages: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return undefined;
    }
  }

  private async showManualLanguageInput(): Promise<string | undefined> {
    const searchInput = await vscode.window.showInputBox({
      prompt: "Enter target language code (BCP-47 format)",
      placeHolder: 'e.g., "es", "fr", "zh-CN", "en-US"',
    });

    return searchInput;
  }
}
