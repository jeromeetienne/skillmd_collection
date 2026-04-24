# bsky_cli

A command-line interface for the Bluesky social network (ATProto). Handles authentication, posts, replies, likes, follows, and search.

A [SKILL.md](skills/bluesky/SKILL.md) is included, which is especially useful if you are running AI agents.

## Installation

```bash
npm install
npm run build
```

## Usage

All examples use `npx tsx ./src/cli.ts` for development. After building, use `node dist/cli.js` or the `bsky_cli` bin.

### Authentication

```bash
# Log in with your handle and an app password
npx tsx ./src/cli.ts login -u handle.bsky.social -p <app-password>

# Check current session
npx tsx ./src/cli.ts status

# Log out
npx tsx ./src/cli.ts logout
```

App passwords: Bluesky Settings > Privacy & Security > App Passwords.
Session is persisted in `~/.bsky_cli/session.json` between calls.

### Posts

```bash
# Create a post (max 300 chars)
npx tsx ./src/cli.ts posts create "Hello from bsky_cli!"

# List your recent posts
npx tsx ./src/cli.ts posts list
npx tsx ./src/cli.ts posts list -l 25

# Get posts from another user
npx tsx ./src/cli.ts posts from someone.bsky.social

# View a specific post
npx tsx ./src/cli.ts posts view at://did:plc:.../app.bsky.feed.post/...

# Delete a post
npx tsx ./src/cli.ts posts delete at://did:plc:.../app.bsky.feed.post/...
```

### Replies, likes, follows

```bash
# Reply to a post (URI from posts list / search)
npx tsx ./src/cli.ts reply <uri> "Great post!"

# Like / unlike
npx tsx ./src/cli.ts like <uri>
npx tsx ./src/cli.ts unlike <uri>

# Follow / unfollow
npx tsx ./src/cli.ts follow handle.bsky.social
npx tsx ./src/cli.ts unfollow handle.bsky.social
```

### Search

```bash
# Full-text post search
npx tsx ./src/cli.ts search posts "typescript"
npx tsx ./src/cli.ts search posts "typescript" -l 25 --sort top

# Find accounts
npx tsx ./src/cli.ts search users "alice"

# Advanced search with filters
npx tsx ./src/cli.ts search advanced "rust lang" \
  --author someone.bsky.social \
  --since 2025-01-01 \
  --until 2025-12-31 \
  --language en \
  --limit 50

# Show search help and examples
npx tsx ./src/cli.ts search help
```

**Advanced search filter options:**

| Option | Description |
|--------|-------------|
| `--type <type>` | Content type: posts, replies, reposts |
| `--author <handle>` | Filter by author handle |
| `--since <date>` | Results after date (YYYY-MM-DD) |
| `--until <date>` | Results before date (YYYY-MM-DD) |
| `--language <lang>` | Filter by language code (en, es, fr, …) |

### Install skill

```bash
npx tsx ./src/cli.ts install --skills
```

Copies the bsky_cli skill into the current agent folder.

### Global options

| Option | Description |
|--------|-------------|
| `--json` | Output results as JSON |
| `-l, --limit <n>` | Result count (default 10) |

## Development

```bash
npm run typecheck   # type-check without building
npm run build       # compile to dist/
npm run dev         # run via tsx (no build needed)
```

## Architecture

- `src/cli.ts` — Commander.js CLI and command wiring
- `src/libs/bluesky_client.ts` — ATProto API wrapper
- `src/libs/session_manager.ts` — local session persistence (`~/.bsky_cli/session.json`)
- `src/libs/output.ts` — human/JSON output formatting
- `src/types.ts` — shared types
- `src/commands/` — one file per command group (login, logout, status, posts, reply, like, follow, search, install)
