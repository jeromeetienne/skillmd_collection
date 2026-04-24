---
name: fastbrowser
description: >
  Control a live browser from the command line: navigate, click, fill forms, and query the accessibility tree with CSS-like selectors. Lighter alternative to Chrome DevTools MCP or Puppeteer. Triggers on: navigate/click/fill actions, page snapshots, or mentions of fastbrowser.
---

# fastbrowser Skill

`fastbrowser-cli` is a command-line client for the FastWeb HTTP server, which keeps a persistent
MCP connection to a Chrome browser alive so commands incur minimal latency. Each command
maps 1-to-1 to a FastWeb tool and returns the tool's response on stdout.

## Invocation

Run the CLI directly via `tsx`:

```bash
npx fastbrowser_cli <command> [flags]
```

## Typical Workflow

1. **Query** the accessibility tree for specific nodes: `query_selectors` (first match per selector) or `query_selectors_all` (every match per selector).
2. **Act** on an element by its accessibility selector: `click`, `fill_form`, `press_keys`. The selector can be a direct uid reference (e.g. `#1_42`, fastest path) or any CSS-like selector (e.g. `button[name="Submit"]`), which is resolved to a uid internally.

Snapshot output looks like:

```
uid=1_0 RootWebArea "Example Domain" url="https://example.com/"
  uid=1_1 heading "Example Domain" level="1"
  uid=1_2 link "More information..." url="https://www.iana.org/..."
```

## Page Management

```bash
# List all open browser pages
npx fastbrowser_cli list_pages

# Open a new page at a URL
npx fastbrowser_cli new_page --url https://example.com

# Close a page by its numeric id
npx fastbrowser_cli close_page --page-id 1

# Navigate the current page to a URL
npx fastbrowser_cli navigate_page --url https://example.com
```


## Selector Language

The selector syntax is modelled on CSS selectors, adapted for accessibility tree structures.

### Role selector

Matches nodes by their accessibility role.

```
button
link
comboxbox
searchbox
heading
WebArea
```

### Universal selector

Matches any node.

```
*
```

### UID selector

Matches a node by its exact unique identifier.

```
#4
#1_3
```

### Attribute selectors

Attribute selectors match values inside `node.attributes`. The special virtual attribute `name` maps to `node.name`.

| Syntax | Semantics |
|--------|-----------|
| `[attr]` | attribute is present |
| `[attr="value"]` | exact match |
| `[attr^="prefix"]` | starts with |
| `[attr$="suffix"]` | ends with |
| `[attr*="sub"]` | contains substring |

```
link[href]
button[disabled="true"]
link[href^="https"]
link[href$=".com"]
link[href*="example"]
heading[name="Welcome"]
link[name="Click \"here\""]
```

### Combinators

| Syntax | Semantics |
|--------|-----------|
| `A B` | B is a descendant of A (any depth) |
| `A > B` | B is a direct child of A |
| `A, B` | union — matches A or B |

```
WebArea link
main > button
heading, button
RootWebArea > link[href^="https"]
```

### Examples

Sample accessibility tree:

```
uid=1 WebArea "Main Page"
  uid=2 main
    uid=3 heading "Welcome"
    uid=4 link "Click here" href="https://example.com"
    uid=5 button "Submit" disabled="true"
  uid=6 navigation
    uid=7 link "Home" href="/"
    uid=8 link "About" href="/about"
```

Example queries on it:
- `link` matches all the links (uid=4, uid=7, uid=8)
- 'navigation > link' matches only the links that are direct children of navigation (uid=7, uid=8)
- `link[href^="https"]` matches links with an external href (uid=4)
- `button[name="Submit"]` matches the submit button by name (uid=5)
- `*[disabled="true"]` matches any disabled element (uid=5)
- `heading, button` matches both headings and buttons in one query (uid=3, uid=5)
- `#7` matches a node by its UID (uid=7)

## Inspection

- `query_selectors` and `query_selectors_all` are the most efficient way to get specific elements or data from the page. Use them instead of `take_snapshot` whenever possible.
- Prefer `query_selectors` when you only need the first match per selector (cheaper, less output); use `query_selectors_all` when you need every match or want to cap with `--limit`.

```bash
# Query the accessibility tree returning the FIRST match per selector (--selector is repeatable)
npx fastbrowser_cli query_selectors --selector "button" --selector "link"

# Exclude ancestor nodes from the result
npx fastbrowser_cli query_selectors --selector 'heading[level="1"]' --no-with-ancestors

# Per-selector control over withAncestors via JSON
npx fastbrowser_cli query_selectors \
  --selectors-json '[{"selector":"button","withAncestors":true},{"selector":"link","withAncestors":false}]'

# Query the accessibility tree returning ALL matches per selector (--selector is repeatable)
npx fastbrowser_cli query_selectors_all --selector "button" --selector "link" --limit 5

# Exclude ancestor nodes from the result
npx fastbrowser_cli query_selectors_all --selector 'heading[level="1"]' --no-with-ancestors

# Per-selector control over limit / withAncestors via JSON
npx fastbrowser_cli query_selectors_all \
  --selectors-json '[{"selector":"button","limit":3,"withAncestors":true},{"selector":"link","limit":0,"withAncestors":false}]'

# Take an accessibility-tree full page snapshot of the current page - very expensive, prefer targeted queries when possible
npx fastbrowser_cli take_snapshot
```

## Interaction

```bash
# Click by a direct uid reference (fast path - no accessibility-tree lookup)
npx fastbrowser_cli click --selector "#1_42"

# Click by any CSS-like selector - resolved to a uid internally
npx fastbrowser_cli click -s 'button[name="Submit"]'

# Fill a single form field - selector can be a uid (#1_7) or any CSS-like selector
npx fastbrowser_cli fill_form -s 'textbox[name="Email"]' --value "hello@example.com"

# Press a comma-separated sequence of keys (literals and named keys both work)
npx fastbrowser_cli press_keys --keys "Tab, Tab, Enter"
npx fastbrowser_cli press_keys --keys "Hello, Tab, Enter"
```

## Command Reference

| Command | Purpose | Required flags |
|---------|---------|----------------|
| `list_pages` | List open browser pages | — |
| `new_page` | Open a new page at a URL | `--url` |
| `close_page` | Close a page by id | `--page-id` |
| `navigate_page` | Navigate current page to a URL | `--url` |
| `take_snapshot` | Dump the accessibility tree of the whole page - very expensive, prefer targeted queries (`query_selectors` / `query_selectors_all`) when possible | — |
| `query_selectors` | Query a11y tree by CSS-like selector, returning the first match per selector | `--selector` or `--selectors-json` |
| `query_selectors_all` | Query a11y tree by CSS-like selector, returning every match per selector | `--selector` or `--selectors-json` |
| `click` | Click an element by accessibility selector | `--selector` / `-s` |
| `fill_form` | Fill a form field by accessibility selector | `--selector` / `-s`, `--value` |
| `press_keys` | Press a comma-separated key sequence | `--keys` |
| `server start` | Start the HTTP server daemon | — |
| `server status` | Report server running/stopped | — |
| `server stop` | Stop the HTTP server | — |

## Output & Errors

Tool output is written to **stdout** — one line per response content part. On failure the
CLI writes `fastbrowser-cli error: <message>` to **stderr** and exits with code 1.
