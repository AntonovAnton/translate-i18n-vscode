import * as vscode from "vscode";

export class ApiKeyManager {
  private readonly context: vscode.ExtensionContext;
  private readonly CONFIG_SECTION = "l10n-translate-i18n";
  private readonly CONFIG_KEY = "apiKey";
  private readonly SECRET_KEY = `${this.CONFIG_SECTION}.${this.CONFIG_KEY}`;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getApiKey(): Promise<string | undefined> {
    // Try to get API key from secure storage first
    let apiKey = await this.context.secrets.get(this.SECRET_KEY);

    if (!apiKey) {
      // Fallback to configuration (for backward compatibility)
      apiKey = vscode.workspace
        .getConfiguration(this.CONFIG_SECTION)
        .get(this.CONFIG_KEY);
      if (apiKey) {
        // Migrate to secure storage
        await this.context.secrets.store(this.SECRET_KEY, apiKey);
        // Clear from configuration
        await vscode.workspace
          .getConfiguration(this.CONFIG_SECTION)
          .update(
            this.CONFIG_KEY,
            undefined,
            vscode.ConfigurationTarget.Global
          );
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
      await this.context.secrets.store(this.SECRET_KEY, apiKey);
      vscode.window.showInformationMessage("API Key saved securely! 🔐");
    }
  }
}
