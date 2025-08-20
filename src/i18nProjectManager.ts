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
    /^(?<language>[a-z]{2,3})(-(?<script>[A-Z][a-z]{3}))?(-(?<region>[A-Z]{2,3}|[0-9]{3}))?$/i;

  detectLanguagesFromProject(sourceFilePath: string): string[] {
    const languageCodes = new Set<string>();

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
          if (entry.isDirectory() && this.languageCodeRegex.test(entry.name)) {
            languageCodes.add(entry.name);
          }
        }
      } catch (error) {
        console.warn("Error scanning for language directories:", error);
      }
    } else if (structureInfo.type === ProjectStructureType.FileBased) {
      // For file-based, scan the base path for language files
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith(".json")) {
            const fileName = path.basename(entry.name, ".json");
            if (this.languageCodeRegex.test(fileName)) {
              languageCodes.add(fileName);
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
    const sourceFileName = path.basename(sourceFilePath, ".json");

    switch (structureInfo.type) {
      case ProjectStructureType.FolderBased: {
        // Create target language folder if it doesn't exist
        const targetDir = path.join(structureInfo.basePath, targetLanguage);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Use the same file name as source
        const targetFilePath = path.join(targetDir, `${sourceFileName}.json`);
        return this.getUniqueFilePath(targetFilePath);
      }

      case ProjectStructureType.FileBased: {
        // Save in the same directory with target language as filename
        const targetFilePath = path.join(
          structureInfo.basePath,
          `${targetLanguage}.json`
        );
        return this.getUniqueFilePath(targetFilePath);
      }

      default: {
        // Unknown structure - fallback to current behavior
        const sourceDir = path.dirname(sourceFilePath);
        const targetFilePath = path.join(
          sourceDir,
          `${sourceFileName}.${targetLanguage}.json`
        );
        return this.getUniqueFilePath(targetFilePath);
      }
    }
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
    const sourceFileName = path.basename(sourceFilePath, ".json");

    // Check if the parent directory name is a language code (folder-based structure)
    const parentDirName = path.basename(sourceDir);
    if (this.languageCodeRegex.test(parentDirName)) {
      return {
        type: ProjectStructureType.FolderBased,
        basePath: path.dirname(sourceDir),
        sourceLanguage: parentDirName,
      };
    }

    // Check if the source file name is a language code (file-based structure)
    if (this.languageCodeRegex.test(sourceFileName)) {
      return {
        type: ProjectStructureType.FileBased,
        basePath: sourceDir,
        sourceLanguage: sourceFileName,
      };
    }

    // Unknown structure
    return {
      type: ProjectStructureType.Unknown,
      basePath: sourceDir,
    };
  }

  private getUniqueFilePath(filePath: string): string {
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
}
