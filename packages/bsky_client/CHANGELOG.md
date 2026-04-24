# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- `post <text>` top-level command to create a new post (max 300 chars)
- `posts create <text>` subcommand form for creating posts
- `posts delete <uri>` to delete one of your own posts
- `like <uri>` to like a post
- `unlike <uri>` to remove a like (errors if post is not already liked)
- `follow <handle>` to follow a user
- `unfollow <handle>` to unfollow a user (errors if not already following)
- Corresponding `BlueskyClient` methods: `likePost`, `unlikePost`, `followUser`, `unfollowUser`, `deletePost`
- `--json` global flag for structured JSON output on all commands, designed for agent and script consumption
- Errors in JSON mode are written to stderr as `{ success: false, error: { message } }` to keep stdout clean
- Progress messages are suppressed in JSON mode
- Login (`login`) in JSON mode requires credentials via `-u`/`-p` flags rather than interactive prompts

## [1.0.0] - 2026-03-01

### Added

- Authentication with `login` / `logout` / `status` commands; session persisted in `~/.bsky_cli/session.json`
- Post browsing with `posts list`, `posts from <handle>`, and `posts view <uri>`
- Reply to any post with `reply <uri> <text>`
- Full-text post search with `search posts <query>` (sort by latest or top)
- User search with `search users <query>`
- Advanced search with `search advanced <query>` supporting `--author`, `--since`, `--until`, `--language`, and `--type` filters
- `--limit` option on all listing and search commands (default 10, max 100)
- `install --skills` command to copy the bsky-cli skill into an agent folder

[Unreleased]: https://github.com/owner/bsky_cli/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/owner/bsky_cli/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/owner/bsky_cli/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/owner/bsky_cli/releases/tag/v1.0.0
