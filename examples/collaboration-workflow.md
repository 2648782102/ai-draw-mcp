# Human ↔ AI collaboration walkthrough

This walkthrough uses natural-language prompts in an MCP-capable IDE. It does not modify the example project automatically: a human must approve a proposal and give the AI a one-time confirmation code.

## 1. AI scans and visualizes the project

```text
请用 scan_project 扫描当前项目，生成项目结构图，并打开协作面板。
```

The AI should call `scan_project`, then the panel shows the structure graph. Use `get_visual_context` in the next AI turn to read the graph, pending messages, and annotations.

## 2. Human edits the graph and explains intent

In the panel, open `💬 协作`:

- Rename a node label or change its kind in the node editor, then click `保存图形`.
- Add an annotation such as `把 README 改成中文，补充协作流程`.
- Reply inside the annotation thread, or resolve/reopen it. The panel shows whose turn is next (`等待 AI 回复` / `等待人回复`).
- Send a chat message such as `请根据我的批注提出修改方案，但不要直接改文件`.

## 3. AI reads context and replies in the panel

```text
调用 get_visual_context 读取我刚才的批注线程、annotationThreads.nextActor 和消息；用 reply_to_visual_context 在面板里回信、内联回复相关批注，并标记这些消息和批注已处理。
```

The reply appears in the collaboration chat, the node-linked annotation thread, and the compact activity timeline. The message and annotation are marked as answered/resolved, so the next turn has a clean inbox.

## 4. AI creates a proposal, not a direct edit

```text
请只创建 create_visual_proposal 提案：更新 README.md，加入中文说明。不要写文件，等我批准。
```

The proposal card shows a per-file diff. Expand `查看逐行差异` to inspect what will change. The proposal stores a SHA-256 content hash; the approval grant is bound to that exact content.

## 5. Human approves and gives the confirmation code

Click `批准`. The panel copies a block like:

```text
proposal_id: proposal_...
approval_id: approval_...
approval_grant: ...
approval_expires_at: 2026-...
```

This step does **not** write project files. Paste the block into the AI chat:

```text
我已批准。请用这些确认号调用 apply_visual_proposal 应用提案；如果凭据过期或内容哈希不匹配，请停止并告诉我。
```

## 6. Verify the loop

After the AI applies the proposal, ask it to call `scan_project` again. The refreshed graph and the changed file now reflect the same intent.

## Safety notes

- Never put secrets, `.env` values, or absolute paths outside the workspace into proposals.
- Path escapes, deletion, lockfiles, `.git`, `node_modules`, `dist`, and other protected targets are rejected.
- A failed multi-file write rolls back files already written in that proposal.
- The one-time grant expires after 10 minutes and cannot be replayed.
