# twitter_cli

Command-line tool to interact with X (twitter.com) through a real browser session, driven by `fastbrowser_cli`.

It lets you create posts and manage direct-message conversations (list, read, send) from the terminal.

## Requirements

- A running `fastbrowser_cli` session already authenticated on `x.com`.
- The `_shared/fastbrowser_helper.ts` wrapper located in the sibling `contribs/_shared/` folder.

## Usage

```bash
npx tsx ./src/cli.ts <command> [args]
```

### Commands

| Command | Description |
|---------|-------------|
| `post <content>` | Create a post on x.com. |
| `dm_page` | Navigate to the x.com direct messages page. Run this first before any `dm_*` command. |
| `dm_list` | List the handles of people you have conversations with. |
| `dm_select <handle>` | Open an existing conversation by handle. |
| `dm_thread <handle>` | Print the message thread of a conversation with `handle`. |
| `dm_send <handle> <message>` | Send a message in an existing conversation with `handle`. |

`handle` is the X username without the leading `@` (e.g. `JamesCorbett`), as it appears at the end of the user's profile URL.

### Examples

Create a post:

```bash
npx tsx ./src/cli.ts post "Hello X from the CLI"
```

List your conversations:

```bash
npx tsx ./src/cli.ts dm_page
npx tsx ./src/cli.ts dm_list
```

Read a thread:

```bash
npx tsx ./src/cli.ts dm_page
npx tsx ./src/cli.ts dm_thread JamesCorbett
```

Output is one message per line in the form:

```
2026-05-03T14:32:00:JamesCorbett: hey, are you free this week?
```

Send a reply:

```bash
npx tsx ./src/cli.ts dm_page
npx tsx ./src/cli.ts dm_send JamesCorbett "Sounds good"
```

## Layout

- [src/cli.ts](src/cli.ts) — Commander entry point, defines the commands and orchestrates browser actions through `FastBrowserHelper`.
- [src/libs/twitter_thread_helper.ts](src/libs/twitter_thread_helper.ts) — Parses the X message thread from an accessibility tree snapshot into timestamped lines.
- [NOTES.md](NOTES.md) — Raw `fastbrowser_cli` selectors and accessibility-tree snippets used while reverse-engineering the X UI.
