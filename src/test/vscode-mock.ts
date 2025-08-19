// Mock VS Code APIs for testing
export const vscode = {
  window: {
    showInformationMessage: () => Promise.resolve(),
    showErrorMessage: () => Promise.resolve(),
    showInputBox: () => Promise.resolve(''),
    showQuickPick: () => Promise.resolve(),
    createQuickPick: () => ({
      items: [],
      onDidChangeSelection: () => ({ dispose: () => {} }),
      onDidHide: () => ({ dispose: () => {} }),
      show: () => {},
      hide: () => {},
      dispose: () => {}
    })
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve()
  },
  workspace: {
    getConfiguration: () => ({
      get: () => undefined,
      update: () => Promise.resolve()
    }),
    workspaceFolders: []
  },
  env: {
    openExternal: () => Promise.resolve()
  },
  Uri: {
    parse: (uri: string) => ({ toString: () => uri })
  },
  ExtensionContext: class {
    globalState = {
      get: () => false,
      update: () => Promise.resolve()
    };
    secrets = {
      get: () => Promise.resolve(undefined),
      store: () => Promise.resolve(),
      delete: () => Promise.resolve()
    };
  }
};
