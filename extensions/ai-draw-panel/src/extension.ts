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

function openInSimpleBrowser(uri: vscode.Uri): Thenable<unknown> {
  // Cursor / VS Code both accept a string URL for simpleBrowser.show
  return vscode.commands.executeCommand("simpleBrowser.show", uri.toString());
}

export function activate(context: vscode.ExtensionContext): void {
  // vscode://2648782102.ai-draw-panel/open?url=http%3A%2F%2F127.0.0.1%3A3399%2Fdiagram%2F...
  // 使 MCP 返回中的可点击链在编辑器内打开 Simple Browser（勿依赖外置浏览器）
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        const p = (uri.path || "").replace(/^\//, "");
        if (p !== "open") return;
        let raw: string | undefined;
        for (const part of (uri.query || "").split("&")) {
          if (part.startsWith("url=")) {
            raw = part.slice(4);
            break;
          }
        }
        if (!raw) return;
        let target: string;
        try {
          target = decodeURIComponent(raw);
        } catch {
          target = raw;
        }
        const u = vscode.Uri.parse(target);
        return (async () => {
          try {
            await openInSimpleBrowser(u);
          } catch {
            await vscode.env.openExternal(u);
            void vscode.window.showWarningMessage("Simple Browser 不可用，已用系统浏览器打开。");
          }
        })();
      },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ai-draw.openPanel", async () => {
      const uri = panelUri();
      try {
        await openInSimpleBrowser(uri);
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
        await openInSimpleBrowser(uri);
      } catch {
        await vscode.env.openExternal(uri);
      }
    })
  );
}

export function deactivate(): void {}
