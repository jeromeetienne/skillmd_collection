# linkedin_cli

Command-line tool to interact with LinkedIn through a real browser session, driven by `fastbrowser_cli`.

It lets you create posts on the feed and manage direct-message conversations (list, read, send) from the terminal.

## Requirements

- A running `fastbrowser_cli` session already authenticated on `linkedin.com`.
- The `_shared/fastbrowser_helper.ts` wrapper located in the sibling `contribs/_shared/` folder.

## Usage

```bash
npx tsx ./src/cli.ts <command> [args]
```

### Commands

| Command | Description |
|---------|-------------|
| `post <content>` | Create a post on the LinkedIn feed. |
| `dm_page` | Navigate to the LinkedIn messaging page. Run this first before any `dm_*` command. |
| `dm_list` | List the names of people you have conversations with. |
| `dm_send <target_user> <message>` | Send a message in an existing conversation with `target_user`. |
| `dm_thread <target_user>` | Print the message thread of a conversation with `target_user`. |

`target_user` is matched against the conversation heading via a prefix match (e.g. `"Jerome"` matches `"Jerome Etienne"`).

### Examples

Create a post:

```bash
npx tsx ./src/cli.ts post "Hello LinkedIn from the CLI"
```

List your conversations:

```bash
npx tsx ./src/cli.ts dm_page
npx tsx ./src/cli.ts dm_list
```

Read a thread:

```bash
npx tsx ./src/cli.ts dm_thread "Jerome Etienne"
```

Output is one message per line in the form:

```
2026-05-03T14:32:00:Jerome Etienne: hey, are you free this week?
```

Send a reply:

```bash
npx tsx ./src/cli.ts dm_send "Jerome Etienne" "Sure, Thursday afternoon works."
```

## Layout

- [src/cli.ts](src/cli.ts) — Commander entry point, defines the commands and orchestrates browser actions through `FastBrowserHelper`.
- [src/libs/linkedin_thread_helper.ts](src/libs/linkedin_thread_helper.ts) — Parses the LinkedIn message thread from an accessibility tree snapshot into timestamped lines.
