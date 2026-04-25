# FastBrowser MCP

## Overview

FastBrowser is a Model Context Protocol (MCP) server accessible via STDIO. It acts as a smarter proxy in front of the official `chrome-devtools-mcp`, exposing a leaner, more efficient toolset tuned for LLM agents.

Where the standard Chrome DevTools MCP exposes a broad, low-level API, FastBrowser adds a structured accessibility-tree query layer (`querySelectorsAll`) that lets an agent extract exactly the page nodes it needs in a single call — rather than consuming the entire raw snapshot. This reduces token usage and round-trips, making FastBrowser noticeably more efficient for web automation tasks.

## HTTP Server Architecture

Connecting to `fastbrowser-mcp` on every invocation is slow: the MCP process starts cold, handshakes with `chrome-devtools-mcp`, and tears down after each session. To eliminate that overhead, `fastbrowser-httpd` acts as a persistent MCP client that connects to `fastbrowser-mcp` once and keeps that connection alive. It then re-exposes the same capabilities over a REST API, so `fastbrowser-cli` can issue commands with minimal latency. This splits the stack into two roles — a long-lived server that owns the MCP connection, and a thin client that issues commands and reads results — making interactions dramatically faster and easier to script.

## Components

FastBrowser is made up of three tools that work together:

- **fastbrowser-mcp** — The MCP server, accessible via STDIO. It connects directly to Chrome via `chrome-devtools-mcp` and exposes a curated, efficient toolset to any MCP-compatible LLM agent.
- **fastbrowser-httpd** — A persistent HTTP server that acts as an MCP client connecting to `fastbrowser-mcp`. By keeping that MCP connection alive, it eliminates the cold-start penalty and exposes the same capabilities over a REST API for other clients to consume.
- **fastbrowser-cli** — A lightweight command-line client that talks to `fastbrowser-httpd` over a REST API. It provides a fast, scriptable interface to browser automation without the overhead of spawning a new MCP process each time.

### Tools exposed

| Tool | Description |
|---|---|
| `list_pages` | List open browser pages |
| `new_page` | Open a new browser page |
| `close_page` | Close a browser page |
| `navigate_page` | Navigate to a URL |
| `click` | Click an element |
| `fill_form` | Fill a form field |
| `querySelectorsAll` | Query the accessibility tree with CSS-like selectors |
| `querySelectors` | Query the accessibility tree and return the first matching node per selector |
| `pressKeys` | Send a sequence of keyboard events |

## FastBrowser CLI Command Lines

Each command maps 1-to-1 to a FastBrowser MCP tool and sends the request to `fastbrowser-httpd` via REST.

```bash
# List all open browser pages
fastbrowser-cli list_pages

# Open a new browser page
fastbrowser-cli new_page

# Close a page by its ID
fastbrowser-cli close_page --page-id <pageId>

# Navigate the current page to a URL
fastbrowser-cli navigate_page --url https://example.com

# Click an element by accessibility selector (fast path: "#1_42" is a direct uid reference)
fastbrowser-cli click --selector "#1_42"
fastbrowser-cli click -s 'button[name="Submit"]'

# Fill a form field by accessibility selector
fastbrowser-cli fill_form -s 'textbox[name="Email"]' --value "hello@example.com"

# Query the accessibility tree — --selector can be repeated for multiple selectors.
# --limit and --with-ancestors apply to all selectors equally.
fastbrowser-cli query_selectors_all --selector "button" --selector "link" --limit 5 --with-ancestors
fastbrowser-cli query_selectors_all --selector 'heading[level="1"]' --no-with-ancestors

# For per-selector control over limit/withAncestors, pass a JSON array directly:
fastbrowser-cli query_selectors_all --selectors-json '[{"selector":"button","limit":3,"withAncestors":true},{"selector":"link","limit":0,"withAncestors":false}]'

# Query the accessibility tree for the first matching element per selector (mirrors DOM querySelector).
# --selector can be repeated for multiple selectors; --with-ancestors applies to all.
fastbrowser-cli query_selectors --selector "button"
fastbrowser-cli query_selectors --selector "button" --selector "link" --no-with-ancestors

# For per-selector control over withAncestors, pass a JSON array directly:
fastbrowser-cli query_selectors --selectors-json '[{"selector":"button","withAncestors":true},{"selector":"link","withAncestors":false}]'

# Press a sequence of keys
fastbrowser-cli press_keys --keys "Tab, Tab, Enter"
fastbrowser-cli press_keys --keys "Hello, Tab, Enter"
```

## Implementation Notes

- The HTTP server is built with **Express**.
- All REST request and response payloads are validated with **Zod**.
- Every data structure has both a TypeScript `type` alias and a corresponding Zod schema — the type is derived from the schema via `z.infer<>` to keep them in sync.
- `fastbrowser-httpd` lives in `contrib/fastbrowser-httpd/`.
- `fastbrowser-cli` lives in `contrib/fastbrowser-cli/`.
