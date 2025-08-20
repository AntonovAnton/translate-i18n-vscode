import * as vscode from "vscode";

// Create output channel for detailed logging
const outputChannel = vscode.window.createOutputChannel("Translate i18n JSON");

/**
 * Handles errors with both user notification and detailed logging
 */
export function showAndLogError(
  userMessage: string,
  error: unknown,
  context?: string
) {
  // Show user-friendly message
  vscode.window.showErrorMessage(userMessage);

  // Log detailed error information
  const timestamp = new Date().toISOString();
  const stackTrace = error instanceof Error ? error.stack : "";

  outputChannel.appendLine(`[${timestamp}] ERROR: ${userMessage}`);
  if (context) {
    outputChannel.appendLine(`Context: ${context}`);
  }
  if (stackTrace) {
    outputChannel.appendLine(`Stack trace: ${stackTrace}`);
  }
  outputChannel.appendLine("---");

  // Also log to console for development
  console.error(`[Translate i18n JSON] ${userMessage}:`, error);
}

/**
 * Logs an informational message with timestamp
 */
export function logInfo(message: string) {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Logs a warning message with timestamp
 */
export function logWarning(message: string) {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] WARNING: ${message}`);
}
