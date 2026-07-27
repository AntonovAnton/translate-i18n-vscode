import * as vscode from "vscode";
import { ILogger } from "ai-l10n-sdk";

import { ApiKeyManager } from "./apiKeyManager";
import { CONFIG, MCP } from "./constants";

/**
 * Handle returned by {@link registerMcpServerProvider}.
 * `refresh` asks VS Code to re-read the server list (e.g. after the API Key or
 * the enableMcpServer setting changed).
 */
export interface McpServerProviderRegistration {
  disposable: vscode.Disposable;
  refresh: () => void;
}

/**
 * Registers the bundled ai-l10n MCP server with VS Code so Chat can use it
 * without any manual mcp.json configuration.
 *
 * The server is a plain Node script shipped inside the extension
 * (dist/mcp-server.js) and is started with the editor's own Node runtime, so
 * users don't need Node or npx on their PATH. The API Key is never written to
 * disk — it is injected as an environment variable when the server starts.
 */
export function registerMcpServerProvider(
  context: vscode.ExtensionContext,
  apiKeyManager: ApiKeyManager,
  logger: ILogger,
): McpServerProviderRegistration {
  const didChangeEmitter = new vscode.EventEmitter<void>();

  const provider: vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> =
    {
      onDidChangeMcpServerDefinitions: didChangeEmitter.event,

      // Called eagerly by the editor — must not require user interaction.
      provideMcpServerDefinitions: async () => {
        if (!isMcpServerEnabled()) {
          return [];
        }

        return [
          new vscode.McpStdioServerDefinition(
            MCP.SERVER_LABEL,
            // The editor's Node. On desktop this is the Code executable, which
            // behaves as Node when ELECTRON_RUN_AS_NODE is set.
            process.execPath,
            [context.asAbsolutePath(MCP.SERVER_SCRIPT)],
            { ELECTRON_RUN_AS_NODE: "1" },
            await buildVersion(context, apiKeyManager),
          ),
        ];
      },

      // Called when the server is actually started. The key is injected here rather
      // than in provideMcpServerDefinitions so it never reaches the definitions the
      // editor caches.
      resolveMcpServerDefinition: async (
        server: vscode.McpStdioServerDefinition,
      ) => {
        const apiKey = await apiKeyManager.getApiKey();

        if (apiKey) {
          server.env = { ...server.env, [MCP.API_KEY_ENV]: apiKey };
        } else {
          // Not an error: the server resolves the key itself from ~/.ai-l10n/config.json,
          // and its l10n_set_api_key tool lets the agent configure one. Blocking the
          // start here would break users who already set a key via the CLI or npm package.
          logger.logInfo(
            "No API Key in VS Code secret storage — the MCP server will use its own stored key if present.",
          );
        }

        return server;
      },
    };

  let registration: vscode.Disposable | undefined;
  try {
    registration = vscode.lm.registerMcpServerDefinitionProvider(
      MCP.PROVIDER_ID,
      provider,
    );
  } catch (error) {
    // Older hosts without the MCP API must not break activation.
    logger.logWarning(
      "MCP server definition provider is not available in this editor",
      error as Error,
    );
  }

  const disposable = new vscode.Disposable(() => {
    registration?.dispose();
    didChangeEmitter.dispose();
  });

  return {
    disposable,
    refresh: () => didChangeEmitter.fire(),
  };
}

/**
 * Identifies this server to the editor. The editor restarts a running server when
 * this changes, so key availability is folded in: setting a key after the server
 * started keyless makes it pick the key up instead of staying broken until a manual
 * restart. Only whether a key exists is exposed here — never the key itself, which
 * is injected in resolveMcpServerDefinition and kept out of cached definitions.
 */
async function buildVersion(
  context: vscode.ExtensionContext,
  apiKeyManager: ApiKeyManager,
): Promise<string> {
  const version = context.extension.packageJSON.version as string;
  const apiKey = await apiKeyManager.getApiKey();

  return apiKey ? version : `${version}+no-api-key`;
}

function isMcpServerEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG.SECTION)
    .get<boolean>(CONFIG.KEYS.ENABLE_MCP_SERVER, true);
}
