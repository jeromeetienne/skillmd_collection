---
name: fastbrowser-script
description: >
  Generate a runnable bash script that drives `fastbrowser_cli` to scrape data from a webpage
  or automate an interaction flow (login, search, post, fill form, paginate).
  Use when the user asks for a script/automation against a live site, or says "scrape", "automate",
  "write a script to", "post to X", "search on Y", etc. — anything that is reusable rather than a
  one-shot CLI invocation. Builds on the `fastbrowser` skill.
---

# fastbrowser-script Skill

Generate a small, runnable bash script that uses `fastbrowser_cli` to perform a repeatable
browser task. The `fastbrowser` skill covers the CLI commands and selector language; this skill
is about turning those primitives into a script.

## Hard rule: never use UID selectors in a script

Raw uid selectors like `#1_42` are **not stable** — they are regenerated every time the
accessibility tree is rebuilt (page reload, navigation, DOM update) and will not match on a
later run. Uids are fine for ad-hoc CLI use within a single session, but a script must use
**role + name + attribute** selectors only. If your probe surfaced a uid, re-query with a
role/name selector to get a stable equivalent before writing it into the script.

## Workflow

Always follow this order — guessing selectors without checking the page wastes time.

1. **Clarify intent.** Confirm: target URL, what to extract or which actions to perform, inputs
   the user wants to parameterize (query, message, page count), and output format (stdout text,
   JSON, Markdown, file).
2. **Probe the live page.** Open it and find selectors that actually match. Prefer
   `query_selectors` / `query_selectors_all` over `take_snapshot` (cheaper, less noise).
   ```bash
   npx fastbrowser_cli new_page --url https://example.com
   npx fastbrowser_cli query_selectors -s 'searchbox' -s 'button[name*="Search"]'
   ```
   Iterate until each step has a **role/name/attribute** selector that uniquely identifies the
   right element. Discard any uids that show up in the snapshot — do not put them in the script.
3. **Write the script** with the discovered selectors, parameterized inputs, and `set -euo pipefail`.
4. **Run it once end-to-end** and fix breakages before handing it back.

## Bash template

```bash
#!/usr/bin/env bash
# <one-line purpose>
# usage: ./script.sh "<arg>"

set -euo pipefail

ARG="${1:?usage: $0 \"<arg>\"}"

npx fastbrowser_cli navigate_page --url https://example.com
npx fastbrowser_cli fill_form -s 'searchbox[name="q"]' -v "$ARG"
npx fastbrowser_cli press_keys --keys "Enter"
npx fastbrowser_cli click -s 'link[name^="Result"]'
```

Quoting rules:
- Always single-quote selectors in the shell (`-s 'button[name="Submit"]'`); selector strings
  routinely contain double quotes.
- Always double-quote interpolated variables (`-v "$MESSAGE"`) so spaces and special chars survive.

## Selector strategy for scripts

Hard-coded selectors are the fragile part of any scraper — choose stable ones.

- Prefer **role + name**: `button[name="Submit"]`, `link[name="Post"]`. Stable across re-renders.
- Use **substring match** when names vary by locale or contain dynamic suffixes:
  `combobox[name*="intitulé de poste"]`, `link[name^="More"]`.
- Use **scoping** when a role is ambiguous: `dialog textbox`, `navigation > link`.
- **Never** use uid selectors (`#1_42`, `#4`) in a script. They are session-local and change on
  every page rebuild. See the hard rule at the top.
- If you need every match (e.g. a list of results), use `query_selectors_all --limit N` with a
  reasonable cap; the default returns everything and is expensive.

## Output parsing

`query_selectors` / `query_selectors_all` print one indented line per node:

```
uid=1_12 heading "Welcome" level="1"
  uid=1_13 link "Read more" url="https://example.com/x"
```

Match with simple regexes — capture `name` from `"<...>"`, attributes from `attr="<...>"`, and
the role token. **Ignore the `uid=...` field** when parsing; it is per-session and meaningless
across runs. Don't try to parse the indentation as a tree unless you actually need ancestry —
flat regex matching is enough for most scrapers.

## Robustness checklist before handing off the script

- [ ] Each selector tested live with `query_selectors` and matched exactly the intended element.
- [ ] No uid selectors anywhere in the script — role/name/attribute only.
- [ ] Inputs (URL, query, message) parameterized, not hard-coded.
- [ ] `set -euo pipefail` at the top of the script.
- [ ] Script ran end-to-end at least once and produced the expected output.
- [ ] Failure mode is sensible: script exits non-zero on first failed CLI call.

## When NOT to write a script

If the user just wants to do the thing once, run the CLI commands directly via the `fastbrowser`
skill — don't generate a file. Scripts are for repeatable workflows, parameterized inputs, or
output the user wants to redirect/post-process.
