import * as vscode from "vscode";
import { CONFIG } from "./constants";
import {
  ApiKeyManager as SharedApiKeyManager,
  ILogger,
  URLS,
} from "ai-l10n-sdk";

/**
 * Owns the API Key for the extension.
 *
 * One rule: we find a key wherever it lives, but we only ever write to VS Code's
 * secret storage. The ai-l10n CLI and the bundled MCP server keep their own key in
 * ~/.ai-l10n/config.json; that store is read as a fallback so a key configured
 * outside VS Code keeps working, and is never written to from here.
 */
export class ApiKeyManager {
  private readonly SECRET_KEY = `${CONFIG.SECTION}.${CONFIG.KEYS.API_KEY}`;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: ILogger,
    private readonly sharedApiKeyManager: SharedApiKeyManager = new SharedApiKeyManager(
      logger
    )
  ) {}

  async getApiKey(): Promise<string | undefined> {
    // Check both secure storage and configuration
    const secureApiKey = await this.context.secrets.get(this.SECRET_KEY);
    const configApiKey = vscode.workspace
      .getConfiguration(CONFIG.SECTION)
      .get<string>(CONFIG.KEYS.API_KEY);

    // If user has set a new API Key in configuration, it takes precedence
    // This allows users to update expired keys through settings UI
    if (configApiKey?.trim() && configApiKey !== secureApiKey) {
      this.logger.logInfo(
        "API Key found in configuration, migrating to secure storage"
      );

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

      this.logger.logInfo("API Key migrated to secure storage");

      return configApiKey;
    }

    if (secureApiKey) {
      return secureApiKey;
    }

    // Fall back to the key shared with the ai-l10n CLI and the MCP server, so a key
    // set outside VS Code (or by an agent via l10n_set_api_key) still works here.
    const sharedApiKey = await this.sharedApiKeyManager.getStoredApiKey();
    if (sharedApiKey) {
      this.logger.logInfo(
        "Using the API Key shared with the ai-l10n CLI and MCP server"
      );
      return sharedApiKey;
    }

    this.logger.logInfo("No API Key found");
    return undefined;
  }

  /**
   * Prompts user to set API Key if not already configured
   * Used by translation commands when API Key is missing
   */
  async ensureApiKey(): Promise<string | undefined> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      const action = await vscode.window.showWarningMessage(
        "API Key not configured. Please set your l10n.dev API key first.",
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
    this.logger.logInfo(
      "Clearing API Key from secure storage and configuration"
    );

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

    // The CLI and the MCP server read their own key from ~/.ai-l10n/config.json.
    // Clearing only VS Code's copy would leave them translating with a key the user
    // believes is gone, so offer to remove that one too. It is shared with tools
    // outside VS Code, hence the confirmation rather than a silent delete.
    const sharedApiKey = await this.sharedApiKeyManager.getStoredApiKey();
    if (sharedApiKey) {
      const action = await vscode.window.showWarningMessage(
        "An API Key is also stored for the ai-l10n CLI and MCP server (~/.ai-l10n/config.json). Remove that one too?",
        "Remove",
        "Keep"
      );

      if (action === "Remove") {
        await this.sharedApiKeyManager.clearStoredApiKey();
        this.logger.logInfo("Shared API Key cleared from ~/.ai-l10n/config.json");
      } else {
        this.logger.logInfo(
          "Shared API Key in ~/.ai-l10n/config.json was kept at the user's request"
        );
      }
    }

    this.logger.logInfo(
      "API Key cleared successfully from all storage locations"
    );

    vscode.window.showInformationMessage(
      "API Key cleared. You can set a new one in the extension settings or using the 'Set API Key' command."
    );
  }

  async setApiKey(): Promise<string | undefined> {
    this.logger.logInfo("User requested to set new API Key");

    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your l10n.dev API Key",
      placeHolder: `Get your API Key from ${URLS.API_KEYS}`,
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await this.context.secrets.store(this.SECRET_KEY, apiKey);

      this.logger.logInfo("New API Key stored securely");

      vscode.window.showInformationMessage("API Key saved securely! 🔐");
    } else {
      this.logger.logInfo("API Key setup cancelled by user");
    }

    return apiKey;
  }
}
