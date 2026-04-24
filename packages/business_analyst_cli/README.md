# business_analyst_cli

A CLI for structured business modeling, trend analysis, anomaly detection, and strategic planning. Built around three sub-commands — **modeler**, **analyst**, and **planner** — that form a natural pipeline from raw data to actionable recommendations.

## Using with Claude Code

The package ships three Claude Code skills (modeler, analyst, planner) and an agent definition (`AGENTS.md`) that wires them together into a single Business Analyst agent.

### Install the skills

Each skill is a folder containing a `SKILL.md`. Copy them into Claude Code's global skills directory:

```bash
cp -r skills/modeler  ~/.claude/skills/modeler
cp -r skills/analyst  ~/.claude/skills/analyst
cp -r skills/planner  ~/.claude/skills/planner
```

Once installed, Claude Code picks them up automatically — no restart needed. The skills appear as `modeler-skill`, `analyst-skill`, and `planner-skill` in Claude's tool list.

### Install the agent (AGENTS.md)

`AGENTS.md` defines the Business Analyst agent and tells it which skills to use. Copy it into the root of any project where you want the agent active:

```bash
cp AGENTS.md /path/to/your/project/AGENTS.md
```

Or use the runner config directly with the `agentmd` runner:

```bash
# The runner config is business_analyst.agentmd_runner.yaml
# It references ./AGENTS.md and ./skills/* relative to this package
```

### Workflow

With the skills and agent in place, Claude Code follows this pipeline automatically:

```
Human request → modeler-skill (build/update model)
             → analyst-skill  (trend, anomaly, summary)
             → planner-skill  (recommend, plan, compare)
             → Human review
```

You can also invoke each skill directly in a Claude Code conversation:

```
Use modeler-skill to create a budget model with Q1–Q4 2026 dimensions and Revenue/Expenses metrics.

Use analyst-skill to summarise the budget model.

Use planner-skill to recommend actions for the budget model with the goal "reach $1M ARR by Q4".
```

## Installation

```bash
npm install
npm run build
```

Run directly without building:

```bash
npm run dev -- <command> [options]
# or
npx tsx src/business_analyst_cli.ts <command> [options]
```

## Commands

### `modeler` — Create and manage business models

A model is a JSON file with named metrics, time-based dimensions, optional assumptions, and a data table.

| Sub-command | Description |
|---|---|
| `list` | List all saved models |
| `create <name>` | Create a new model |
| `view <name>` | Print the model as a table |
| `update <name>` | Patch metric values or assumptions |
| `simulate <name>` | Run a what-if scenario in memory |
| `delete <name>` | Delete a model |

**Create a model:**

```bash
business_analyst_cli modeler create budget \
  --dimensions "Q1 2026" "Q2 2026" "Q3 2026" \
  --metrics "Revenue:USD" "Expenses:USD" \
  --assumptions '{"revenue_growth_rate": 0.15, "cost_ratio": 0.6}' \
  --data '{"Revenue": {"Q1 2026": 100000}}'
```

**Update values:**

```bash
business_analyst_cli modeler update budget \
  --patch '{"data": {"Revenue": {"Q2 2026": 115000}}, "assumptions": {"cost_ratio": 0.55}}'
```

**Simulate a scenario:**

```bash
business_analyst_cli modeler simulate budget \
  --scenario '{"assumption_overrides": {"revenue_growth_rate": 0.25}}' \
  --save-as budget-optimistic
```

---

### `analyst` — Analyze model data

Read-only analysis on existing models.

| Sub-command | Description |
|---|---|
| `list` | List all available models |
| `trend <name>` | Period-over-period % change per metric |
| `anomaly <name>` | Detect values that deviate from the metric mean |
| `summary <name>` | Full human-readable analysis (totals, trends, anomalies) |

**Trend analysis:**

```bash
business_analyst_cli analyst trend budget
business_analyst_cli analyst trend budget --metric Revenue
```

**Anomaly detection** (default threshold: 50%):

```bash
business_analyst_cli analyst anomaly budget
business_analyst_cli analyst anomaly budget --threshold 30
```

**Full summary:**

```bash
business_analyst_cli analyst summary budget
```

---

### `planner` — Generate plans and recommendations

Synthesizes model state into forward-looking plans.

| Sub-command | Description |
|---|---|
| `list` | List all available models |
| `recommend <name>` | Strategic recommendations based on model state |
| `plan <name>` | Gap analysis and milestone roadmap to a target |
| `compare <name>` | Side-by-side scenario comparison |

**Recommendations:**

```bash
business_analyst_cli planner recommend budget --goal "reach $500K ARR"
```

**Action plan to a target:**

```bash
business_analyst_cli planner plan budget \
  --target-metric Revenue \
  --target-value 500000 \
  --target-dimension "Q4 2026"
```

**Compare scenarios:**

```bash
business_analyst_cli planner compare budget --scenarios '[
  {"name": "Base",       "assumption_overrides": {"revenue_growth_rate": 0.10}},
  {"name": "Optimistic", "assumption_overrides": {"revenue_growth_rate": 0.25}},
  {"name": "Pessimistic","assumption_overrides": {"revenue_growth_rate": 0.05}}
]'
```

---

## Model format

Models are stored as JSON files in `data/`. Example:

```json
{
  "name": "budget",
  "dimensions": ["Q1 2026", "Q2 2026", "Q3 2026"],
  "metrics": [{"name": "Revenue", "unit": "USD"}, {"name": "Expenses", "unit": "USD"}],
  "assumptions": {"revenue_growth_rate": 0.15, "cost_ratio": 0.6},
  "data": {
    "Revenue":  {"Q1 2026": 100000, "Q2 2026": 115000},
    "Expenses": {"Q1 2026":  60000, "Q2 2026":  69000}
  }
}
```


## Development

```bash
npm run dev       # run with tsx (no build step)
npm run build     # compile to dist/
npm run typecheck # type-check without emitting
```
