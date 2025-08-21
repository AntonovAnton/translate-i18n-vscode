import * as vscode from "vscode";
import { CONFIG, URLS } from "./constants";
import { logInfo } from "./logger";

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
    if (configApiKey?.trim() && configApiKey !== secureApiKey) {
      logInfo("API Key found in configuration, migrating to secure storage");

      // Update secure storage
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
        vscode.window.showInformationMessage("API Key updated securely! 🔐");
      } else {
        vscode.window.showInformationMessage(
          "API Key migrated to secure storage for better security! 🔐"
        );
      }

      logInfo("API Key migrated to secure storage");

      return configApiKey;
    }

    if (!secureApiKey) {
      logInfo("No API Key found");
    }
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
    logInfo("Clearing API Key from secure storage and configuration");

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

    logInfo("API Key cleared successfully from all storage locations");

    vscode.window.showInformationMessage(
      "API Key cleared. You can set a new one in the extension settings or using the 'Set API Key' command."
    );
  }

  async setApiKey(): Promise<string | undefined> {
    logInfo("User requested to set new API Key");

    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your l10n.dev API Key",
      placeHolder: `Get your API Key from ${URLS.API_KEYS}`,
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await this.context.secrets.store(this.SECRET_KEY, apiKey);

      logInfo("New API Key stored securely");

      vscode.window.showInformationMessage("API Key saved securely! 🔐");
    } else {
      logInfo("API Key setup cancelled by user");
    }

    return apiKey;
  }
}
