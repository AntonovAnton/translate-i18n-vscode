// Configuration constants shared across the extension
export const CONFIG = {
  SECTION: "l10n-translate-i18n",
  KEYS: {
    API_KEY: "apiKey",
    USE_CONTRACTIONS: "useContractions",
    USE_SHORTENING: "useShortening",
    GENERATE_PLURAL_FORMS: "generatePluralForms",
  },
} as const;

// URL constants for l10n.dev service
export const URLS = {
  BASE: "https://l10n.dev",
  API_BASE: "https://l10n.dev/api",
  API_KEYS: "https://l10n.dev/ws/keys",
  PRICING: "https://l10n.dev/#pricing",
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
