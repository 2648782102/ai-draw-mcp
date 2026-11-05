import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildCapabilities } from "../domain/capabilities.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";
import { SERVER_VERSION } from "../infra/version.js";

export function registerGetCapabilities(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_capabilities",
    "一次读取 AI Draw MCP 的 version 1 CAPABILITIES_JSON：全部 MCP 工具、机器可读 JSON 契约、八步工作流的就绪状态、下一步安全动作、唯一项目写入工具与固定安全边界。" +
    " 适合新 agent 接手会话或客户端自检工具版本；本工具只读，不调用其他工具、不读项目文件、不改会话、不创建提案、不签发凭据。需要完整会话原文时用 get_visual_context，需要顺序步骤与阻塞原因时用 get_agent_workflow，准备写入仍须逐行 diff、人工批准与一次性确认号。",
    {},
    async () => {
      try {
        const capabilities = buildCapabilities(ctx.sessions.getSnapshot(), SERVER_VERSION);
        return {
          content: [{
            type: "text" as const,
            text: [
              `🧭 Capabilities · ${capabilities.serverVersion} · ${capabilities.toolCount} tools · read-only`,
              `Session ${capabilities.sessionId} · graphRevision ${capabilities.graphRevision} · next: ${capabilities.nextAction}`,
              ``,
              jsonLine({
                version: "1",
                serverVersion: capabilities.serverVersion,
                sessionId: capabilities.sessionId,
                tools: String(capabilities.toolCount),
                readOnly: "true",
              }),
              ``,
              "CAPABILITIES_JSON:",
              JSON.stringify(capabilities, null, 2),
              ``,
              "CAPABILITIES_JSON is descriptive only. It never invokes tools, opens project files, creates proposals, or authorizes project writes.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_capabilities", err);
      }
    },
  );
}
