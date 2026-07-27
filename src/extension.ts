// VS Code API imports
import * as vscode from "vscode";

// Local service imports
import { ApiKeyManager } from "./apiKeyManager";
import { I18nProjectManager, L10nTranslationService, URLS } from "ai-l10n-sdk";
import { LanguageSelector } from "./languageSelector";
import { registerMcpServerProvider } from "./mcpServerProvider";
import { handleTranslateCommand } from "./translationCommand";

import { COMMANDS, VSCODE_COMMANDS, STATE_KEYS, CONFIG } from "./constants";
import { OutputChannelLogger } from "./outputChannelLogger";

/**
 * Main extension activation function
 * Sets up services, shows welcome message, and registers commands
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("l10n.dev Translation extension is now active!");

  const logger = new OutputChannelLogger();
  const apiKeyManager = new ApiKeyManager(context, logger);
  const translationService = new L10nTranslationService(logger);
  const i18nProjectManager = new I18nProjectManager();
  const languageSelector = new LanguageSelector(translationService);

  // Setup welcome message for new users
  setupWelcomeMessage(context);

  // Registered before activate() resolves so the editor can cache the server list
  const mcpServer = registerMcpServerProvider(context, apiKeyManager, logger);
  context.subscriptions.push(mcpServer.disposable);

  // Re-publish the server when the user turns it on or off
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration(
          `${CONFIG.SECTION}.${CONFIG.KEYS.ENABLE_MCP_SERVER}`,
        )
      ) {
        mcpServer.refresh();
      }
    }),
  );

  registerCommands(
    context,
    apiKeyManager,
    logger,
    translationService,
    i18nProjectManager,
    languageSelector,
    mcpServer.refresh,
  );
}

/**
 * Shows welcome message for first-time users
 */
function setupWelcomeMessage(context: vscode.ExtensionContext) {
  // Show welcome message for new users
  const hasShownWelcome = context.globalState.get(
    STATE_KEYS.WELCOME_SHOWN,
    false,
  );
  if (!hasShownWelcome) {
    const freeBalance = (30000).toLocaleString();
    const welcomeMessage = `🎉 Welcome to l10n.dev! Create a free account and get ${freeBalance} characters monthly for free. Get your API Key from ${URLS.API_KEYS}`;
    vscode.window
      .showInformationMessage(welcomeMessage, "Set API Key", "Get API Key")
      .then((selection) => {
        if (selection === "Set API Key") {
          vscode.commands.executeCommand(COMMANDS.SET_API_KEY);
        } else if (selection === "Get API Key") {
          vscode.env.openExternal(vscode.Uri.parse(URLS.API_KEYS));
        }
      });
    context.globalState.update(STATE_KEYS.WELCOME_SHOWN, true);
  }
}

/**
 * Registers all extension commands
 */
function registerCommands(
  context: vscode.ExtensionContext,
  apiKeyManager: ApiKeyManager,
  logger: OutputChannelLogger,
  translationService: L10nTranslationService,
  i18nProjectManager: I18nProjectManager,
  languageSelector: LanguageSelector,
  refreshMcpServer: () => void,
) {
  // Register set API Key command
  const setApiKeyDisposable = vscode.commands.registerCommand(
    COMMANDS.SET_API_KEY,
    async () => {
      await apiKeyManager.setApiKey();
      // The MCP server receives the key on start, so it needs to pick up the new one
      refreshMcpServer();
    },
  );

  // Register clear API Key command
  const clearApiKeyDisposable = vscode.commands.registerCommand(
    COMMANDS.CLEAR_API_KEY,
    async () => {
      const action = await vscode.window.showWarningMessage(
        "Are you sure you want to clear your API Key? You'll need to set it again to use translation features.",
        "Clear API Key",
        "Cancel",
      );

      if (action === "Clear API Key") {
        await apiKeyManager.clearApiKey();
        refreshMcpServer();
      }
    },
  );

  // Register configure options command
  const configureOptionsDisposable = vscode.commands.registerCommand(
    COMMANDS.CONFIGURE_OPTIONS,
    async () => {
      await vscode.commands.executeCommand(
        VSCODE_COMMANDS.OPEN_SETTINGS,
        CONFIG.SECTION,
      );
    },
  );

  // Register translate command
  const translateDisposable = vscode.commands.registerCommand(
    COMMANDS.TRANSLATE,
    async (uri: vscode.Uri) => {
      // Ensure we have an API Key (will prompt user if needed)
      const apiKey = await apiKeyManager.ensureApiKey();
      if (!apiKey) {
        return; // User cancelled API Key setup
      }
      await handleTranslateCommand(
        uri,
        logger,
        apiKey,
        translationService,
        i18nProjectManager,
        languageSelector,
      );
    },
  );

  context.subscriptions.push(
    setApiKeyDisposable,
    clearApiKeyDisposable,
    configureOptionsDisposable,
    translateDisposable,
  );
}

export function deactivate() {}
