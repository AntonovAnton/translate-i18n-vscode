import { Language } from "./../translationService";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Import the I18nProjectManager and related types
import {
  I18nProjectManager,
  ProjectStructureType,
} from "../i18nProjectManager";

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

      let targetPath = detector.generateTargetFilePath(sourceFile, "fr");
      targetPath = detector.getUniqueFilePath(targetPath);

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

  suite("ARB File Support", () => {
    suite("ARB Language Code Extraction", () => {
      test("extracts language code from ARB file with prefix (app_en_US.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, ProjectStructureType.FileBased);
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });

      test("extracts language code from ARB file with custom prefix (my_app_fr.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "my_app_fr.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, ProjectStructureType.FileBased);
        assert.strictEqual(structure.sourceLanguage, "fr");
      });

      test("extracts complex language code from ARB file (app_zh_Hans_CN.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_zh_Hans_CN.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, ProjectStructureType.FileBased);
        assert.strictEqual(structure.sourceLanguage, "zh_Hans_CN");
      });

      test("handles ARB file without prefix (en_US.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, ProjectStructureType.FileBased);
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });
    });

    suite("ARB Target File Path Generation", () => {
      test("generates ARB target path preserving prefix (app_en_US.arb -> app_es.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es");

        const expectedPath = path.join(i18nDir, "app_es.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path with custom prefix (my_app_fr.arb -> my_app_de.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "my_app_fr.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "de");

        const expectedPath = path.join(i18nDir, "my_app_de.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path with complex target code (app_en.arb -> app_zh_Hans_CN.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(
          sourceFile,
          "zh_Hans_CN"
        );

        const expectedPath = path.join(i18nDir, "app_zh_Hans_CN.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path without prefix (en.arb -> fr.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        const expectedPath = path.join(i18nDir, "fr.arb");
        assert.strictEqual(targetPath, expectedPath);
      });
    });

    suite("ARB Language Detection", () => {
      test("detects ARB languages in file-based structure", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create ARB files with prefix
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_fr.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_de.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.deepStrictEqual(detectedLanguages.sort(), ["de", "es", "fr"]);
      });

      test("detects ARB languages with underscores", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create ARB files with complex language codes
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es_ES.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_fr_FR.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_zh_Hans_CN.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.ok(detectedLanguages.includes("es_ES"));
        assert.ok(detectedLanguages.includes("fr_FR"));
        assert.ok(detectedLanguages.includes("zh_Hans_CN"));
      });

      test("excludes JSON files when detecting ARB languages", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create mixed files
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "es.json"), "{}"); // Should be ignored
        fs.writeFileSync(path.join(i18nDir, "fr.json"), "{}"); // Should be ignored

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 1);
        assert.deepStrictEqual(detectedLanguages, ["es"]);
      });
    });

    suite("ARB Language Code Normalization", () => {
      test("preserves case for ARB script codes", () => {
        const normalized = detector.normalizeLanguageCode("zh_Hans_CN");
        assert.strictEqual(normalized, "zh-Hans-CN");
      });
    });

    suite("ARB Language Code Validation", () => {
      test("validates correct ARB language codes", () => {
        assert.strictEqual(detector.validateLanguageCode("en_US"), true);
        assert.strictEqual(detector.validateLanguageCode("fr"), true);
        assert.strictEqual(detector.validateLanguageCode("zh_Hans_CN"), true);
      });

      test("rejects invalid language codes", () => {
        assert.strictEqual(detector.validateLanguageCode("invalid"), false);
        assert.strictEqual(detector.validateLanguageCode("123"), false);
        assert.strictEqual(detector.validateLanguageCode(""), false);
      });
    });

    suite("ARB Folder-Based Structure", () => {
      test("detects ARB folder-based structure (lib/l10n/en_US/app.arb)", () => {
        const localesDir = path.join(tempDir, "lib", "l10n", "en_US");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, ProjectStructureType.FolderBased);
        assert.strictEqual(
          structure.basePath,
          path.join(tempDir, "lib", "l10n")
        );
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });

      test("generates ARB folder-based target path", () => {
        const localesDir = path.join(tempDir, "lib", "l10n", "en_US");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es");

        const expectedPath = path.join(tempDir, "lib", "l10n", "es", "app.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("detects ARB languages in folder-based structure", () => {
        const l10nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(l10nDir, { recursive: true });

        // Create folder-based ARB structure
        const enDir = path.join(l10nDir, "en_US");
        const esDir = path.join(l10nDir, "es");
        const frDir = path.join(l10nDir, "fr_FR");

        fs.mkdirSync(enDir, { recursive: true });
        fs.mkdirSync(esDir, { recursive: true });
        fs.mkdirSync(frDir, { recursive: true });

        const sourceFile = path.join(enDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(esDir, "app.arb"), "{}");
        fs.writeFileSync(path.join(frDir, "app.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 2);
        assert.ok(detectedLanguages.includes("es"));
        assert.ok(detectedLanguages.includes("fr_FR"));
      });
    });
  });
});
