---
name: planner
description: Generate strategic recommendations, milestone plans, and scenario comparisons for Pigment OSS business models.
---

# Planner Skill

This skill synthesizes model data and analyst insights into forward-looking plans and strategic recommendations. It reads models built by the Modeler and analyzed by the Analyst to produce actionable outputs.

All operations are executed via:

```
npx business_analyst_cli planner <command> [options]
```

---

## When to Use

Use this skill when the user wants to:

- Get strategic recommendations for improving a business model
- Create a milestone plan to reach a specific target value
- Compare multiple what-if scenarios side by side and identify the best path
- List available models before planning

Do NOT use this skill to create or modify models — that is the `modeler-skill`'s role. Do NOT use it for trend or anomaly analysis — that is the `analyst-skill`'s role.

---

## Operations

### 1. list — List all available models

```
npx business_analyst_cli planner list
```

Returns a JSON array of available models with their names and last-updated timestamps.

**When to use:** Before planning to confirm which model to work with.

---

### 2. recommend — Generate strategic recommendations

```
npx business_analyst_cli planner recommend <model-name> [--goal '<text>']
```

Reads the model, computes per-metric totals, trends, and assumption health, then outputs numbered strategic recommendations. If `--goal` is provided, recommendations are framed around that objective.

**Arguments:**
- `<model-name>` — the model to analyze
- `--goal` — (optional) plain-language goal, e.g. `"increase revenue by 20% while cutting costs"`

**Output example:**
```
Recommendations: q1-2026-revenue-plan
Goal: increase revenue by 20% while cutting costs

Model Overview:
  Revenue (USD)    total=99,000  mean=33,000  trend: mixed  first=1,000  last=3,000
  Costs (USD)      total=0       mean=0        (no data)

Strategic Recommendations:
  1. Revenue dropped 96.8% from Feb 2026 to Mar 2026 — investigate the cause before projecting forward.
  2. No cost data found. Populate Costs to enable margin analysis.
  3. cost_ratio assumption is not set. Define it to enable automatic cost recomputation.
  4. With goal "increase revenue by 20%", target Revenue ≥ 114,000 from the current total of 99,000.
```

---

### 3. plan — Create a milestone plan toward a target

```
npx business_analyst_cli planner plan <model-name> \
  --target-metric Revenue \
  --target-value 120000 \
  --target-dimension "Mar 2026"
```

Performs a gap analysis between the most recent data point and the target. Computes the required per-period growth rate and generates a milestone plan across remaining dimensions.

**Arguments:**
- `<model-name>` — the model to plan against
- `--target-metric` — the metric name to target (e.g. `Revenue`)
- `--target-value` — the numeric target value
- `--target-dimension` — the dimension (period) by which the target must be reached

**Output example:**
```
Action Plan: q1-2026-revenue-plan
Target: Revenue = 120,000 by Mar 2026

Current State:
  Latest Revenue value: 3,000 (Mar 2026)
  (Note: using Feb 2026 = 95,000 as peak reference)

Gap Analysis:
  Current (latest): 3,000
  Target:           120,000
  Gap:              +117,000 (+3,900.0%)

Required Growth (from peak 95,000):
  One-period growth needed: +26.3%

Milestone Plan:
  Dimension    | Target Revenue (USD)
  -------------|---------------------
  Jan 2026     |              1,000  ✓ (actual)
  Feb 2026     |             95,000  ✓ (actual)
  Mar 2026     |            120,000  ← target

Actions:
  - Identify why Revenue fell from 95,000 to 3,000 between Feb and Mar 2026.
  - Apply revenue_growth_rate assumption to project remaining periods.
  - Consider updating the model with a recovery scenario using modeler-skill simulate.
```

---

### 4. compare — Compare multiple scenarios side by side

```
npx business_analyst_cli planner compare <model-name> \
  --scenarios '[
    {"name": "Base",         "assumption_overrides": {"revenue_growth_rate": 0.10}},
    {"name": "Optimistic",   "assumption_overrides": {"revenue_growth_rate": 0.20}},
    {"name": "Conservative", "assumption_overrides": {"revenue_growth_rate": 0.05}}
  ]'
```

Applies each scenario's overrides in memory (no disk writes), recomputes derived metrics, and prints a side-by-side comparison table. Highlights the best-performing scenario per metric.

**Arguments:**
- `<model-name>` — the model to run scenarios against
- `--scenarios` — JSON array of scenario objects, each with:
  - `name` — display name for the scenario column
  - `assumption_overrides` — (optional) assumptions to override
  - `data_overrides` — (optional) specific data points to override

**Output example:**
```
Scenario Comparison: q1-2026-revenue-plan

                       | Base     | Optimistic | Conservative
-----------------------|----------|------------|-------------
Revenue / Jan 2026     |    1,000 |      1,000 |        1,000
Revenue / Feb 2026     |   95,000 |     95,000 |       95,000
Revenue / Mar 2026     |    3,000 |      3,000 |        3,000

Best scenario per metric (by total):
  Revenue (USD): Optimistic = 99,000  (tied — no growth-derived data)
```

---

## Model Storage (read-only)

Models are read from the shared `models/` directory at the agent folder root:
```
pig_agents/_data/<model-name>.json
```

The script resolves this path as `../_data/` relative to the `_src/` folder.

---

## Examples

**User:** "Give me strategic recommendations for q1-2026-revenue-plan"
```
npx business_analyst_cli planner recommend q1-2026-revenue-plan
```

**User:** "How do we reach 120k revenue by March?"
```
npx business_analyst_cli planner plan q1-2026-revenue-plan \
  --target-metric Revenue \
  --target-value 120000 \
  --target-dimension "Mar 2026"
```

**User:** "Compare optimistic vs conservative growth scenarios"
```
npx business_analyst_cli planner compare q1-2026-revenue-plan \
  --scenarios '[{"name":"Optimistic","assumption_overrides":{"revenue_growth_rate":0.20}},{"name":"Conservative","assumption_overrides":{"revenue_growth_rate":0.05}}]'
```
