---
name: modeler
description: Build, view, update, delete and simulate structured business models for Pigment OSS.
---

# Modeler Skill

This skill manages structured business models for the Pigment OSS system. A model is the shared source of truth consumed by Analyst and Planner agents.

All operations are executed via:

```
npx business_analyst_cli modeler <command> [options]
```

---

## When to Use

Use this skill when the user wants to:

- Create a new business model (budget, forecast, headcount plan, etc.)
- View the current state of a model
- Update a specific metric value or assumption
- Simulate a what-if scenario without changing the model
- List all available models
- Delete a model permanently

Do NOT use this skill to run analysis on the data — that is the Analyst agent's role.

---

## Operations

### 1. list — List all models

```
npx business_analyst_cli modeler list
```

Returns a JSON array of available models with their names and last-updated timestamps.

**When to use:** When the user asks what models exist, or before operating on a model to confirm it exists.

---

### 2. create — Create a new model

```
npx business_analyst_cli modeler create <model-name> \
  --dimensions "Q1 2026" "Q2 2026" "Q3 2026" "Q4 2026" \
  --metrics "Revenue:USD" "Costs:USD" "Headcount:FTE" \
  --assumptions '{"revenue_growth_rate": 0.10, "cost_ratio": 0.70}' \
  --data '{"Revenue": {"Q1 2026": 100000}, "Costs": {"Q1 2026": 70000}}'
```

**Arguments:**
- `<model-name>` — unique identifier (lowercase, hyphens allowed, e.g. `q1-business-plan`)
- `--dimensions` — one or more dimension labels (time periods, regions, products, etc.)
- `--metrics` — one or more `Name:Unit` pairs (e.g. `Revenue:USD`, `Headcount:FTE`)
- `--assumptions` — JSON object of named assumptions and their values
- `--data` — (optional) JSON object with initial data values per metric per dimension

**Output:** `Model created: <name>`

---

### 3. view — Display a model

```
npx business_analyst_cli modeler view <model-name>
```

Renders the model as an ASCII table with metrics as rows and dimensions as columns, followed by the assumptions block.

**Output example:**
```
Model: q1-business-plan
Updated: 2026-03-20T10:00:00Z

               | Q1 2026  | Q2 2026  | Q3 2026
Revenue (USD)  | 100,000  | 110,000  |    —
Costs (USD)    |  70,000  |  77,000  |    —
Headcount (FTE)|      10  |      11  |    —

Assumptions:
  revenue_growth_rate: 0.10
  cost_ratio: 0.70
```

---

### 4. update — Update model data or assumptions

```
npx business_analyst_cli modeler update <model-name> --patch '<json>'
```

The patch JSON supports two shapes:

**Update a data point:**
```json
{ "data": { "Revenue": { "Q2 2026": 115000 } } }
```

**Update assumptions:**
```json
{ "assumptions": { "cost_ratio": 0.65 } }
```

**Update both:**
```json
{
  "data": { "Headcount": { "Q3 2026": 12 } },
  "assumptions": { "revenue_growth_rate": 0.12 }
}
```

**Output:** Summary of what changed, e.g.:
```
Model updated: q1-business-plan
  data.Revenue.Q2 2026: 110000 → 115000
  assumptions.cost_ratio: 0.70 → 0.65
```

---

### 5. delete — Delete a model

```
npx business_analyst_cli modeler delete <model-name>
```

Permanently removes the model file from disk.

**When to use:** When the user wants to discard a model entirely.

**Output:** `Model deleted: <name>`

---

### 6. simulate — Run a what-if scenario

```
npx business_analyst_cli modeler simulate <model-name> --scenario '<json>' [--save-as <new-name>]
```

Applies overrides in memory and shows a before/after comparison. By default does not write to disk. If `--save-as` is provided, persists the simulated model as a new model file that analyst and planner tools can then operate on.

**Optional flags:**
- `--save-as <new-name>` — Save the simulated model as a new, separate model file. The new model can then be analyzed with analyst-skill or planned with planner-skill. Clean up with `modeler delete <new-name>` when done.

**Scenario JSON shapes:**

Override assumptions:
```json
{ "assumption_overrides": { "revenue_growth_rate": 0.20 } }
```

Override specific data points:
```json
{ "data_overrides": { "Revenue": { "Q1 2026": 130000 } } }
```

**Output:** Before/after comparison for affected values:
```
Simulation: q1-business-plan
Scenario: revenue_growth_rate 0.10 → 0.20

               | Q1 2026 (before) | Q1 2026 (after) | Delta
Costs (USD)    |           70,000 |          91,000 | +30.0%
```

---

## Model Storage

Models are stored as JSON files in the `models/` directory at the root of the agent folder:
```
pig_agents/_data/<model-name>.json
```

The script resolves this path as `../_data/` relative to the `_src/` folder.

---

## Examples

**User:** "What models do I have?"
```
npx business_analyst_cli modeler list
```

**User:** "Create a Q1 2026 revenue plan with monthly dimensions"
```
npx business_analyst_cli modeler create q1-revenue-plan \
  --dimensions "Jan 2026" "Feb 2026" "Mar 2026" \
  --metrics "Revenue:USD" "Costs:USD" "Margin:%" \
  --assumptions '{"cost_ratio": 0.65}'
```

**User:** "Show me the q1-revenue-plan"
```
npx business_analyst_cli modeler view q1-revenue-plan
```

**User:** "Update February revenue to 95000"
```
npx business_analyst_cli modeler update q1-revenue-plan \
  --patch '{"data": {"Revenue": {"Feb 2026": 95000}}}'
```

**User:** "What happens if our cost ratio drops to 60%?"
```
npx business_analyst_cli modeler simulate q1-revenue-plan \
  --scenario '{"assumption_overrides": {"cost_ratio": 0.60}}'
```

**User:** "What if our growth rate jumps to 25%? Save it so I can analyze and plan on it."
```
npx business_analyst_cli modeler simulate q1-revenue-plan \
  --scenario '{"assumption_overrides":{"revenue_growth_rate":0.25}}' \
  --save-as q1-aggressive

npx tsx ../../_src/cli/analyst.ts summary q1-aggressive

npx tsx ../../_src/cli/planner.ts recommend q1-aggressive --goal "maximize growth"

npx business_analyst_cli modeler delete q1-aggressive
```

**User:** "Delete the q1-revenue-plan model"
```
npx business_analyst_cli modeler delete q1-revenue-plan
```
