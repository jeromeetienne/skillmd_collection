# mcp-now

An MCP server that provides tools to get the current date and time.

## Tools

### `get_current_datetime`

Returns the current date and time.

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `timezone` | string | No       | IANA timezone name (e.g. `America/New_York`). Defaults to local system timezone. |

Example output: `03/17/2026, 10:45:00 AM EDT`

### `get_current_date`

Returns the current date only (no time).

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `timezone` | string | No       | IANA timezone name (e.g. `America/New_York`). Defaults to local system timezone. |

Example output: `2026-03-17`

## Install

```bash
npm install -g mcp-now
```

Or run on demand without installing:

```bash
npx mcp-now
```

## Usage

### Build and run

```bash
npm install
npm run build
npm start
```

### Development

```bash
npm run dev
```

### Debug with MCP Inspector

```bash
npm run inspect
```

Opens a browser UI at `http://localhost:5173` where you can list tools, call them with custom arguments, and inspect raw JSON-RPC messages.

### MCP client configuration

Once installed globally (or available via `npx`), point your MCP client at the `mcp-now` binary:

```json
{
  "mcpServers": {
    "now": {
      "command": "npx",
      "args": ["mcp-now"]
    }
  }
}
```
