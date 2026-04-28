# Publishing workflow

How to publish `fastbrowser_cli` to npm when it depends on the in-repo workspace package `a11y_parse`.

## Why this doc exists

This monorepo is a **pnpm** workspace (`packageManager: pnpm@9.15.0` in the root `package.json`, plus `pnpm-workspace.yaml`). `fastbrowser_cli` declares its sibling dep as:

```json
"a11y_parse": "workspace:*"
```

The `workspace:` protocol is a pnpm/yarn-berry convention. `npm` does not understand it, which causes two failure modes:

1. `npm install` from inside `packages/fastbrowser_cli/` fails immediately:
   ```
   npm error code EUNSUPPORTEDPROTOCOL
   npm error Unsupported URL Type "workspace:": workspace:*
   ```
2. `npm publish` either ships a tarball with `"workspace:*"` literally in `package.json` (consumers then hit the same error) or hard-errors on newer npm versions. The package becomes unpublishable via npm.

The fix is to use **pnpm** for both install and publish.

## One-time fixes

### 1. Use `pnpm publish` instead of `npm publish`

In `packages/fastbrowser_cli/package.json`, change the script from:

```json
"publish:all": "npm run build && npm version patch && npm publish --access public"
```

to:

```json
"publish:all": "pnpm run build && npm version patch && pnpm publish --access public"
```

Only the `publish` verb has to change. `npm version patch` is fine — it just bumps the version field and creates a git tag, with no workspace awareness needed.

### 2. (Optional) Switch `workspace:*` to `workspace:^`

In the same file, the dep:

```json
"a11y_parse": "workspace:*"
```

can become:

```json
"a11y_parse": "workspace:^"
```

This affects what `pnpm publish` writes into the published tarball — see the cheatsheet below. The repo's root `.npmrc` already sets `save-workspace-protocol=rolling`, so any **future** `pnpm add --workspace` would record `workspace:^` automatically; the existing `workspace:*` is not retroactively rewritten.

## Version-rewriting cheatsheet

At publish time, `pnpm publish` reads `packages/a11y_parse/package.json`'s `version` field **from disk** and rewrites the dep in the tarball only (your source file is untouched):

| In source                   | In published tarball |
|-----------------------------|----------------------|
| `"a11y_parse": "workspace:*"`     | `"a11y_parse": "1.0.3"`    |
| `"a11y_parse": "workspace:^"`     | `"a11y_parse": "^1.0.3"`   |
| `"a11y_parse": "workspace:~"`     | `"a11y_parse": "~1.0.3"`   |
| `"a11y_parse": "workspace:1.2.3"` | `"a11y_parse": "1.2.3"`    |

Tradeoff between `*` and `^`:

- `*` = exact pin. Every patch bump of `a11y_parse` requires a corresponding bump+republish of `fastbrowser_cli` for consumers to pick it up. Tight coupling, predictable.
- `^` = caret range. Consumers float on patch upgrades automatically. Looser coupling, easier dedupe.

## Per-release workflow

The order matters: **publish `a11y_parse` first**, because `pnpm publish` of `fastbrowser_cli` will bake in whatever version is currently on disk for `a11y_parse`. That version must already exist on the registry when consumers install.

```bash
# 0. Sync the workspace from the repo root (one-time per machine, plus after pulls)
cd ~/webwork/skillmd_collection
pnpm install
```

### Step 1 — Publish `a11y_parse` (only if it changed)

```bash
cd packages/a11y_parse
git status                    # working tree must be clean — `npm version` aborts otherwise
pnpm run publish:all          # build → npm version patch (e.g. 1.0.3 → 1.0.4, commits + tags) → npm publish
```

`a11y_parse` has no workspace deps, so its existing `npm publish` script is fine.

Verify the new version is live before continuing:

```bash
npm view a11y_parse version
```

### Step 2 — Publish `fastbrowser_cli`

```bash
cd ../fastbrowser_cli
git status                    # must be clean
pnpm run publish:all          # build → npm version patch (e.g. 1.0.22 → 1.0.23) → pnpm publish
```

At the `pnpm publish` step, the workspace dep is rewritten in-tarball using the rules above.

### Step 3 — Push commits and tags

```bash
cd ../..
git push --follow-tags
```

This pushes the version-bump commits and the `vX.Y.Z` tags created by `npm version patch`.

## Gotchas

- **Dirty working tree** → `npm version patch` aborts with "Git working directory not clean." Commit or stash any pending edits (including the `a11y_parse` version bump itself) before running `publish:all`.
- **Wrong publish order** → `fastbrowser_cli@<new>` references an `a11y_parse` version that doesn't exist on the registry yet. Consumers get a 404 on install. Always do `a11y_parse` first when both have changed.
- **Skipping a `fastbrowser_cli` republish** when using `workspace:*` → consumers stay on the old `a11y_parse` exact-pin. If you want `a11y_parse` patch upgrades to flow without a `fastbrowser_cli` release, switch to `workspace:^`.
- **Don't run `npm install` anywhere in this repo.** It will trip on `workspace:*` and may write a stray `package-lock.json` that conflicts with `pnpm-lock.yaml`. Always use `pnpm install` (and `pnpm add` / `pnpm remove`).
- **`.npmrc`'s `save-workspace-protocol=rolling` is forward-only.** It governs what gets written when you run `pnpm add`. It does not retroactively rewrite existing `workspace:*` entries.

## Quick reference

| Task                                  | Command                                                       |
|---------------------------------------|---------------------------------------------------------------|
| Install / link workspace deps         | `pnpm install` (from repo root)                               |
| Add an external dep to `fastbrowser_cli` | `pnpm --filter fastbrowser_cli add <pkg>`                  |
| Add a workspace dep                   | `pnpm --filter fastbrowser_cli add <pkg> --workspace`         |
| Publish `a11y_parse`                  | `cd packages/a11y_parse && pnpm run publish:all`              |
| Publish `fastbrowser_cli`             | `cd packages/fastbrowser_cli && pnpm run publish:all`         |
| Inspect what would be published       | `pnpm pack --dry-run` (from the package dir)                  |
