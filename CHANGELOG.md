# Change Log

All notable changes to the "l10n.translate-i18n" extension will be documented in this file.

## [0.0.1] - 2025-08-14

### Added
- ✨ **Initial Release**: AI-powered JSON translation for VS Code
- 🔐 **Secure API Key Storage**: Uses VS Code's encrypted secrets storage
- 🎯 **Smart Language Detection**: Automatically detects target languages from project structure
  - Supports folder-based structures (`locales/en/`, `locales/fr/`)
  - Supports file-based structures (`en.json`, `fr.json`, `en-US.json`)
  - Recognizes common i18n directory names (`locales`, `i18n`, `translations`, `lang`, `languages`)
- 🌐 **Language Prediction**: Search and predict language codes using l10n.dev API
- ⚙️ **Translation Options**: Configure contractions, shortening, and custom terminology
- 📁 **Context Menu Integration**: "Translate to..." option for JSON files in Explorer and Editor
- 📊 **Usage Tracking**: Shows character usage and translation details
- 🚨 **Error Handling**: Comprehensive error messages for different scenarios
- 💰 **Free Trial Promotion**: Informs new users about 30,000 free characters

### Features
- **Commands**:
  - `l10n.dev: Set API Key` - Securely configure API key
  - `l10n.dev: Configure Translation Options` - Open extension settings
  - `l10n.dev: Translate to...` - Translate JSON files

- **Configuration Options**:
  - `l10n.useContractions` - Use grammar contractions (default: true)
  - `l10n.useShortening` - Use shortened forms when needed (default: false)
  - `l10n.terminology` - Custom terminology for consistent translations

- **Supported Language Codes**: BCP-47 format (e.g., `en`, `es`, `fr`, `zh-CN`, `en-US`)

- **Project Structure Detection**: Automatically scans for language codes in:
  - Directory names
  - JSON file names
  - Common i18n folder structures

### Technical Implementation
- TypeScript implementation with VS Code Extension API
- Secure API integration with l10n.dev service
- Real-time language prediction and translation
- Progress indicators for user feedback
- Comprehensive error handling and user guidance

### API Integration
- **Language Prediction**: `GET /languages/predict`
- **Translation**: `POST /translate`
- **Security**: API keys stored in VS Code secrets storage
- **Error Handling**: Proper handling of 401, 402, 413, and 500 status codes