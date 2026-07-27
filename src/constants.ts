// Configuration constants shared across the extension
export const CONFIG = {
  SECTION: "l10n-translate-i18n",
  CLIENT: "vscode-extension",
  KEYS: {
    API_KEY: "apiKey",
    USE_CONTRACTIONS: "useContractions",
    USE_SHORTENING: "useShortening",
    GENERATE_GLOSSARY: "generateGlossary",
    GENERATE_PLURAL_FORMS: "generatePluralForms",
    SAVE_FILTERED_STRINGS: "saveFilteredStrings",
    TRANSLATE_METADATA: "translateMetadata",
    ENABLE_MCP_SERVER: "enableMcpServer",
  },
} as const;

// Built-in MCP server that ships inside the extension
export const MCP = {
  // Must match contributes.mcpServerDefinitionProviders[0].id in package.json
  PROVIDER_ID: "l10nDevMcpProvider",
  SERVER_LABEL: "l10n.dev",
  SERVER_SCRIPT: "dist/mcp-server.js",
  API_KEY_ENV: "L10N_API_KEY",
} as const;

// State keys for extension storage
export const STATE_KEYS = {
  WELCOME_SHOWN: "l10n-translate-i18n.hasShownWelcome",
} as const;

// Command constants
export const COMMANDS = {
  SET_API_KEY: "l10n.translate-i18n.setApiKey",
  CLEAR_API_KEY: "l10n.translate-i18n.clearApiKey",
  CONFIGURE_OPTIONS: "l10n.translate-i18n.configureOptions",
  TRANSLATE: "l10n.translate-i18n.translate",
  TRANSLATE_ARB: "l10n.translate-i18n.translateArb",
} as const;

// VS Code built-in commands
export const VSCODE_COMMANDS = {
  OPEN_SETTINGS: "workbench.action.openSettings",
  QUICK_OPEN: "workbench.action.quickOpen",
} as const;
