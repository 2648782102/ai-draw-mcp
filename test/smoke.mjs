/**
 * Smoke test — uses the MCP SDK client to talk to the server via stdio.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, PREVIEW_PORT: "3398", LOG_LEVEL: "error" },
});

const client = new Client({ name: "smoke-test", version: "1.0.0" });

try {
  await client.connect(transport);
  console.log("✅ Connected to MCP server\n");

  const { tools } = await client.listTools();
  console.log(`📦 ${tools.length} tools registered:\n`);
  for (const t of tools) {
    console.log(`  - ${t.name}`);
    console.log(`    ${t.description?.slice(0, 80)}`);
  }

  console.log("\n--- Testing render_diagram ---");
  const result = await client.callTool({
    name: "render_diagram",
    arguments: {
      title: "Smoke Test",
      mermaid_code: "graph TD\n  A[Start] --> B[End]",
    },
  });
  for (const c of result.content) {
    if (c.type === "text") console.log(c.text);
  }

  console.log("\n✅ All smoke tests passed!");
} catch (err) {
  console.error("❌ Test failed:", err);
  process.exit(1);
} finally {
  await client.close();
  process.exit(0);
}
