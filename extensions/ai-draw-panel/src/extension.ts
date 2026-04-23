import * as vscode from "vscode";

function panelUri(): vscode.Uri {
  const cfg = vscode.workspace.getConfiguration("aiDraw");
  const host = cfg.get<string>("previewHost", "127.0.0.1");
  const port = cfg.get<number>("previewPort", 3399);
  return vscode.Uri.parse(`http://${host}:${port}/`);
}

function diagramUri(id: string): vscode.Uri {
  const cfg = vscode.workspace.getConfiguration("aiDraw");
  const host = cfg.get<string>("previewHost", "127.0.0.1");
  const port = cfg.get<number>("previewPort", 3399);
  return vscode.Uri.parse(`http://${host}:${port}/diagram/${encodeURIComponent(id)}`);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("ai-draw.openPanel", async () => {
      const uri = panelUri();
      try {
        await vscode.commands.executeCommand("simpleBrowser.show", uri);
      } catch {
        await vscode.env.openExternal(uri);
        void vscode.window.showWarningMessage(
          "未找到 Simple Browser 命令，已用系统浏览器打开。请使用较新版本的 VS Code / Cursor。"
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ai-draw.openDiagram", async () => {
      const id = await vscode.window.showInputBox({
        prompt: "图表 ID（来自 MCP 返回的 ID: 行）",
        placeHolder: "例如 HHSQB3nt-X",
      });
      if (!id?.trim()) return;
      const uri = diagramUri(id.trim());
      try {
        await vscode.commands.executeCommand("simpleBrowser.show", uri);
      } catch {
        await vscode.env.openExternal(uri);
      }
    })
  );
}

export function deactivate(): void {}
