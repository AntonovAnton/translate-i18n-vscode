import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  // Basic extension tests can be added here
  test("extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("l10n-dev.translate-i18n"));
  });
});
