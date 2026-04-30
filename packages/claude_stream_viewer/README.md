# claude_stream_viewer

Pretty-prints [Claude Code](https://claude.com/claude-code) `stream-json` events from stdin with colorized output. Drop it at the end of a `claude --output-format stream-json` pipe to read the stream as a human instead of as raw JSON.

## Requirements

- Node.js 20+
- An upstream process emitting [Claude Code stream-json events](https://docs.claude.com/en/docs/claude-code/sdk) (typically the `claude` CLI run with `--output-format stream-json`)

## Install

```bash
npm install -g claude_stream_viewer
# or run on demand without installing
npx claude_stream_viewer
```

## Usage

Pipe any source of stream-json events into the viewer:

```bash
claude --output-format stream-json --verbose --include-partial-messages \
       --permission-mode auto -p "explain quantum computing like I'm 5" \
  | npx claude_stream_viewer
```

The viewer reads one JSON event per line from stdin and writes a colorized, human-readable rendering to stdout. It exits when stdin closes, printing `[stream ended]`.

### What it renders

| Event                              | Output                                                           |
|------------------------------------|------------------------------------------------------------------|
| `text_delta` (inside `stream_event`) | streamed inline as plain text — the assistant's reply            |
| `tool_use`                         | `=== TOOL USE ===` header followed by the event JSON             |
| Other `stream_event` types         | `=== EVENT: <type> ===` header followed by the event JSON        |
| Legacy `message_delta`             | streamed inline as plain text                                    |
| Final assistant message            | `=== FINAL MESSAGE ===` header followed by each content block    |
| Anything else                      | `=== UNKNOWN EVENT ===` header followed by the raw JSON          |

Malformed lines are reported on stderr (`Invalid JSON: …`) without aborting the stream.

## Options

| Flag         | Description                | Default |
|--------------|----------------------------|---------|
| `--no-color` | Disable colored output     | colored |
| `--version`  | Print the package version  | —       |
| `--help`     | Print usage help           | —       |

## Development

```bash
cd packages/claude_stream_viewer
npm install
npm run dev        # tsx ./src/claude_stream_viewer.ts
npm run build      # compile TypeScript → dist/
npm run typecheck  # type-check without emitting
```

## Output

- Rendered events are written to **stdout**.
- Parse errors and processing errors are written to **stderr**; the process keeps reading.
