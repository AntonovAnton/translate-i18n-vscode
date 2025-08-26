# Change Log

All notable changes to the "Translate I18n JSON by l10n.dev" extension will be documented in this file.

## [1.0.0] - 2025-08-22

### Added
- ✨ **Initial Release**: AI-powered JSON translation for VS Code
- 🔐 **Secure API Key Storage**: Uses VS Code's encrypted secrets storage
- 🎯 **Smart Language Detection**: Automatically detects target languages from project structure
  - Supports folder-based structures (`locales/en/`, `locales/fr/`)
  - Supports file-based structures (`en.json`, `fr.json`, `en-US.json`)
- 🌐 **Language Prediction**: Search and predict language codes using l10n.dev API
- ⚙️ **Translation Options**: Configure contractions, and shortening
- 📁 **Context Menu Integration**: "Translate JSON to..." option for JSON files in Explorer and Editor
- 📊 **Usage Tracking**: Shows character usage and translation details
- 🚨 **Error Handling**: Comprehensive error messages for different scenarios
- 💰 **Free Characters Promotion**: Informs new users about 30,000 free characters

### Features
- **Commands**:
  - `Translate I18n: Set API Key` - Securely configure API Key
  - `Translate I18n: Clear API Key` - Clear API Key in VS Code secrets storage
  - `Translate I18n: Configure Translation Options` - Open extension settings
  - `Translate I18n: Translate JSON to...` - Translate JSON files

- **Configuration Options**:
  - `l10n-translate-i18n.useContractions` - Use grammar contractions (default: true)
  - `l10n-translate-i18n.useShortening` - Use shortened forms when needed (default: false)

- **Supported Language Codes**: BCP-47 format (e.g., `en`, `es`, `fr`, `zh-CN`, `en-US`)

- **Project Structure Detection**: Automatically scans for language codes in:
  - Directory names
  - JSON file names

### Technical Implementation
- TypeScript implementation with VS Code Extension API
- Secure API integration with l10n.dev service
- Real-time language prediction and translation
- Progress indicators for user feedback
- Comprehensive error handling and user guidance

### API Integration
- **Language Prediction**: `GET /languages/predict`
- **Translation**: `POST /translate`
- **Security**: API Keys stored in VS Code secrets storage
- **Error Handling**: Proper handling of 401, 402, 413, and 500 status codes