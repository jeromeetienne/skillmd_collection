# fastbrowser_cli

Control a live Chrome browser from the command line: navigate, click, fill forms, and query the accessibility tree with CSS-like selectors.

A lighter alternative to Chrome DevTools MCP or Puppeteer, designed for AI agents and shell workflows. A persistent HTTP daemon keeps an MCP connection to the browser alive so each command incurs minimal latency.

## Key Features

- **CSS-like selectors for accessibility trees** — powered by [a11y_parse](https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse), optimized for precise, efficient querying
— see [Selector Language](https://github.com/jeromeetienne/skillmd_collection/blob/main/packages/a11y_parse/docs/spec_a11y_selector_language.md) for the full spec
- **Pluggable browser backends** — choose between [@playwright/mcp](https://github.com/microsoft/playwright/tree/main/packages/mcp) (default, via the [Playwright MCP Bridge](https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm) Chrome extension) or [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) using `--mcp-target` or `FASTBROWSER_MCP_TARGET`
- **AI-optimized toolset** — curated commands that minimize round-trips and boilerplate for common tasks
- **Lean output** — reduces LLM input size, parsing complexity, and iteration cost while improving response quality


## How to install the CLI tool for claude

fastbrowser can be used at the cli level, with a SKILL.md that maps CLI commands to tools. To install the SKILL.md into a claude agent folder:

```bash
# goto the claude directory
cd ~/.claude
# install the fastbrowser_cli skill
npx fastbrowser_cli install
```

### How to include Playwright chrome extension 
It is use by fastbrowser_mcp to ontrol the browser.

[Playwright MCP Bridge](
https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm)

### How to install the MCP server

How to launch the MCP server that the CLI relies on to control the browser:

```bash
npx -p fastbrowser_cli fastbrowser_mcp mcp_server
```

how to install it in [Claude Desktop](https://code.claude.com/docs/en/desktop) - [more details](https://modelcontextprotocol.io/docs/develop/connect-local-servers#installing-the-filesystem-server)
1. Open Claude Desktop
2. Go to Settings -> Developer -> Local MCP servers
3. Click "Edit Config"
4. Add the following MCP server config to the JSON:
5. Save and restart Claude Desktop

```json
{
  "mcpServers": {
    "fastbrowser_mcp": {
      "command": "npx",
      "args": [
        "-p", "fastbrowser_cli", "fastbrowser_mcp", "mcp_server"
      ]
    }
  }
}
```

## Architecture

Three components ship together in this package:

- **`fastbrowser_cli`** — the user-facing CLI. Each subcommand maps 1-to-1 to a fastbrowser tool and prints the response on stdout.
- **`fastbrowser_httpd`** — a long-running HTTP server that fronts `fastbrowser_mcp` and holds the persistent MCP connection. The CLI auto-starts it on first use.
- **`fastbrowser_mcp`** — the MCP server that drives the browser. It proxies to one of two backends, picked at start time: `playwright` (default, via the Playwright MCP Bridge extension) or `chrome_devtools` (via `chrome-devtools-mcp`).

```
  fastbrowser_cli  ──HTTP──▶  fastbrowser_httpd  ──MCP/stdio──▶  fastbrowser_mcp  ──▶  @playwright/mcp │ chrome-devtools-mcp  ──▶ Chrome
```

## Installation

```bash
npm install -g fastbrowser_cli
```

Or install just the SKILL.md into an agent folder so an AI agent can use it:

```bash
npx fastbrowser_cli install <skill-folder>
```

This copies `SKILL.md` to `<skill-folder>/skills/fastbrowser/SKILL.md`.

## Quick Start

```bash
# Open a page (auto-starts the daemon)
npx fastbrowser_cli new_page --url https://example.com

# Find the first link and the first heading on the page
npx fastbrowser_cli query_selectors -s 'link' -s 'heading'

# Click it
npx fastbrowser_cli click -s 'link[name="More information..."]'
```

## Commands

| Command | Purpose | Required flags |
|---|---|---|
| `list_pages` | List open browser pages | — |
| `new_page` | Open a new page at a URL | `--url` |
| `close_page` | Close a page by id | `--page-id` |
| `navigate_page` | Navigate current page to a URL | `--url` |
| `take_snapshot` | Dump the full accessibility tree (expensive — prefer targeted queries) | — |
| `query_selectors` | Query the a11y tree, returning the first match per selector | `--selector` or `--selectors-json` |
| `query_selectors_all` | Query the a11y tree, returning every match per selector | `--selector` or `--selectors-json` |
| `click` | Click an element by accessibility selector | `-s, --selector` |
| `fill_form` | Fill a form field by accessibility selector | `-s, --selector`, `--value` |
| `press_keys` | Press a comma-separated key sequence | `--keys` |
| `install [skill-folder]` | Install SKILL.md into `<skill-folder>/skills/fastbrowser` (default: `.`) | — |
| `server start` | Start the HTTP daemon | — |
| `server status` | Report daemon running/stopped | — |
| `server stop` | Stop the HTTP daemon | — |

## Selector Language

The selector syntax is modelled on CSS, adapted for the accessibility tree.

- **Role:** `button`, `link`, `heading`, `searchbox`, `WebArea`, …
- **UID:** `#1_42` (fast path — bypasses the a11y-tree lookup)
- **Universal:** `*`
- **Attributes:** `[attr]`, `[attr="v"]`, `[attr^="p"]`, `[attr$="s"]`, `[attr*="x"]`. The virtual `name` attribute maps to the node's accessible name.
- **Combinators:** descendant `A B`, direct child `A > B`, union `A, B`.

Examples:

```
link[href^="https"]
button[name="Submit"]
navigation > link
heading, button
#1_7
```

Full selector reference is in [skills/fastbrowser/SKILL.md](skills/fastbrowser/SKILL.md).

## Configuration

| Flag / env | Purpose | Default |
|---|---|---|
| `--server <url>` / `FASTBROWSER_SERVER` | URL of the `fastbrowser_httpd` daemon | `http://localhost:8787` |
| `--autostart` / `--no-autostart` | Auto-start the daemon if it is not already running | `--autostart` |
| `--mcp-target <target>` / `FASTBROWSER_MCP_TARGET` | Browser backend: `playwright` or `chrome_devtools` | `playwright` |

## Browser backend

The daemon binds to one backend at startup. Resolution order: `--mcp-target` flag → `FASTBROWSER_MCP_TARGET` env var → default `playwright`.

```bash
# Stick with the default (Playwright + bridge extension)
npx fastbrowser_cli new_page --url https://example.com

# Or use chrome-devtools-mcp instead
FASTBROWSER_MCP_TARGET=chrome_devtools npx fastbrowser_cli new_page --url https://example.com

# One-off override of the env var
npx fastbrowser_cli --mcp-target chrome_devtools list_pages
```

If the daemon is already running with a different backend, the CLI refuses the request and prints the exact restart command, e.g.:

```
fastbrowser server already running with mcpTarget=playwright. To switch to chrome_devtools, run: fastbrowser-cli --mcp-target chrome_devtools server restart
```

`server status` shows the active backend, and `GET /health` returns `{ ok: true, mcpTarget: "<target>" }`.

## Scripts

```bash
npm run build                   # tsc compile
npm run typecheck               # tsc --noEmit
npm run start:cli               # run the CLI from source
npm run start:http-server       # run fastbrowser_httpd from source
npm run start:fastbrowser_mcp   # run fastbrowser_mcp from source
npm run inspect:fastbrowser_mcp # open the MCP inspector against fastbrowser_mcp
```

## How to publish to npmjs.com

`fastbrowser_cli` depends on the in-repo workspace package `a11y_parse`. Always publish through **pnpm** (not npm) — `pnpm publish` rewrites the `workspace:^` dep into a real version range in the tarball; `npm publish` cannot.

Order matters when both packages have changed: publish `a11y_parse` first so the version baked into `fastbrowser_cli`'s tarball already exists on the registry.

```bash
# 1. Publish a11y_parse first (only if it changed)
cd packages/a11y_parse
pnpm run publish:all

# 2. Then publish fastbrowser_cli
cd ../fastbrowser_cli
pnpm run publish:all

# 3. Push the version-bump commits and tags
git push --follow-tags
```

Full workflow, gotchas, and the version-rewriting cheatsheet live in [docs/publishing_workflow.md](docs/publishing_workflow.md).

## Output & Errors

- Tool output is written to **stdout**, one line per response content part.
- Errors are written to **stderr** as `fastbrowser-cli error: <message>` and the process exits with code `1`.

## License

MIT
