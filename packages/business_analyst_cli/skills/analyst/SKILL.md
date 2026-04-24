---
name: analyst
description: Analyze business models for trends, anomalies, and insights in Pigment OSS.
---

# Analyst Skill

This skill performs read-only analysis of structured business models managed by the Modeler skill. All operations are read-only — no model files are modified.

All operations are executed via:

```
npx business_analyst_cli analyst <command> [options]
```

---

## When to Use

Use this skill when the user wants to:

- Know what models are available for analysis
- Understand trends across time periods or dimensions for a given metric
- Detect unusual or anomalous data points in a model
- Get a full summary of a model's health, trends, and notable values

Do NOT use this skill to create, update, or simulate models — that is the `modeler-skill`'s role.

---

## Operations

### 1. list — List all available models

```
npx business_analyst_cli analyst list
```

Returns a JSON array of available models with their names and last-updated timestamps.

**When to use:** When the user asks what models exist before choosing one to analyze.

---

### 2. trend — Period-over-period % change

```
npx business_analyst_cli analyst trend <model-name> [--metric <metric-name>]
```

Computes the percentage change between consecutive dimensions for each metric (or a specific metric if `--metric` is provided).

**Arguments:**
- `<model-name>` — the model to analyze
- `--metric` — (optional) filter to a single metric by name

**Output example:**
```
Trend Analysis: q1-2026-revenue-plan

Metric: Revenue (USD)
  Period                         |       Before |        After |   Change%
  -------------------------------------------------------------------
  Jan 2026 → Feb 2026            |        1,000 |       95,000 | +9400.0%
  Feb 2026 → Mar 2026            |       95,000 |        3,000 |   -96.8%
```

---

### 3. anomaly — Detect significant deviations from mean

```
npx business_analyst_cli analyst anomaly <model-name> [--threshold <pct>]
```

Detects data points that deviate from their metric's mean by more than the threshold (default: 50%).

**Arguments:**
- `<model-name>` — the model to analyze
- `--threshold` — deviation threshold as a percentage (default: 50)

**Output example:**
```
Anomaly Detection: q1-2026-revenue-plan (threshold: 50%)

Revenue (USD)  mean=33,000
  [ANOMALY] Feb 2026: 95,000  (deviation: +187.9% from mean)
  [ANOMALY] Jan 2026:  1,000  (deviation: -96.9% from mean)
```

**When no anomalies found:**
```
Anomaly Detection: q1-2026-revenue-plan (threshold: 50%)
  No anomalies detected.
```

---

### 4. summary — Full human-readable analysis

```
npx business_analyst_cli analyst summary <model-name>
```

Produces a combined analysis block: totals per metric, overall trend direction, and notable anomalies.

**Output example:**
```
Summary: q1-2026-revenue-plan
Updated: 2026-03-20T14:03:45.641Z

Metrics Overview:
  Revenue (USD)
    Total:          99,000
    Mean:           33,000
    Min:             1,000  (Jan 2026)
    Max:            95,000  (Feb 2026)
    Trend:     Down (largest swing: Jan 2026 → Feb 2026 at +9400.0%)

Anomalies (threshold: 50%):
  Revenue (USD): Feb 2026 is +187.9% above mean, Jan 2026 is -96.9% below mean

Overall: 2 anomaly(ies) detected across 1 metric(s). Review model data for data entry errors or intentional spikes.
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

**User:** "What models can I analyze?"
```
npx business_analyst_cli analyst list
```

**User:** "Show me the revenue trend for q1-2026-revenue-plan"
```
npx business_analyst_cli analyst trend q1-2026-revenue-plan --metric Revenue
```

**User:** "Are there any anomalies in the q1-2026-revenue-plan?"
```
npx business_analyst_cli analyst anomaly q1-2026-revenue-plan
```

**User:** "Give me a full summary of q1-2026-revenue-plan"
```
npx business_analyst_cli analyst summary q1-2026-revenue-plan
```
