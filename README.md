# Translate I18n JSON by l10n.dev

AI-powered localization for VS Code. Translate i18n JSON files directly in your editor using l10n.dev's intelligent translation service.

## Features

- 🤖 **AI-Powered Translation**: Context-aware translations using advanced AI
- 🔐 **Secure API Key Storage**: Your API keys are stored securely using VS Code's built-in secrets manager
- 🎯 **Smart Language Detection**: Automatically detects target languages from your project structure
- 🔧 **Customizable Options**: Configure contractions, shortening, and custom terminology
- 📁 **Multiple Project Structures**: Supports various i18n folder structures
- 💰 **Free Trial**: New users get 30,000 characters free for 3 days

## Getting Started

### 1. Get Your API Key
1. Visit [l10n.dev/ws/keys](https://l10n.dev/ws/keys)
2. Sign up for a free account
3. Generate your API key
4. **New users get 30,000 characters free for 3 days!**

### 2. Configure the Extension
1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `l10n.dev: Set API Key`
3. Paste your API key when prompted

### 3. Translate Your Files
1. Right-click on any JSON file in the Explorer or Editor
2. Select `Translate to...`
3. Choose your target language (detected automatically or search manually)
4. Wait for translation to complete
5. The translated file will be saved with the target language code

## Supported Project Structures

The extension automatically detects target languages from common i18n project structures:

### Folder-based Structure
```
locales/
├── en/
│   ├── common.json
│   └── auth.json
├── es/
├── fr/
└── de/
```

### File-based Structure
```
i18n/
├── en.json
├── en-US.json
├── es.json
├── fr.json
├── de.json
└── zh-Hans-CN.json
```

### Mixed Structure
```
translations/
├── en-latn-us.json
├── es-ES.json
└── fr-FR.json
```

## Configuration Options

Configure translation behavior in VS Code settings (`Ctrl+,` and search for "l10n"):

- **Use Contractions**: Makes translations less formal (default: true)
- **Use Shortening**: Uses shortened forms if translation is longer than source (default: false)
- **Terminology**: Define custom terms for consistent translations

### Custom Terminology Example
```json
{
  "l10n.terminology": [
    {
      "term": "dashboard",
      "synonyms": ["control panel", "main screen"]
    },
    {
      "term": "login",
      "synonyms": ["sign in", "log in"]
    }
  ]
}
```

## Commands

- `l10n.dev: Set API Key` - Configure your API key securely
- `l10n.dev: Configure Translation Options` - Open extension settings
- `l10n.dev: Translate to...` - Translate the current JSON file

## Language Support

l10n.dev supports 165+ languages with varying proficiency levels:
- **Strong (12 languages)**: English, Spanish, French, German, Chinese, Russian, etc.
- **High (53 languages)**: Most European and Asian languages
- **Moderate (100+ languages)**: Wide range of world languages

## Pricing

- **Free Trial**: 30,000 characters for 3 days (new users)
- **Pay-as-you-go**: Affordable character-based pricing
- **No subscription required**

Visit [l10n.dev/#pricing](https://l10n.dev/#pricing) for current pricing.

## Troubleshooting

### Common Issues

**"API Key not configured"**
- Run `l10n.dev: Set API Key` command
- Ensure you've copied the key correctly from [l10n.dev/ws/keys](https://l10n.dev/ws/keys)

**"Insufficient balance"**
- Check your account balance at [l10n.dev](https://l10n.dev)
- Purchase more characters if needed

**"No languages detected"**
- The extension will prompt you to enter a language code manually
- Use BCP-47 format (e.g., "es", "fr", "zh-CN", "en-US")

**"Invalid JSON file"**
- Ensure your JSON file is valid
- Check for syntax errors using VS Code's built-in JSON validation

## Support

- **Documentation**: [l10n.dev](https://l10n.dev)
- **API Documentation**: Included in extension
- **Issues**: Report bugs on the VS Code Marketplace

## Privacy & Security

- API keys are stored securely using VS Code's encrypted secrets storage
- No source code or translations are stored on our servers beyond the processing time
- All communication with l10n.dev API is encrypted (HTTPS)

---

Made with ❤️ for developers who care about internationalization
