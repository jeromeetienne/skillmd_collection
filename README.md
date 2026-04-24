# skillmd_collection

A monorepo of Claude Code agent skills and CLI tools. Each package ships a `SKILL.md` that AI agents can install and invoke, plus a standalone CLI for humans and shell workflows.

## Packages

### [a11y_parse](packages/a11y_parse/)

A TypeScript library for parsing and querying accessibility trees using a CSS-inspired selector syntax. It is the query layer used by `fastbrowser_cli`.

**Features:**
- Parse indentation-based accessibility tree text into a typed tree structure
- Query nodes with CSS-like selectors — role, UID (`#uid`), attributes (`[name="…"]`), descendant/child combinators, union
- Walk, filter, and build pruned ancestor trees for result context

---

### [fastbrowser_cli](packages/fastbrowser_cli/)

A lightweight CLI for controlling a live Chrome browser from the shell or an AI agent. Designed for minimal latency: a long-running daemon holds the browser connection and each command is a single HTTP call.

**Architecture:**
```
fastbrowser_cli ──HTTP──▶ fastbrowser_httpd ──MCP/stdio──▶ fastbrowser_mcp ──▶ Chrome
```

**Features:**
- Navigate pages, click elements, fill forms, press keys
- Query the accessibility tree with CSS-like selectors (`query_selectors`, `take_snapshot`)
- Manage the daemon (`server start / stop / status`)
- Ships a `SKILL.md` so Claude Code agents can install and use it directly

---

### [business_analyst_cli](packages/business_analyst_cli/)

A CLI for structured business modeling, trend analysis, and strategic planning. Three composable commands form a pipeline — model → analyze → plan — each backed by a dedicated Claude Code skill.

**Commands:**

| Command | Role | Description |
|---------|------|-------------|
| `modeler` | Write | Create, update, simulate business models (dimensions, metrics, assumptions, data) |
| `analyst` | Read-only | Trend analysis, period-over-period %, anomaly detection |
| `planner` | Read-only | Strategic recommendations, milestone roadmaps, scenario comparison |

