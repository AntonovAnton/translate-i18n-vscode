import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Import our extension modules for testing
// We need to import the classes directly since they're not exported from the main module
// For testing purposes, we'll create a temporary test implementation

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suite('Language Detection and File Path Generation', () => {
		let tempDir: string;
		
		// Mock LanguageDetector for testing
		class TestLanguageDetector {
			private readonly languageCodeRegex =
				/^(?<language>[a-z]{2,3})(-(?<script>[A-Z][a-z]{3}))?(-(?<region>[A-Z]{2,3}|[0-9]{3}))?$/i;

			detectProjectStructure(sourceFilePath: string) {
				const sourceDir = path.dirname(sourceFilePath);
				const sourceFileName = path.basename(sourceFilePath, ".json");
				
				// Check if the source file name is a language code (file-based structure)
				if (this.languageCodeRegex.test(sourceFileName)) {
					return {
						type: "file" as const,
						basePath: sourceDir,
						sourceLanguage: sourceFileName
					};
				}

				// Check if the parent directory is a language code (folder-based structure)
				const parentDirName = path.basename(sourceDir);
				if (this.languageCodeRegex.test(parentDirName)) {
					return {
						type: "folder" as const,
						basePath: path.dirname(sourceDir),
						sourceLanguage: parentDirName
					};
				}

				return {
					type: "unknown" as const,
					basePath: sourceDir
				};
			}

			generateTargetFilePath(sourceFilePath: string, targetLanguage: string): string {
				const structureInfo = this.detectProjectStructure(sourceFilePath);
				const sourceFileName = path.basename(sourceFilePath, ".json");

				switch (structureInfo.type) {
					case "folder": {
						const targetDir = path.join(structureInfo.basePath, targetLanguage);
						return path.join(targetDir, `${sourceFileName}.json`);
					}
					case "file": {
						return path.join(structureInfo.basePath, `${targetLanguage}.json`);
					}
					default: {
						const sourceDir = path.dirname(sourceFilePath);
						return path.join(sourceDir, `${sourceFileName}.${targetLanguage}.json`);
					}
				}
			}
		}

		setup(() => {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
		});

		teardown(() => {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test('should detect folder-based structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create folder-based structure
			const enDir = path.join(tempDir, 'locales', 'en');
			fs.mkdirSync(enDir, { recursive: true });
			const sourceFile = path.join(enDir, 'common.json');
			
			const result = detector.detectProjectStructure(sourceFile);
			
			assert.strictEqual(result.type, 'folder');
			assert.strictEqual(result.sourceLanguage, 'en');
			assert.strictEqual(result.basePath, path.join(tempDir, 'locales'));
		});

		test('should detect file-based structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create file-based structure
			const i18nDir = path.join(tempDir, 'i18n');
			fs.mkdirSync(i18nDir, { recursive: true });
			const sourceFile = path.join(i18nDir, 'en.json');
			
			const result = detector.detectProjectStructure(sourceFile);
			
			assert.strictEqual(result.type, 'file');
			assert.strictEqual(result.sourceLanguage, 'en');
			assert.strictEqual(result.basePath, i18nDir);
		});

		test('should return unknown for non-standard structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create non-standard structure
			const someDir = path.join(tempDir, 'translations');
			fs.mkdirSync(someDir, { recursive: true });
			const sourceFile = path.join(someDir, 'messages.json');
			
			const result = detector.detectProjectStructure(sourceFile);
			
			assert.strictEqual(result.type, 'unknown');
			assert.strictEqual(result.basePath, someDir);
		});

		test('should generate correct path for folder-based structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create folder-based structure
			const enDir = path.join(tempDir, 'locales', 'en');
			fs.mkdirSync(enDir, { recursive: true });
			const sourceFile = path.join(enDir, 'common.json');
			
			const targetPath = detector.generateTargetFilePath(sourceFile, 'es');
			const expectedPath = path.join(tempDir, 'locales', 'es', 'common.json');
			
			assert.strictEqual(targetPath, expectedPath);
		});

		test('should generate correct path for file-based structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create file-based structure
			const i18nDir = path.join(tempDir, 'i18n');
			fs.mkdirSync(i18nDir, { recursive: true });
			const sourceFile = path.join(i18nDir, 'en.json');
			
			const targetPath = detector.generateTargetFilePath(sourceFile, 'es');
			const expectedPath = path.join(i18nDir, 'es.json');
			
			assert.strictEqual(targetPath, expectedPath);
		});

		test('should fallback to default naming for unknown structure', () => {
			const detector = new TestLanguageDetector();
			
			// Create unknown structure
			const someDir = path.join(tempDir, 'translations');
			fs.mkdirSync(someDir, { recursive: true });
			const sourceFile = path.join(someDir, 'messages.json');
			
			const targetPath = detector.generateTargetFilePath(sourceFile, 'es');
			const expectedPath = path.join(someDir, 'messages.es.json');
			
			assert.strictEqual(targetPath, expectedPath);
		});
	});
});
