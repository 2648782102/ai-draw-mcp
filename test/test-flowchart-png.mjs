import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, PREVIEW_PORT: "3396", LOG_LEVEL: "error" },
});

const client = new Client({ name: "png-test", version: "1.0.0" });

try {
  await client.connect(transport);

  const result = await client.callTool({
    name: "render_flowchart",
    arguments: {
      title: "用户登录流程",
      direction: "TD",
      nodes: [
        { id: "start", label: "用户访问登录页", shape: "stadium" },
        { id: "input", label: "输入账号密码", shape: "rect" },
        { id: "validate", label: "前端校验", shape: "diamond" },
        { id: "request", label: "发送登录请求", shape: "rect" },
        { id: "auth", label: "服务端验证", shape: "diamond" },
        { id: "token", label: "生成 JWT Token", shape: "rect" },
        { id: "store", label: "存储 Token", shape: "rect" },
        { id: "redirect", label: "跳转首页", shape: "stadium" },
        { id: "err1", label: "提示格式错误", shape: "round" },
        { id: "err2", label: "提示密码错误", shape: "round" },
      ],
      edges: [
        { from: "start", to: "input" },
        { from: "input", to: "validate" },
        { from: "validate", to: "request", label: "通过" },
        { from: "validate", to: "err1", label: "失败", style: "dashed" },
        { from: "err1", to: "input", style: "dotted" },
        { from: "request", to: "auth" },
        { from: "auth", to: "token", label: "通过" },
        { from: "auth", to: "err2", label: "失败", style: "dashed" },
        { from: "err2", to: "input", style: "dotted" },
        { from: "token", to: "store" },
        { from: "store", to: "redirect" },
      ],
      theme: "default",
      output_format: "png",
    },
  });

  for (const c of result.content) {
    if (c.type === "text") console.log(c.text);
    if (c.type === "image") {
      const buf = Buffer.from(c.data, "base64");
      fs.writeFileSync("output/login-flow.png", buf);
      console.log(`Image saved to output/login-flow.png (${buf.length} bytes)`);
    }
  }
} catch (err) {
  console.error("Failed:", err);
  process.exit(1);
} finally {
  await client.close();
  process.exit(0);
}
