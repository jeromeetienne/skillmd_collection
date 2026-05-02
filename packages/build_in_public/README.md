# build_in_public

A Claude Code agent SKILL.md that turns your recent GitHub activity into ready-to-post `#buildInPublic` updates for 
Twitter/X, Bluesky, and LinkedIn.

This package is skill-only — it ships a [SKILL.md](skills/build-in-public/SKILL.md) and no CLI. The agent uses your 
local `gh` (GitHub CLI) to scan recent commits and releases, then drafts posts in an authentic developer voice.

## Usage Example
- *"Generate build-in-public linkedin posts for github user 'jeromeetienne'"*
- *"Generate build-in-public posts for twitter/bluesky based on github activity of 'jeromeetienne' during the past 2 weeks"*

## What it does

- Scans your 10 most recently pushed public repos via `gh`
- Pulls commits from the last 7 days and categorizes them (feature, bug fix, docs, refactor, release, infra)
- Drafts 1–3 posts grouped by narrative, under 280 chars, with relevant hashtags
- Falls back to use-case / value-proposition posts when there's no recent activity
- Presents each post per platform, with the inspiring commits and suggested visuals

## Installation

The skill is a single `SKILL.md` file. Download it from GitHub raw into the `skills/` folder of any Claude Code agent.

User-global install (`~/.claude/skills/`):

```bash
mkdir -p ~/.claude/skills/build-in-public
curl -fsSL https://raw.githubusercontent.com/jeromeetienne/skillmd_collection/main/packages/build_in_public/skills/build-in-public/SKILL.md \
  -o ~/.claude/skills/build-in-public/SKILL.md
```

Project-local install (`.claude/skills/`):

```bash
mkdir -p .claude/skills/build-in-public
curl -fsSL https://raw.githubusercontent.com/jeromeetienne/skillmd_collection/main/packages/build_in_public/skills/build-in-public/SKILL.md \
  -o .claude/skills/build-in-public/SKILL.md
```

### Requirements

- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated (`gh auth login`)
- A public GitHub account with recent activity (the skill defaults to the username `jeromeetienne` — override in conversation)

## Usage

Once installed, the skill triggers automatically on prompts like:

- *"Write a build in public post"*
- *"What did I ship this week?"*
- *"Post about my GitHub activity"*
- *"Draft a #buildInPublic update for Bluesky"*

You can also override the default GitHub username:

- *"Generate build-in-public posts for github user `alice`"*

The agent will fetch your activity, analyze it, and present posts ready to copy-paste.

## How it works

See [skills/build-in-public/SKILL.md](skills/build-in-public/SKILL.md) for the full workflow — repo scanning, commit categorization, post templates (feature announcement, weekly progress, use-case suggestion, learning/reflection), and quality guidelines.

## Video generator script

The package also ships [src/build_in_public_video.ts](src/build_in_public_video.ts), a script that scaffolds a Remotion project and streams Claude Code to generate a build-in-public video.

The user prompt is read from **stdin**:

```bash
echo "Generate a build-in-public video about my latest CLI release" \
  | npx tsx src/build_in_public_video.ts build

# or pipe a prompt file
cat prompt.txt | npx tsx src/build_in_public_video.ts build

# with custom directories
echo "my prompt" \
  | npx tsx src/build_in_public_video.ts build --tmp-dir /tmp --output-dir ~/Videos
```

```
USER_PROMPT=$(cat <<'EOF'
Generate a build-in-public video

topic: why fastbrowser + a11y_parse are great to scrape the web with AI
description: |
  Based on those 2 folders, in a monorepo
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/fastbrowser_cli
EOF
)

echo "$USER_PROMPT" | npx tsx src/build_in_public_video.ts build
```

### Commands

```
Usage: build_in_public_video [options] [command]

Scaffold a Remotion project and stream Claude Code to generate a build-in-public
video.

Options:
  -h, --help              display help for command

Commands:
  install [skill-folder]  Install all bundled skills into <skill-folder>/skills/
                          (default: .)
  build [options]         Scaffold the Remotion project, run Claude, and copy
                          the generated artifacts.
  help [command]          display help for command
```

#### `build` options

```
Usage: build_in_public_video build [options]

Scaffold the Remotion project, run Claude, and copy the generated artifacts.

Options:
  -t, --tmp-dir <dir>     parent directory for the generated project (default:
                          "/tmp")
  -o, --output-dir <dir>  output directory for the generated video (mp4/pdf/log)
                          (default: "/tmp")
  -h, --help              display help for command
```

The `build` command exits with an error if no prompt is piped on stdin.
