---
name: perplexity
description: >
  Search the web and do research using Perplexity AI. Use this skill whenever the user
  wants to search the web, look up current information, do research, or find facts online.
  Supports filtering by domain, country, and language, as well as multi-query batch search.
  For in-depth research reports use deep-search with a preset. Triggers on: "search the web",
  "look up", "find info on", "research", "what is X", "latest news on X", "search for X",
  or any request needing up-to-date information from the internet.
---

# perplexity Skill

A CLI for searching the web and running deep research queries using Perplexity AI.

**Requires:** `PERPLEXITY_API_KEY` environment variable.

---

## Quick Reference

| Goal                                    | Command                                                                      |
|-----------------------------------------|------------------------------------------------------------------------------|
| Basic search                            | `npx perplexity_cli search -q "query"`                                       |
| Multi-query batch search                | `npx perplexity_cli search -q "query1" -q "query2"`                          |
| Search with country filter              | `npx perplexity_cli search -q "query" --country US`                          |
| Search with domain allowlist            | `npx perplexity_cli search -q "query" --domain wikipedia.org`                |
| Search with domain blocklist            | `npx perplexity_cli search -q "query" --domain -example.com`                 |
| Search with language filter             | `npx perplexity_cli search -q "query" --language en`                         |
| Deep research (markdown output)         | `npx perplexity_cli deep-search -q "query" -m`                               |
| Deep research with preset               | `npx perplexity_cli deep-search -q "query" -p advanced-deep-research`        |
| Install skill                           | `npx perplexity_cli install --skill`                                         |

---

## Setup

```bash
cd packages/perplexity_cli
npm install
npm run build

# Set API key
export PERPLEXITY_API_KEY=pplx-your-key-here
```

---

## Commands

### `search`

Searches the web and returns a list of results (title, URL, snippet).

```bash
# Single query
npx perplexity_cli search -q "TypeScript generics"

# Multiple queries in one request (up to 5)
npx perplexity_cli search -q "TypeScript generics" -q "TypeScript decorators"

# Regional results
npx perplexity_cli search -q "weather forecast" --country FR

# Domain filter (allow only specific domain)
npx perplexity_cli search -q "machine learning" --domain arxiv.org

# Domain filter (block a domain, prefix with -)
npx perplexity_cli search -q "machine learning" --domain -example.com

# Language filter
npx perplexity_cli search -q "intelligence artificielle" --language fr

# Limit results
npx perplexity_cli search -q "rust programming" --max-results 5
```

**Options:**

| Flag                  | Description                                               | Default |
|-----------------------|-----------------------------------------------------------|---------|
| `-q, --query <query>` | Search query — repeatable up to 5 times                   | required|
| `--domain <domain>`   | Domain filter — repeatable, prefix `-` to block           | —       |
| `--country <code>`    | ISO 3166-1 alpha-2 country code (e.g. `US`, `FR`, `JP`)   | —       |
| `--language <code>`   | ISO 639-1 language code — repeatable up to 10             | —       |
| `--max-results <n>`   | Number of results (1–20)                                  | `10`    |

---

### `deep-search`

Runs a comprehensive research query using Perplexity AI presets. Returns a full text answer.

```bash
# Deep research (default preset), plain text output
npx perplexity_cli deep-search -q "explain transformer neural networks"

# Deep research with markdown output
npx perplexity_cli deep-search -q "explain transformer neural networks" -m

# Fast search preset
npx perplexity_cli deep-search -q "capital of France" -p fast-search

# Advanced deep research
npx perplexity_cli deep-search -q "impact of quantum computing on cryptography" -p advanced-deep-research -m
```

**Options:**

| Flag                    | Description                                                 | Default          |
|-------------------------|-------------------------------------------------------------|------------------|
| `-q, --query <query>`   | Search query                                                | required         |
| `-m, --markdown`        | Output as raw markdown (default: plain text)                | false            |
| `-p, --preset <preset>` | Research preset (see below)                                 | `deep-research`  |

**Presets:**

| Preset                   | Model                  | Use case                                      |
|--------------------------|------------------------|-----------------------------------------------|
| `fast-search`            | sonar                  | Quick factual lookups                         |
| `pro-search`             | sonar-pro              | Reliably researched standard queries          |
| `deep-research`          | sonar-deep-research    | In-depth analysis requiring extensive research|
| `advanced-deep-research` | sonar-reasoning-pro    | Maximum depth research with extensive sources |

---

### `install`

Copies the perplexity skill folder into the current working directory.

```bash
npx perplexity_cli install --skill
```

---

## Output

- `search`: Writes results to **stdout** (title, URL, snippet per result).
- `deep-search`: Writes the full answer to **stdout**.
- Errors are written to **stderr** and the process exits with code 1.
