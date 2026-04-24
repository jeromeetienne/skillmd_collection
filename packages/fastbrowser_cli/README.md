# fastbrowser_cli

Control a live Chrome browser from the command line: navigate, click, fill forms, and query the accessibility tree with CSS-like selectors.

A lighter alternative to Chrome DevTools MCP or Puppeteer, designed for AI agents and shell workflows. A persistent HTTP daemon keeps an MCP connection to the browser alive so each command incurs minimal latency.

- rely on [a11y_parse](https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse) for accessibility tree parsing and querying. 
  Especially a CSS-like selector syntax optimized for the accessibility tree.
- rely on [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) for robust browser control
- expose a curated, efficient toolset optimized for AI agent use cases
- minimize the required round-trips and boilerplate to perform common tasks
- minimize the output size, thus reducing LLM input size and parsing complexity. 
  - It means faster/cheaper LLM iterations when used in an agent loop. 
  - It means more accurate/better quality responses from the LLM as well, since it has less irrelevant info to parse through.

## How to install the CLI tool for claude

fastbrowser can be used at the cli level, with a SKILL.md that maps CLI commands to tools. To install the SKILL.md into a claude agent folder:

```bash
# goto the claude directory
cd ~/.claude
# install the fastbrowser_cli skill
npx fastbrowser_cli install
```

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
- **`fastbrowser_mcp`** — the MCP server that drives the actual Chrome browser via `chrome-devtools-mcp`.

```
  fastbrowser_cli  ──HTTP──▶  fastbrowser_httpd  ──MCP/stdio──▶  fastbrowser_mcp  ──▶  chrome-devtools-mcp ──▶ Chrome
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

## Scripts

```bash
npm run build                   # tsc compile
npm run typecheck               # tsc --noEmit
npm run start:cli               # run the CLI from source
npm run start:http-server       # run fastbrowser_httpd from source
npm run start:fastbrowser_mcp   # run fastbrowser_mcp from source
npm run inspect:fastbrowser_mcp # open the MCP inspector against fastbrowser_mcp
```

## Output & Errors

- Tool output is written to **stdout**, one line per response content part.
- Errors are written to **stderr** as `fastbrowser-cli error: <message>` and the process exits with code `1`.

## License

MIT
