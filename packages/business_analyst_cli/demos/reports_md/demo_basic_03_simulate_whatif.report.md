# Demo 03 — Basic: Simulate a what-if scenario

## Description
Shows the modeler simulate command:
1. Create a model with baseline data
2. Simulate: what if revenue_growth_rate doubles to 20%?
3. Confirm the original model is unchanged
4. Clean up


## Demo

>> Create a baseline model called demo-whatif with Q1 through Q3 2026, tracking Revenue and Costs in USD, assuming 10% revenue growth, a 70% cost ratio, and Q1 revenue of $200K.

The baseline model "demo-whatif" has been created with the following setup:
- Dimensions: Q1 2026, Q2 2026, Q3 2026
- Metrics: Revenue (USD), Costs (USD)
- Assumptions: 10% revenue growth rate, 70% cost ratio
- Data: Q1 2026 Revenue set to $200,000
If you’d like to view the model or run a what-if scenario, let me know!

>> Show me the current state of demo-whatif.

Here is the current state of the "demo-whatif" model:
```
  Model: demo-whatif
  Updated: 2026-03-22T01:29:13.239Z
  
                     Q1 2026   |   Q2 2026   |   Q3 2026
  --------------------------------------------------------
  Revenue (USD)     200,000    |   220,000   |   242,000
  Costs (USD)       140,000    |   154,000   |   169,400
  
  Assumptions:
    revenue_growth_rate: 0.10
    cost_ratio: 0.70
```
If you’d like to simulate any what-if scenarios or update this model, just let me know!

>> Simulate what happens to demo-whatif if the revenue growth rate doubles to 20%.

Here is the simulation outcome for "demo-whatif" with the revenue growth rate doubled to 20%:
```
  Scenario: revenue_growth_rate: 0.10 → 0.20
  
                     Before      |     After      |   Delta
  -----------------------------------------------------------
  Revenue / Q2 2026   220,000   |   240,000     |  +9.1%
  Revenue / Q3 2026   242,000   |   288,000     | +19.0%
  Costs / Q2 2026     154,000   |   168,000     |  +9.1%
  Costs / Q3 2026     169,400   |   201,600     | +19.0%
```
Doubling the revenue growth rate boosts both revenue and costs substantially in Q2 and Q3. If you'd like to save this scenario as a new model or explore other what-if cases, let me know!

>> Show me demo-whatif again to confirm it was not modified by the simulation.

The "demo-whatif" model was not modified by the simulation. Here is its current saved state:
```
                             Q1 2026 | Q2 2026 | Q3 2026
  -------------------------------------------------------
  Revenue (USD)              200,000 | 220,000 | 242,000
  Costs (USD)                140,000 | 154,000 | 169,400
  
  Assumptions:
    revenue_growth_rate: 0.10
    cost_ratio: 0.70
```
Simulations only show hypothetical changes and do not persist them unless you explicitly choose to save.

>> Delete the demo-whatif model.

The "demo-whatif" model has been deleted permanently.
If you need to create a new model or have other requests, feel free to let me know!

>> /quit

Bye.
