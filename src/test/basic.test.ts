import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Simple Extension Test', () => {
	test('basic functionality', () => {
		assert.strictEqual(1 + 1, 2);
		vscode.window.showInformationMessage('Test passed!');
	});
});
