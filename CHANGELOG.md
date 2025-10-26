# Change Log

All notable changes to the "Translate I18n JSON/ARB by l10n.dev" extension will be documented in this file.

## [1.4.0] - 2025-10-25

### Added
- 🎯 **Flutter Localization Support**: Full support for ARB (Application Resource Bundle) files used in Flutter applications
- 📱 **ARB File Translation**: New `Translate ARB to...` command specifically for ARB files
- 🔄 **Automatic ARB Metadata Updates**: The l10n.dev API automatically updates `@@locale` to the target language code and `@@last_modified` to current UTC timestamp
- 🏷️ **Custom Prefix Support**: ARB files with custom prefixes (e.g., `app_en_US.arb`, `my_app_fr.arb`) are automatically handled
- 📊 **Remaining Balance Display**: Translation success notification now shows remaining character balance after translation
- 🔤 **Underscore Format**: ARB files use underscores for language codes (e.g., `en_US`) instead of hyphens

### Changed
- 🔧 **Enhanced Language Detection**: Updated project structure detection to support both JSON (hyphen-based) and ARB (underscore-based) file naming conventions
- 📁 **Smart File Naming**: Automatically generates correct target file names based on file type (JSON vs ARB) and detected naming patterns
- ⚙️ **Language Code Validation**: Added separate validation for ARB format language codes with underscores
- 💬 **Improved Notifications**: Character usage now displays with thousands separators for better readability

### Notes
- **ARB vs JSON**: Use `Translate ARB to...` for Flutter ARB files and `Translate JSON to...` for standard i18n JSON files
- **File Format Detection**: The extension automatically detects file type based on extension (.arb or .json)
- **Backward Compatible**: All existing JSON translation functionality remains unchanged

## [1.3.0] - 2025-10-21

### Added
- 🔄 **Translate Only New Strings**: Added smart update mode that detects existing target files and prompts users to either translate only new strings or create a new file
- 📝 **Incremental Translation Support**: When translating only new strings, the extension reads the existing target file and sends both source and target to the API, which returns an updated translation with only the new strings translated
- 🎯 **Flexible File Management**: Users can choose between updating existing translations or creating new files with copy numbers (e.g., `es (1).json`)

### Changed
- 🔧 **Enhanced Translation Request**: Added `translateOnlyNewStrings` and `targetStrings` properties to support incremental translations
- 💾 **Smart File Saving**: Implemented logic to replace existing files when updating translations or generate unique filenames when creating new copies

### Notes
- **Backward Compatible**: No breaking changes - existing functionality remains unchanged
- ⚠️ **Array Handling Warning**: When using "Translate Only New Strings" with JSON arrays, ensure array indexes match between source and target files. Always append new items to the end of arrays. Object-based JSON structures (recommended for i18n) don't have this limitation as they match by key names.
- **User Experience**: When a target file exists, users are presented with a clear dialog offering three options: "Translate Only New Strings", "Create New File", or "Cancel"

## [1.2.0] - 2025-09-22

### Added
- ✨ **String Output Format**: Implemented `returnTranslationsAsString` feature that returns translations as stringified JSON
- 🔧 **Preserved Structure**: Maintains original JSON structure and key ordering in translated output
- ⚡ **Optimized Performance**: Eliminates the need for additional JSON.stringify() operations on the client side

### Changed
- 🔄 **API Integration**: Updated translation request interface to always use `returnTranslationsAsString: true`
- 📦 **Internal Optimization**: Streamlined translation output handling for better performance

### Notes
- **Always Enabled**: The `returnTranslationsAsString` feature is permanently enabled for the extension to ensure consistent behavior
- **Backward Compatible**: No breaking changes - existing functionality remains unchanged

## [1.1.0] - 2025-09-05

### Added
- ✨ **Generate Additional Plural Forms**: The new `generatePluralForms` setting enables automatic creation of all required plural form strings for languages with complex pluralization rules (e.g., Russian, Arabic, Polish).
- ⚙️ **Improved i18next Compatibility**: Designed specifically for i18next and similar frameworks that need accurate plural form handling.
- 🔧 **New Configuration Setting**: `l10n-translate-i18n.generatePluralForms` (default: false)

### Changed
- 📖 **Updated Documentation**: Enhanced README with plural forms configuration details.
- ⚡ **API Integration**: Updated translation request interface to support the new generatePluralForms property.

### Notes
- **Important**: Do not enable `generatePluralForms` for strict source-to-target mapping projects as it generates additional plural suffixes (extra keys not present in the source file).
- **Use Case**: This feature is specifically designed for i18next and similar frameworks that handle plural forms.

## [1.0.0] - 2025-08-26

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