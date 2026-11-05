import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs/promises";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, PREVIEW_PORT: "3433", LOG_LEVEL: "error" },
});
const client = new Client({ name: "ai-draw-example", version: "1.0.0" });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(`Registered tools: ${tools.length}`);
  const mermaidCode = await fs.readFile("examples/mermaid/login-flow.mmd", "utf8");
  const result = await client.callTool({
    name: "render_diagram",
    arguments: { title: "Example login flow", mermaid_code: mermaidCode },
  });
  for (const item of result.content) if (item.type === "text") console.log(item.text);
} finally {
  await client.close();
}
