# Bluesky CLI - Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## First Time Setup

### 1. Get Your App Password
1. Go to https://bsky.app
2. Login to your account
3. Go to Settings → App passwords
4. Create a new app password (don't use your main password!)
5. Copy the generated password

### 2. Login to the CLI

```bash
# Interactive login (you'll be prompted)
npm run dev -- login

# Or with options
npm run dev -- login -u your-handle -p your-app-password
```

You'll see:
```
✓ Successfully logged in as @yourhandle
DID: did:plc:...
Name: Your Display Name
```

## Basic Usage Examples

### Check Your Status
```bash
npm run dev -- status
```

### Get Your Posts
```bash
npm run dev -- posts list
npm run dev -- posts list --limit 20
```

### View Someone Else's Posts
```bash
npm run dev -- posts from @username
npm run dev -- posts from @elonmusk --limit 5
```

### View a Specific Post
```bash
npm run dev -- posts view "at://did:plc:.../app.bsky.feed.post/..."
```

### Reply to a Post
```bash
npm run dev -- reply "at://did:plc:.../app.bsky.feed.post/..." "This is great!"
```

### Search for Posts
```bash
c
npm run dev -- search posts "AI development" --sort top
```

### Search for Users
```bash
npm run dev -- search users "typescript developer"
npm run dev -- search users "alice"
```

### Advanced Search with Filters
```bash
npm run dev -- search advanced "machine learning" \
  --type posts \
  --author @username \
  --since 2024-01-01 \
  --until 2024-12-31 \
  --language en \
  --limit 50
```

### Search Help
```bash
npm run dev -- search help
```

### Logout
```bash
npm run dev -- logout
```

## Project Structure

```
src/
├── cli.ts                    # Main CLI entry point
├── types.ts                  # TypeScript type definitions
├── libs/
│   ├── bluesky_client.ts     # Bluesky API client
│   └── session_manager.ts    # Authentication session handling
└── commands/
    ├── login.ts              # Login command
    ├── logout.ts             # Logout command
    ├── status.ts             # Status command
    ├── posts.ts              # Post management (list, from, view)
    ├── reply.ts              # Reply to posts
    └── search.ts             # Search functionality
```

## Available Commands

| Command | Description |
|---------|-------------|
| `login` | Authenticate with Bluesky |
| `logout` | Clear stored credentials |
| `status` | Check authentication status |
| `posts list` | Get your posts |
| `posts from <handle>` | Get user's posts |
| `posts view <uri>` | View specific post |
| `reply <uri> <text>` | Reply to post |
| `search posts <query>` | Search posts |
| `search users <query>` | Search users |
| `search advanced <query>` | Advanced search with filters |
| `search help` | View search guide |

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Run from source (with tsx)
npm run dev -- <command>

# Run compiled version
npm start -- <command>
```

## Features

✅ **Authentication**
- Secure login with Bluesky app passwords
- Session persistence in `~/.bsky_cli/session.json`
- Automatic session restoration

✅ **Post Management**
- View your posts
- Browse other users' posts
- View individual posts with engagement metrics
- Reply to posts

✅ **Search**
- Basic post search by keywords
- User search by handle or name
- Advanced search with filters:
  - Content type (posts, replies, reposts)
  - Author filtering
  - Date range (since/until)
  - Language filtering
  - Result limit (1-100)
- Search operators and help guide

✅ **Quality**
- Full TypeScript type safety
- Clean, readable code following style guidelines
- Comprehensive error handling
- Descriptive error messages
- No TypeScript errors
- Production-ready build

## Tips & Tricks

### Getting Post URIs
When you view posts, the URI is shown. It looks like:
```
at://did:plc:xxxxx/app.bsky.feed.post/xxxxx
```

Use this URI to view or reply to posts.

### Search Operators
```bash
# Exact phrase
"machine learning"

# Exclude words
AI -ads

# Multiple options
Bluesky OR ATProto

# From specific user
from:@handle

# With hashtag
#typescript
```

### Limits and Pagination
- Post limits: 1-100 (default: 10)
- Search limits: 1-100 (default: 10)
- All results are capped to prevent overwhelming output

## Troubleshooting

### "Invalid password" Error
- Make sure you're using an **App Password**, not your main Bluesky password
- Get one from Settings → App passwords on bsky.app

### "Not authenticated" Error
- Run `npm run dev -- login` to authenticate first
- Check `~/.bsky_cli/session.json` exists

### Session Expired
- Run `npm run dev -- login` again to refresh your session

### Network Errors
- Check your internet connection
- Verify bsky.social is accessible
- Try again in a moment

## Next Steps

1. **Try the basics**: Login, view your posts, check your status
2. **Explore**: Search for interesting posts and users
3. **Engage**: Reply to posts you find interesting
4. **Automate**: Use in scripts or combine with other tools

## Resources

- [Bluesky Official](https://bsky.app)
- [ATProto Documentation](https://atproto.com)
- [@atproto/api GitHub](https://github.com/bluesky-social/atproto)

---

**Ready to explore Bluesky from the command line?** 🚀
