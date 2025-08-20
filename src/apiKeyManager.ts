import * as vscode from "vscode";

export class ApiKeyManager {
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
}
