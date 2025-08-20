import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Import the I18nProjectManager and related types
const i18nProjectManagerModule = require("../i18nProjectManager");
const I18nProjectManager = i18nProjectManagerModule.I18nProjectManager;
const ProjectStructureType = i18nProjectManagerModule.ProjectStructureType;

suite("I18nProjectManager Test Suite", () => {
  let tempDir: string;
  let detector: any;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-lang-detector-"));
    detector = new I18nProjectManager();
  });

  teardown(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite("Project Structure Detection", () => {
    test("detects folder-based structure (locales/en/common.json)", () => {
      // Create folder structure
      const localesDir = path.join(tempDir, "locales", "en");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "common.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, ProjectStructureType.FolderBased);
      assert.strictEqual(structure.basePath, path.join(tempDir, "locales"));
      assert.strictEqual(structure.sourceLanguage, "en");
    });

    test("detects file-based structure (i18n/en.json)", () => {
      // Create file structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, ProjectStructureType.FileBased);
      assert.strictEqual(structure.basePath, i18nDir);
      assert.strictEqual(structure.sourceLanguage, "en");
    });

    test("detects complex language codes (zh-Hans-CN)", () => {
      // Create folder structure with complex language code
      const localesDir = path.join(tempDir, "locales", "zh-Hans-CN");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "app.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, ProjectStructureType.FolderBased);
      assert.strictEqual(structure.sourceLanguage, "zh-Hans-CN");
    });

    test("returns unknown structure for unrecognized patterns", () => {
      // Create a file that doesn't match known patterns
      const randomDir = path.join(tempDir, "translations");
      fs.mkdirSync(randomDir, { recursive: true });
      const sourceFile = path.join(randomDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, ProjectStructureType.Unknown);
      assert.strictEqual(structure.basePath, randomDir);
      assert.strictEqual(structure.sourceLanguage, undefined);
    });
  });

  suite("Target File Path Generation", () => {
    test("generates folder-based target path", () => {
      // Setup folder-based structure
      const localesDir = path.join(tempDir, "locales", "en");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "common.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(tempDir, "locales", "fr", "common.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("generates file-based target path", () => {
      // Setup file-based structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(i18nDir, "fr.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("handles unknown structure", () => {
      // Setup unknown structure
      const translationsDir = path.join(tempDir, "translations");
      fs.mkdirSync(translationsDir, { recursive: true });
      const sourceFile = path.join(translationsDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(translationsDir, "messages.fr.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("handles file conflicts with numbering", () => {
      // Setup file-based structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      // Create conflicting files
      const conflictFile1 = path.join(i18nDir, "fr.json");
      const conflictFile2 = path.join(i18nDir, "fr (1).json");
      fs.writeFileSync(conflictFile1, "{}");
      fs.writeFileSync(conflictFile2, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(i18nDir, "fr (2).json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("preserves case of original language code", () => {
      // Setup with mixed case language code
      const localesDir = path.join(tempDir, "locales", "zh-Hans-CN");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "app.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "JA-jp");

      const expectedPath = path.join(tempDir, "locales", "JA-jp", "app.json");
      assert.strictEqual(targetPath, expectedPath);
    });
  });

  suite("Language Code Normalization", () => {
    test("normalizes simple language codes", () => {
      const normalized = detector.normalizeLanguageCode("EN");
      assert.strictEqual(normalized, "en");
    });

    test("normalizes complex language codes", () => {
      const normalized = detector.normalizeLanguageCode("ZH-hans-CN");
      assert.strictEqual(normalized, "zh-Hans-CN");
    });

    test("preserves case for script codes", () => {
      const normalized = detector.normalizeLanguageCode("zh-HANS-cn");
      assert.strictEqual(normalized, "zh-Hans-CN");
    });

    test("handles unknown formats gracefully", () => {
      const normalized = detector.normalizeLanguageCode("invalid-code");
      assert.strictEqual(normalized, "invalid-code");
    });
  });

  suite("Language Code Validation", () => {
    test("validates correct language codes", () => {
      assert.strictEqual(detector.validateLanguageCode("en"), true);
      assert.strictEqual(detector.validateLanguageCode("zh-Hans-CN"), true);
      assert.strictEqual(detector.validateLanguageCode("fr-FR"), true);
    });

    test("rejects invalid language codes", () => {
      assert.strictEqual(detector.validateLanguageCode(""), false);
      assert.strictEqual(detector.validateLanguageCode("invalid"), false);
      assert.strictEqual(detector.validateLanguageCode("x"), false);
    });
  });

  suite("Language Detection from Project", () => {
    test("detects available languages in folder-based structure", () => {
      // Create multiple language folders
      const localesDir = path.join(tempDir, "locales");
      const languages = ["en", "fr", "de", "zh-Hans-CN"];

      for (const lang of languages) {
        const langDir = path.join(localesDir, lang);
        fs.mkdirSync(langDir, { recursive: true });
        fs.writeFileSync(path.join(langDir, "common.json"), "{}");
      }

      const sourceFile = path.join(localesDir, "en", "common.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      assert.deepStrictEqual(
        detectedLanguages.sort(),
        ["fr", "de", "zh-Hans-CN"].sort()
      );
    });

    test("detects available languages in file-based structure", () => {
      // Create multiple language files
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const languages = ["en", "fr", "de", "ja"];

      for (const lang of languages) {
        fs.writeFileSync(path.join(i18nDir, `${lang}.json`), "{}");
      }

      const sourceFile = path.join(i18nDir, "en.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      assert.deepStrictEqual(
        detectedLanguages.sort(),
        ["fr", "de", "ja"].sort()
      );
    });

    test("returns empty array for unknown structure", () => {
      const translationsDir = path.join(tempDir, "translations");
      fs.mkdirSync(translationsDir, { recursive: true });
      const sourceFile = path.join(translationsDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 0);
    });

    test("handles case-insensitive language detection", () => {
      // Create files with mixed case language codes
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });

      fs.writeFileSync(path.join(i18nDir, "EN.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "RU.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "Fr.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "de.json"), "{}");

      const sourceFile = path.join(i18nDir, "EN.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      // Should preserve original case and exclude source language
      assert.deepStrictEqual(
        detectedLanguages.sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        ),
        ["de", "Fr", "RU"].sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
      );
    });
  });
});
