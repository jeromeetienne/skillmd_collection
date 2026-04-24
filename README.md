# skillmd_collection

A monorepo of Claude Code agent skills and CLI tools. Each package ships a `SKILL.md` that AI agents can install and invoke, plus a standalone CLI for humans and shell workflows.

## Packages

| Package | Description |
|---------|-------------|
| [a11y_parse](packages/a11y_parse/README.md) | Accessibility tree parser and CSS-like query engine |
| [fastbrowser_cli](packages/fastbrowser_cli/README.md) | CLI daemon for controlling Chrome from shell or AI agents |
| [business_analyst_cli](packages/business_analyst_cli/README.md) | Business modeling, trend analysis, and strategic planning CLI |
| [bsky_client](packages/bsky_client/README.md) | Bluesky social network CLI (posts, replies, likes, search) |
| [perplexity_cli](packages/perplexity_cli/README.md) | Web search and deep research CLI via Perplexity AI |

### [a11y_parse](packages/a11y_parse/README.md)

A TypeScript library for parsing and querying accessibility trees using a CSS-inspired selector syntax. It is the query layer used by `fastbrowser_cli`.

**Features:**
- Parse indentation-based accessibility tree text into a typed tree structure
- Query nodes with CSS-like selectors — role, UID (`#uid`), attributes (`[name="…"]`), descendant/child combinators, union
- Walk, filter, and build pruned ancestor trees for result context

---

### [fastbrowser_cli](packages/fastbrowser_cli/README.md)

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

### [business_analyst_cli](packages/business_analyst_cli/README.md)

A CLI for structured business modeling, trend analysis, and strategic planning. Three composable commands form a pipeline — model → analyze → plan — each backed by a dedicated Claude Code skill.

**Commands:**

| Command | Role | Description |
|---------|------|-------------|
| `modeler` | Write | Create, update, simulate business models (dimensions, metrics, assumptions, data) |
| `analyst` | Read-only | Trend analysis, period-over-period %, anomaly detection |
| `planner` | Read-only | Strategic recommendations, milestone roadmaps, scenario comparison |

---

### [bsky_client](packages/bsky_client/README.md)

A CLI for the Bluesky social network (ATProto). Handles authentication, posts, replies, likes, follows, and search. Ships a `SKILL.md` so Claude Code agents can install and use it directly.

**Features:**
- Authenticate with a handle and app password; session persisted in `~/.bsky_cli/session.json`
- Create, list, view, and delete posts; reply, like/unlike, follow/unfollow
- Full-text post search and account search with advanced filters (author, date range, language)

---

### [perplexity_cli](packages/perplexity_cli/README.md)

A CLI for searching the web and running deep research queries using Perplexity AI. Ships a `SKILL.md` for use in agent workflows.

**Commands:**

| Command | Description |
|---------|-------------|
| `search` | Search the web; supports multi-query batches, domain allow/block lists, country and language filters |
| `deep-search` | Comprehensive research query returning a full text answer; four presets from fast lookup to advanced deep research |
| `install` | Copy the Perplexity skill into an agent folder |

