import * as vscode from "vscode";
import { CONFIG, URLS } from "./constants";

export class ApiKeyManager {
  private readonly context: vscode.ExtensionContext;
  private readonly SECRET_KEY = `${CONFIG.SECTION}.${CONFIG.KEYS.API_KEY}`;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getApiKey(): Promise<string | undefined> {
    // Check both secure storage and configuration
    const secureApiKey = await this.context.secrets.get(this.SECRET_KEY);
    const configApiKey = vscode.workspace
      .getConfiguration(CONFIG.SECTION)
      .get<string>(CONFIG.KEYS.API_KEY);

    // If user has set a new API Key in configuration, it takes precedence
    // This allows users to update expired keys through settings UI
    if (configApiKey && configApiKey.trim()) {
      // If it's different from secure storage, update secure storage
      if (configApiKey !== secureApiKey) {
        await this.context.secrets.store(this.SECRET_KEY, configApiKey);
        // Clear from configuration for security
        await vscode.workspace
          .getConfiguration(CONFIG.SECTION)
          .update(
            CONFIG.KEYS.API_KEY,
            undefined,
            vscode.ConfigurationTarget.Global
          );

        if (secureApiKey) {
          vscode.window.showInformationMessage(
            "API Key updated and moved to secure storage! 🔐"
          );
        } else {
          vscode.window.showInformationMessage(
            "API Key migrated to secure storage for better security! 🔐"
          );
        }
      }
      return configApiKey;
    }

    // If no config API Key, use the one from secure storage
    return secureApiKey;
  }

  /**
   * Prompts user to set API Key if not already configured
   * Used by translation commands when API Key is missing
   */
  async ensureApiKey(): Promise<string | undefined> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      const action = await vscode.window.showWarningMessage(
        "API Key not configured. Please set your l10n.dev API Key first.",
        "Set API Key",
        "Get API Key"
      );

      if (action === "Set API Key") {
        return await this.setApiKey();
      } else if (action === "Get API Key") {
        vscode.env.openExternal(vscode.Uri.parse(URLS.API_KEYS));
      }
    }

    return apiKey;
  }

  /**
   * Clears the API Key from both secure storage and configuration
   * Useful for resetting expired or invalid keys
   */
  async clearApiKey(): Promise<void> {
    // Clear from secure storage
    await this.context.secrets.delete(this.SECRET_KEY);

    // Clear from configuration (in case it exists there)
    await vscode.workspace
      .getConfiguration(CONFIG.SECTION)
      .update(
        CONFIG.KEYS.API_KEY,
        undefined,
        vscode.ConfigurationTarget.Global
      );

    vscode.window.showInformationMessage(
      "API Key cleared. You can set a new one in the extension settings or using the 'Set API Key' command."
    );
  }

  async setApiKey(): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your l10n.dev API Key",
      placeHolder: `Get your API Key from ${URLS.API_KEYS}`,
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await this.context.secrets.store(this.SECRET_KEY, apiKey);
      vscode.window.showInformationMessage("API Key saved securely! 🔐");
    }

    return apiKey;
  }
}
