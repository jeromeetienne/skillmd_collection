# build_in_public

A Claude Code agent skill that turns your recent GitHub activity into ready-to-post `#buildInPublic` updates for Twitter/X, Bluesky, and LinkedIn.

This package is skill-only — it ships a [SKILL.md](skills/build-in-public/SKILL.md) and no CLI. The agent uses your local `gh` (GitHub CLI) to scan recent commits and releases, then drafts posts in an authentic developer voice.

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
