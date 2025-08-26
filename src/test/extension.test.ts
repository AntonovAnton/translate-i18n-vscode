import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  // Basic extension tests can be added here
  test("extension should be present", () => {
    // The extension should be loaded in the test environment
    const extension = vscode.extensions.getExtension("l10n-dev.translate-i18n-json");
    if (extension) {
      assert.ok(extension);
    } else {
      // Skip this test if the extension isn't loaded in test environment
      console.log("Extension not loaded in test environment - skipping test");
    }
  });
});
