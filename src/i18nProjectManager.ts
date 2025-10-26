import * as path from "path";
import * as fs from "fs";

export enum ProjectStructureType {
  FolderBased = "folder",
  FileBased = "file",
  Unknown = "unknown",
}

export interface ProjectStructureInfo {
  type: ProjectStructureType;
  basePath: string;
  sourceLanguage?: string;
}

export class I18nProjectManager {
  private readonly languageCodeRegex =
    /^(?<language>[a-z]{2,3})([-|_](?<script>[A-Z][a-z]{3}))?([-|_](?<region>[A-Z]{2,3}|[0-9]{3}))?$/i;

  // ARB files use underscores instead of hyphens
  private readonly arbLanguageCodeRegex =
    /^(?<language>[a-z]{2,3})(_(?<script>[A-Z][a-z]{3}))?(_(?<region>[A-Z]{2,3}|[0-9]{3}))?$/;

  detectLanguagesFromProject(sourceFilePath: string): string[] {
    const languageCodes = new Set<string>();
    const isArbFile = sourceFilePath.endsWith(".arb");

    // Detect the source language to exclude it
    const structureInfo = this.detectProjectStructure(sourceFilePath);
    const sourceLanguage = structureInfo.sourceLanguage;

    // Start scanning from the appropriate directory
    if (structureInfo.type === ProjectStructureType.FolderBased) {
      // For folder-based, scan the base path for language directories
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const regex = isArbFile
              ? this.arbLanguageCodeRegex
              : this.languageCodeRegex;
            if (regex.test(entry.name)) {
              languageCodes.add(entry.name);
            }
          }
        }
      } catch (error) {
        console.warn("Error scanning for language directories:", error);
      }
    } else if (structureInfo.type === ProjectStructureType.FileBased) {
      // For file-based, scan the base path for language files
      const fileExtension = isArbFile ? ".arb" : ".json";
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith(fileExtension)) {
            const fileName = path.basename(entry.name, fileExtension);
            const languageCode = this.extractLanguageCodeFromFileName(
              fileName,
              isArbFile
            );
            if (languageCode) {
              languageCodes.add(languageCode);
            }
          }
        }
      } catch (error) {
        console.warn("Error scanning for language files:", error);
      }
    }

    // Remove source language from the set if it exists
    if (sourceLanguage) {
      languageCodes.delete(sourceLanguage);
    }

    // Return sorted list of unique language codes
    return Array.from(languageCodes).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  generateTargetFilePath(
    sourceFilePath: string,
    targetLanguage: string
  ): string {
    const structureInfo = this.detectProjectStructure(sourceFilePath);
    const fileExtension = path.extname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath, fileExtension);
    const isArbFile = fileExtension === ".arb";
    const languageCode = isArbFile
      ? targetLanguage.replace(/-/g, "_")
      : targetLanguage;

    switch (structureInfo.type) {
      case ProjectStructureType.FolderBased: {
        // Create target language folder if it doesn't exist
        const targetDir = path.join(structureInfo.basePath, languageCode);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Use the same file name as source
        const targetFilePath = path.join(
          targetDir,
          `${sourceFileName}${fileExtension}`
        );
        return targetFilePath;
      }

      case ProjectStructureType.FileBased: {
        if (isArbFile) {
          // For ARB files, extract prefix and append target language
          // app_en_US.arb -> app_es.arb
          const sourceLanguage = structureInfo.sourceLanguage;
          let prefix = "";

          if (sourceLanguage) {
            const langIndex = sourceFileName.indexOf(sourceLanguage);
            if (langIndex > 0) {
              prefix = sourceFileName.substring(0, langIndex);
            }
          }

          const targetFilePath = path.join(
            structureInfo.basePath,
            `${prefix}${languageCode}${fileExtension}`
          );
          return targetFilePath;
        } else {
          // Save in the same directory with target language as filename
          const targetFilePath = path.join(
            structureInfo.basePath,
            `${languageCode}${fileExtension}`
          );
          return targetFilePath;
        }
      }

      default: {
        // Unknown structure - fallback to current behavior
        const sourceDir = path.dirname(sourceFilePath);
        const targetFilePath = path.join(
          sourceDir,
          `${sourceFileName}.${languageCode}${fileExtension}`
        );
        return targetFilePath;
      }
    }
  }

  getUniqueFilePath(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    let counter = 1;
    let uniquePath: string;

    do {
      uniquePath = path.join(dir, `${baseName} (${counter})${ext}`);
      counter++;
    } while (fs.existsSync(uniquePath));

    return uniquePath;
  }

  normalizeLanguageCode(code: string): string {
    const match = code.match(this.languageCodeRegex);
    if (!match?.groups) {
      return code; // Return as-is if it doesn't match the pattern
    }

    const { language, script, region } = match.groups;
    let normalized = language.toLowerCase();

    if (script) {
      // Script codes: first letter uppercase, rest lowercase
      normalized +=
        "-" + script.charAt(0).toUpperCase() + script.slice(1).toLowerCase();
    }

    if (region) {
      // Region codes: all uppercase
      normalized += "-" + region.toUpperCase();
    }

    return normalized;
  }

  validateLanguageCode(code: string): boolean {
    return !!code && this.languageCodeRegex.test(code);
  }

  private detectProjectStructure(sourceFilePath: string): ProjectStructureInfo {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileExt = path.extname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath, sourceFileExt);
    const isArbFile = sourceFileExt === ".arb";

    // Check if the parent directory name is a language code (folder-based structure)
    const parentDirName = path.basename(sourceDir);
    const regex = isArbFile
      ? this.arbLanguageCodeRegex
      : this.languageCodeRegex;
    if (regex.test(parentDirName)) {
      return {
        type: ProjectStructureType.FolderBased,
        basePath: path.dirname(sourceDir),
        sourceLanguage: parentDirName,
      };
    }

    // Check if the source file name is a language code (file-based structure)
    const languageCode = this.extractLanguageCodeFromFileName(
      sourceFileName,
      isArbFile
    );
    if (languageCode) {
      return {
        type: ProjectStructureType.FileBased,
        basePath: sourceDir,
        sourceLanguage: languageCode,
      };
    }

    // Unknown structure
    return {
      type: ProjectStructureType.Unknown,
      basePath: sourceDir,
    };
  }

  /**
   * Extracts language code from file name, handling custom prefixes for ARB files
   * ARB files: app_en_US.arb -> en_US, my_app_fr.arb -> fr
   * JSON files: en-US.json -> en-US
   */
  private extractLanguageCodeFromFileName(
    fileName: string,
    isArbFile: boolean
  ): string | null {
    if (isArbFile) {
      // For ARB files, try to extract language code after potential prefix
      // Pattern: [prefix_]language[_script][_region]
      const parts = fileName.split("_");

      // Try combinations from right to left to find valid language code
      for (let i = 0; i < parts.length; i++) {
        const potentialCode = parts.slice(i).join("_");
        if (this.arbLanguageCodeRegex.test(potentialCode)) {
          return potentialCode;
        }
      }
      return null;
    } else {
      // For JSON files, the entire filename should be the language code
      return this.languageCodeRegex.test(fileName) ? fileName : null;
    }
  }
}
