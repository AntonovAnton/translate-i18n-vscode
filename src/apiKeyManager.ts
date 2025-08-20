import * as vscode from "vscode";
import { CONFIG, URLS } from "./constants";

export class ApiKeyManager {
  private readonly context: vscode.ExtensionContext;
  private readonly SECRET_KEY = `${CONFIG.SECTION}.${CONFIG.KEYS.API_KEY}`;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getApiKey(): Promise<string | undefined> {
    // Try to get API key from secure storage first
    let apiKey = await this.context.secrets.get(this.SECRET_KEY);

    if (!apiKey) {
      // Fallback to configuration (for backward compatibility and settings UI)
      apiKey = vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .get(CONFIG.KEYS.API_KEY);
      
      if (apiKey) {
        // Migrate to secure storage
        await this.context.secrets.store(this.SECRET_KEY, apiKey);
        // Clear from configuration for security
        await vscode.workspace
          .getConfiguration(CONFIG.SECTION)
          .update(
            CONFIG.KEYS.API_KEY,
            undefined,
            vscode.ConfigurationTarget.Global
          );
        
        vscode.window.showInformationMessage(
          "API Key migrated to secure storage for better security! 🔐"
        );
      }
    }

    return apiKey;
  }

  /**
   * Prompts user to set API key if not already configured
   * Used by translation commands when API key is missing
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
