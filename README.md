# Translate i18n by l10n.dev

AI-powered localization in VS Code. Translate i18n localization files in multiple formats directly in your editor using l10n.dev's intelligent translation service.

<img src="images/demonstration-dark.gif" alt="One click localization in VS Code">

## Features

- 🤖 **AI-Powered Translation**: Context-aware translations using advanced AI. Translate to 165+ languages.
- 📂 **Multi-Format Support**: Translate localization files in all major formats — JSON/JSONC, ARB (Flutter), XML/PLIST/RESX (Android, iOS, .NET), YAML (Ruby, Node.js), PO/POT (GNU Gettext, WordPress), XLIFF (CAT tools, Angular), Java `.properties`, CSV/TSV, Markdown and plain text files.
- 🔧 **Customizable Translation Style**: Configure translations to use contractions (e.g., "don't" vs "do not"), enable shortening when translations exceed source text length, and generate plural forms for i18next compatibility.
- 🔄 **Translate Only New Strings**: When a target file already exists, choose to translate only new strings and update the existing file, replace or create a new file with a copy number. Perfect for iterative localization workflows.
- 🌐 **i18next Plural Forms Support**: Automatically generates all required plural form strings with correct plural suffixes when enabled—ideal for i18next projects. For languages with complex pluralization rules (like Russian, Arabic, or Polish), the extension ensures every necessary form is created, even if your source file only has `_one` or `_other`. This guarantees your app works correctly in every locale, with no missing or incorrect plural forms.
- 🛠️ **Developer-Friendly Features**: Preserves placeholders, HTML tags, and formatting while adapting dates and numbers to target locales. Intelligently avoids translating things that shouldn't be translated (proper names, urls, technical terms, etc.). Learn more in this article: [i18n vs l10n: Why Developers Should Care and How AI Can Help](https://medium.com/@AntonAntonov88/i18n-vs-l10n-why-developers-should-care-and-how-ai-can-help-fec7a7580d17).
- 🔒 **Type Safety**: Preserves JSON data types during translation—numbers remain numbers, booleans stay booleans, and null stay null. AI translates only string content without converting other data types to strings.
- 🔐 **Secure API Key Storage**: Your API Keys are stored securely using VS Code's built-in secrets manager.
- 🎯 **Smart Language Detection**: Automatically detects target languages from your project structure for seamless file organization.
- 🌍 **Translate to All Languages**: Translate your file to all detected languages at once with a single command.
- 🧩 **Source Text as Keys**: Supports projects using source text as translation keys.
- 🕵️ **Smart Error Detection & Chunking**: Automatically detects and retries translations if placeholders or formatting are lost by the AI. For large files, l10n.dev splits content into manageable chunks, maintaining links and context between segments. This prevents issues common with direct uploads to AI models (like Claude or GPT), where exceeding AI output limit it can cause the model to omit, merge, or shorten content—resulting in lost context and lower translation quality. l10n.dev's approach ensures high-quality, accurate translations even for large i18n files.
- 💰 **Free**: Users get 10,000 characters free monthly.
- 📚 **Translation Glossary** - Generate and save AI glossaries for consistent terminology across translations.
- **Linguistic Instructions** - Control the overall style, tone, and translation behavior.

## Getting Started

