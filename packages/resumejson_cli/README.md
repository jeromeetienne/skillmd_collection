# resumejson_cli

A CLI tool to convert resumes between **PDF / JSON / Markdown** and run an **AI-powered ATS pipeline** (score → questions → answers → review → optimize).

The canonical format is a `ResumeJson` object validated by a Zod schema. Every command reads or writes that JSON, so any step in the pipeline can be inspected, edited, or fed into another tool.

## Key Features

- **Format conversion** — extract a structured `ResumeJson` from a PDF (using a vision model over rendered pages) or Markdown, and render it back to PDF (Mustache + Puppeteer) or Markdown.
- **AI-powered ATS pipeline** — score, review, generate screening questions, auto-answer them, and rewrite the resume to improve ATS performance.
- **Composable JSON I/O** — every command takes `-i <input>` and `-o <output>`; pass `-` for stdin/stdout to chain commands.
- **Cached PDF rendering** — the PDF→images step is memoised in a local SQLite cache, so re-running `from_pdf` on the same PDF is cheap.
- **Bundled Claude skill** — ships a `SKILL.md` that maps the CLI to a skill installable into a Claude agent folder.

## Requirements

- Node.js 20+
- `OPENAI_API_KEY` environment variable — every AI-backed command uses the OpenAI AI SDK (default model `gpt-4.1`).

## Installation

```bash
npm install -g resumejson_cli
```

Or install just the bundled `SKILL.md` into an agent folder so an AI agent can drive the CLI:

```bash
npx resumejson_cli install <skill-folder>
```

This copies `SKILL.md` to `<skill-folder>/skills/resume-json/SKILL.md`.

## Quick Start

```bash
export OPENAI_API_KEY=sk-...

# PDF -> structured resume JSON
npx resumejson_cli from_pdf -i ./resume.pdf -o ./resume.json

# Score how ATS-friendly the resume is
npx resumejson_cli ats_score -i ./resume.json -o ./resume.ats_score.json

# Render the JSON back to PDF
npx resumejson_cli to_pdf -i ./resume.json -o ./resume.rendered.pdf
```

## Commands

All commands take `-i <input>` and `-o <output>`. AI-backed commands also print a human-readable summary to stdout in addition to writing the JSON output file. `-` is accepted as `<path>` for stdin/stdout.

| Command | Purpose | Required flags |
|---|---|---|
| `from_pdf` | Extract resume JSON from a PDF (vision model) | `-i`, `-o` |
| `to_pdf` | Render resume JSON to a PDF | `-i`, `-o` |
| `from_markdown` | Extract resume JSON from a Markdown file | `-i`, `-o` |
| `to_markdown` | Render resume JSON to Markdown | `-i`, `-o` |
| `ats_score` | Numerical ATS readiness score (use as before/after gauge) | `-i`, `-o` |
| `ats_review` | Qualitative ATS review (strengths, weaknesses, suggestions); feeds `ats_optimize` | `-i`, `-o` |
| `ats_question` | Generate the ATS-style screening questions a recruiter would ask | `-i`, `-o` |
| `ats_answering` | Auto-answer ATS questions using the resume as context | `-i`, `-q`, `-o` |
| `ats_answered` | Fold answered questions back into a richer resume JSON | `-i`, `-q`, `-o` |
| `ats_optimize` | Rewrite the resume guided by an ATS review | `-i`, `-r`, `-o` |
| `install [skill-folder]` | Install bundled skills into `<skill-folder>/skills/` (default: `.`) | — |

## Workflow: full ATS pipeline

The recommended end-to-end pipeline, mirroring the `full_pipeline` script in `package.json`:

```bash
# 1. ingest
npx resumejson_cli from_pdf      -i resume.pdf                                    -o resume.json

# 2. baseline score (optional, for before/after comparison)
npx resumejson_cli ats_score     -i resume.json                                   -o resume.ats_score.json

# 3. enrich with answered ATS questions
npx resumejson_cli ats_question  -i resume.json                                   -o questions.unanswered.json
npx resumejson_cli ats_answering -i resume.json -q questions.unanswered.json      -o questions.answered.json
npx resumejson_cli ats_answered  -i resume.json -q questions.answered.json        -o resume.answered.json

# 4. review and optimize
npx resumejson_cli ats_review    -i resume.answered.json                          -o resume.ats_review.json
npx resumejson_cli ats_optimize  -i resume.answered.json -r resume.ats_review.json -o resume.optimized.json

# 5. render the optimized result
npx resumejson_cli to_pdf        -i resume.optimized.json -o resume.optimized.pdf
npx resumejson_cli to_markdown   -i resume.optimized.json -o resume.optimized.md

# 6. (optional) confirm the score improved
npx resumejson_cli ats_score     -i resume.optimized.json -o resume.optimized.ats_score.json
```

## Scripts

```bash
npm run build              # tsc compile
npm run typecheck          # tsc --noEmit
npm run test               # node --test on tests/**/*.test.ts
npm run dev                # run the CLI from source via tsx
npm run full_pipeline      # end-to-end pipeline against the sample PDF
npm run clean:outputs      # remove generated files in ./outputs
```

## Output & Errors

- Conversion outputs (`to_pdf`, `to_markdown`) write the rendered file; all other commands write structured JSON.
- AI-backed commands also print a human-readable pretty-printed summary to **stdout**.
- Use `-` for either `-i` or `-o` to read from stdin or write to stdout.
- Input JSON is validated against `ResumeJsonSchema`; mismatches surface as Zod validation errors.
- Missing `OPENAI_API_KEY` causes every AI command to fail — export it before retrying.

## License

ISC
