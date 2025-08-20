# Translate I18n JSON by l10n.dev

AI-powered localization for VS Code. Translate i18n JSON files directly in your editor using l10n.dev's intelligent translation service.

## Features

- 🤖 **AI-Powered Translation**: Context-aware translations using advanced AI
- 🔐 **Secure API Key Storage**: Your API Keys are stored securely using VS Code's built-in secrets manager
- 🎯 **Smart Language Detection**: Automatically detects target languages from your project structure
- 🔧 **Customizable Options**: Configure using contractions, and shortening
- 💰 **Free Trial**: New users get 30,000 characters free for 3 days

## Getting Started

### 1. Get Your API Key
1. Visit [l10n.dev/ws/keys](https://l10n.dev/ws/keys)
2. Sign up for a free account
3. Generate your API Key
4. **New users get 30,000 characters free for 3 days!**

### 2. Configure the Extension
1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `l10n.dev: Set API Key`
3. Paste your API Key when prompted

### 3. Translate Your Files
1. Right-click on any JSON file in the Explorer or Editor
2. Select `Translate JSON to...`
3. Choose your target language (detected automatically or search manually)
4. Wait for translation to complete
5. The translated file will be saved with the target language code

## Supported Project Structures

The extension automatically detects target languages from common i18n project structures and saves translated files accordingly:

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

**How it works:**
- **Detection**: Language code is identified from the folder name (e.g., `en/`, `es/`, `fr/`)
- **File Saving**: Creates the target language folder if it doesn't exist and saves the file with the same name as the source file
- **Example**: Translating `locales/en/common.json` to Spanish → `locales/es/common.json`
- **Conflict Resolution**: If the target file already exists, adds a copy number (e.g., `common (1).json`)

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

**How it works:**
- **Detection**: Language code is identified from the filename (e.g., `en.json`, `es.json`, `fr.json`)
- **File Saving**: Saves the translated file using the target language code as the filename in the same folder
- **Example**: Translating `i18n/en.json` to Spanish → `i18n/es.json`
- **Conflict Resolution**: If the target file already exists, adds a copy number (e.g., `es (1).json`)

### Unknown Structure Fallback
For projects that don't match the above patterns, the extension falls back to saving files with the format: `{originalname}.{languagecode}.json` in the same directory as the source file.

## Configuration Options

Configure translation behavior in VS Code settings (`Ctrl+,` and search for "l10n-translate-i18n"):

- **Use Contractions**: Makes translations less formal (default: true)
- **Use Shortening**: Uses shortened forms if translation is longer than source (default: false)

## Commands

- `Translate I18n: Set API Key` - Securely configure API Key
- `Translate I18n: Clear API Key` - Clear API Key in VS Code secrets storage
- `Translate I18n: Configure Translation Options` - Open extension settings
- `Translate I18n: Translate JSON to...` - Translate JSON files

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

- **API Documentation**: [l10n.dev/api/doc](https://l10n.dev/api/doc)
- **Issues**: Report bugs on github

## Privacy & Security

- API Keys are stored securely using VS Code's encrypted secrets storage
- No source code or translations are stored on our servers beyond the processing time
- All communication with l10n.dev API is encrypted (HTTPS)

---

Made with ❤️ for developers who care about internationalization (i18n) and localization (l10n)