### 1. Get Your API Key
1. Visit [l10n.dev/ws/keys](https://l10n.dev/ws/keys)
2. Sign up for a free account
3. Generate your API Key

### 2. Configure the Extension
1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `l10n.dev: Set API Key`
3. Paste your API Key when prompted
### 3. Translate Your Files
1. Right-click on any supported localization file (JSON, JSONC, ARB, XML, YAML, PO, XLIFF, `.properties`, CSV, TSV, TXT, and more) in the Explorer or Editor
2. Select `Translate to...`
3. Choose your target language (or select **"Translate to All Languages"** for batch translation)
4. If target file(s) exist, choose to update existing files or create new ones
5. Wait for translation to complete
6. Find your translated files in the appropriate language folders

## Related Project: ai-l10n npm Package

Looking for a programmatic solution? Check out the [**ai-l10n**](https://www.npmjs.com/package/ai-l10n) npm package! This Node.js package provides the same powerful AI translation capabilities directly in your JavaScript/TypeScript projects.

**Why use ai-l10n?**

1. **CI/CD Integration** - Automate translations in your build pipeline or deployment workflows
2. **Programmatic Control** - Full API access with TypeScript support for custom translation logic and batch processing
3. **CLI Support** - Command-line interface for quick translations without opening VS Code
4. **Framework Agnostic** - Use with any Node.js project: React, Vue, Angular, Next.js, Express, or standalone scripts
5. **Advanced Features** - Access to l10n.dev API

Perfect for developers who want to integrate AI-powered localization into their automated workflows, build tools, or server-side applications.

### ARB File Support (Flutter Localization)

<img src="images/flutter-localization.gif" alt="Flutter Localization in VS Code">

The extension fully supports ARB (Application Resource Bundle) files used in Flutter applications:

- **Automatic Metadata Updates**: The API automatically updates `@@locale` to the target language code and `@@last_modified` to the current UTC timestamp
- **Metadata Translation Control**: By default, metadata entries (like `@key`) are NOT translated and remain unchanged. Enable the `translateMetadata` setting if you want to translate these metadata (e.g. description, example, context for translators) along with UI strings
- **Custom Prefixes**: Supports custom file naming patterns (e.g., `app_en_US.arb`, `my_app_fr.arb`)
- **Underscore Format**: ARB files use underscores instead of hyphens (e.g., `en_US` instead of `en-US`)
- **Perfect for Flutter**: Seamlessly integrates with Flutter's localization workflow

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
```
l10n/
├── app_en.json
├── app_en_US.json
├── app_es.json
├── app_fr.json
├── app_de.json
└── app_zh_Hans_CN.json
```
**How it works:**
- **Detection**: Language code is identified from the filename (e.g., `en.json`, `es.json`, `fr.json`)
- **File Saving**: Saves the translated file using the target language code as the filename in the same folder
- **Example**: Translating `i18n/en.json` to Spanish → `i18n/es.json`

### Shopify Theme File-Based Structure
```
theme/locales/
├── en.default.schema.json  # Source file
├── es-ES.schema.json       # Auto-detected
├── fr.schema.json          # Auto-detected
└── de.schema.json          # Auto-detected
```
**How it works:**
- **Detection**: Files with `.default.` in the name (e.g., `en.default.schema.json`) are recognized as source files
- **File Saving**: Target files automatically remove `.default.` while preserving `.schema.` suffix
- **Example**: Translating `theme/locales/en.default.schema.json` to Spanish → `theme/locales/es-ES.schema.json`

### Unknown Structure Fallback
For projects that don't match the above patterns, the extension falls back to saving files with the format: `{originalname}.{languagecode}.json` in the same directory as the source file.

## Configuration Options

Configure translation behavior in VS Code settings (`Ctrl+,` and search for "l10n-translate-i18n"):

- **Use Contractions**: Makes translations less formal (default: true)
- **Use Shortening**: Uses shortened forms if translation is longer than source (default: false)
- **Generate Glossary**: Generate and save a glossary from source and translated content for this language pair. See [Translation Glossary](#translation-glossary)
- **Generate Plural Forms**: Generates additional plural form strings (e.g., for i18next) with plural suffixes. Do not enable for strict source-to-target mapping (default: false)
- **Translate Metadata**: Translate metadata along with UI strings. For example, in Flutter ARB files, metadata entries like `@key` contain descriptions that can also be translated. Enable to translate metadata (default: false)

## Commands

- `Translate i18n: Set API Key` - Securely configure API Key
- `Translate i18n: Clear API Key` - Clear API Key in VS Code secrets storage
- `Translate i18n: Configure Translation Options` - Open extension settings
- `Translate i18n: Translate to...` - Translate any supported localization file (JSON, ARB, XML, YAML, PO, XLIFF, `.properties`, CSV, TSV, TXT, and more)

## Translation Glossary

A translation glossary maps specific source-language terms to approved target-language equivalents, ensuring the AI uses your exact terminology instead of valid-but-unintended synonyms. Glossaries are especially valuable for brand names, legal terms, clinical vocabulary, and product-specific concepts.

### AI Glossary Generation

When **Generate Glossary** is enabled (config) it automatically builds a glossary from the source and translated target content, then save it as the active glossary for this source/target language pair. Once saved, the glossary is applied automatically on all future translations for the same language pair.

> **Note:** When **Generate Glossary** is enabled, your character quota is debited for the full source content upfront — even when you choose translating only new strings. When disabled (default), a temporary internal glossary is generated automatically at no extra cost only for large files that exceed the AI chunk size.

Manage your saved glossaries at [l10n.dev/ws/translation-glossary](https://l10n.dev/ws/translation-glossary).

## Linguistic Instructions

Linguistic Instructions let you guide AI, for example:
- 📝 "Use formal tone"
- 📝 "Do not translate product names"
- 📝 "Use active voice"

Unlike glossaries that control specific terms, Linguistic Instructions control the overall style, tone, and translation behavior.
Combined with AI Glossaries, they give much more control over localization quality and brand consistency.

Manage your saved linguistic Instructions at [l10n.dev/ws/linguistic-instructions](https://l10n.dev/ws/linguistic-instructions).

## Language Support

l10n.dev supports 165+ languages with varying proficiency levels:
- **Strong (12 languages)**: English, Spanish, French, German, Chinese, Russian, etc.
- **High (53 languages)**: Most European and Asian languages
- **Moderate (100+ languages)**: Wide range of world languages

## Pricing

- **Free Characters**: 10,000 characters for free monthly.
- **Pay-as-you-go**: Affordable character-based pricing. Visit [l10n.dev/#pricing](https://l10n.dev/#pricing) for current pricing.
- **No subscription required**

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

### Important: Working with Arrays in JSON

⚠️ **When using "Translate Only New Strings"**: If your JSON contains arrays (not just objects), make sure the array indexes in your target file match those in the source file. This ensures translations remain consistent. **When adding new strings, always append them to the end of the array.**

**Example:**
```json
// ✅ CORRECT: New items added at the end
// source.json
["Apple", "Banana", "Orange"]

// target.json (existing)
["Manzana", "Plátano"]

// After translation (new item appended)
["Manzana", "Plátano", "Naranja"]

// ❌ INCORRECT: Items inserted in the middle
// This will cause misalignment!
["Apple", "Cherry", "Banana", "Orange"]
```

For object-based JSON structures (recommended for i18n), this is not a concern as translations are matched by key names.

## Support

- **API Documentation**: [l10n.dev/api/doc](https://l10n.dev/api/doc)
- **Issues**: Report bugs on github

## Privacy & Security

- API Keys are stored securely using VS Code's encrypted secrets storage
- No source code or translations are stored on our servers beyond the processing time
- All communication with l10n.dev API is encrypted (HTTPS)

---

Made with ❤️ for developers who care about internationalization (i18n) and localization (l10n)

---
> **Tip:** For translating a large number of files, use the [I18N File Translation UI](https://l10n.dev/ws/translate-i18n-files) on l10n.dev. The VS Code extension translates files in real time via the [Translate JSON API](https://l10n.dev/api/doc/#tag/json-translation) and does not store your JSON or translations on our servers. For very large files, translation may take several minutes and delivery cannot be guaranteed in all cases.
>
> On the l10n.dev platform, you can securely create translation jobs for batch processing, set custom terminology, monitor progress in real time, and download your files when complete. You have full control: files can be deleted at any time. For automation and CI/CD workflows, our API lets you integrate localization seamlessly into your pipelines.
>
> l10n.dev is built by developers for developers, with privacy, reliability, and quality as top priorities.
