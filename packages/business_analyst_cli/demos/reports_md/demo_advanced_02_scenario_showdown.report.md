# Demo 05 — Advanced: Scenario comparison with milestone planning

## Description
A CFO-style workflow: given current data, compare three growth
strategies side-by-side, then build a milestone plan toward
the best-case target.

1. Create a model with 6 months of data
2. Compare 3 scenarios: Conservative (5%), Base (12%), Aggressive (25%)
3. Build a milestone plan targeting $1M revenue by Jun 2026
4. Simulate the aggressive scenario to preview exact numbers
5. Clean up


## Demo

>> Create a 6-month revenue model called demo-growth-scenarios from January to June 2026, tracking Revenue and Costs in USD, with 12% growth, 60% cost ratio, and Jan–Mar revenue data of $400K, $430K, and $470K.

The model demo-growth-scenarios has been created for Jan–Jun 2026 with the following setup:
- Metrics: Revenue (USD) and Costs (USD)
- Dimensions: January 2026 through June 2026
- Assumptions: 12% revenue growth rate, 60% cost ratio
- Data: Revenue for Jan ($400,000), Feb ($430,000), Mar ($470,000); costs will be based on the cost ratio.
The model is ready for use, and you can view or simulate growth scenarios, update data, or analyze further as needed. Would you like to see a detailed breakdown, run a simulation, or make any changes?

>> Show me the current state of demo-growth-scenarios.

Here is the current state of the demo-growth-scenarios model:
Model: demo-growth-scenarios
Updated: 2026-03-22
|                | Jan 2026 | Feb 2026 | Mar 2026 | Apr 2026 | May 2026 | Jun 2026 |
|----------------|----------|----------|----------|----------|----------|----------|
| Revenue (USD)  | 400,000  | 430,000  | 470,000  | 526,400  | 589,568  | 660,316  |
| Costs (USD)    | 240,000  | 258,000  | 282,000  | 315,840  | 353,741  | 396,190  |
Assumptions:
- revenue_growth_rate: 0.12
- cost_ratio: 0.6
Let me know if you want to simulate scenarios, update values, or analyze this model further!

>> Compare three growth scenarios for demo-growth-scenarios: Conservative at 5%, Base at 12%, and Aggressive at 25%.

Here is a side-by-side comparison of the three revenue growth scenarios (5%, 12%, 25%) for the demo-growth-scenarios model:
|                   | Conservative (5%) | Base (12%) | Aggressive (25%) |
|-------------------|-------------------|------------|------------------|
| Revenue / Jan     |     400,000       | 400,000    | 400,000          |
| Revenue / Feb     |     420,000       | 448,000    | 500,000          |
| Revenue / Mar     |     441,000       | 501,760    | 625,000          |
| Revenue / Apr     |     463,050       | 561,971    | 781,250          |
| Revenue / May     |     486,203       | 629,408    | 976,563          |
| Revenue / Jun     |     510,513       | 704,937    | 1,220,704        |
| TOTAL         |   2,720,766       | 3,246,075  | 4,503,517        |
|                   | Conservative (5%) | Base (12%) | Aggressive (25%) |
|-------------------|-------------------|------------|------------------|
| Costs / Jan       |     240,000       | 240,000    | 240,000          |
| Costs / Feb       |     252,000       | 268,800    | 300,000          |
| Costs / Mar       |     264,600       | 301,056    | 375,000          |
| Costs / Apr       |     277,830       | 337,183    | 468,750          |
| Costs / May       |     291,722       | 377,645    | 585,938          |
| Costs / Jun       |     306,308       | 422,962    | 732,422          |
| TOTAL         |   1,632,460       | 1,947,646  | 2,702,110        |
Best scenario per metric (by total):
- Revenue: Aggressive = $4,503,517 (+65.5% vs Conservative)
- Costs: Aggressive = $2,702,110 (+65.5% vs Conservative)
Let me know if you want additional analysis or scenario details!

>> Build a milestone plan for demo-growth-scenarios to reach $1M revenue by June 2026.

Here is the milestone plan for demo-growth-scenarios to achieve $1,000,000 in monthly Revenue by June 2026:
Target:
Revenue = $1,000,000 by June 2026
Current State:
Latest Revenue value: $660,316 (June 2026)
Gap Analysis:
- Reference (May 2026): $589,568
- Target (June 2026): $1,000,000
- Gap: $410,432 (+69.6%)
Required Growth Rate:
+69.6% in the final period (from May to June 2026).
Milestone Plan:
| Month   | Target Revenue (USD)   |
|---------|-----------------------|
| Jan 2026 | 400,000 ✓ (actual)   |
| Feb 2026 | 430,000 ✓ (actual)   |
| Mar 2026 | 470,000 ✓ (actual)   |
| Apr 2026 | 526,400 ✓ (actual)   |
| May 2026 | 589,568 ✓ (actual)   |
| Jun 2026 | 660,316 ← current value (needs to reach $1M) |
Actions:
- Update the revenue_growth_rate to match the required growth above.
- Simulate the plan with the higher growth rate for June.
- After simulation, update the model with the new plan if approved.
Would you like to simulate this scenario or update your model targets?

>> Simulate demo-growth-scenarios with aggressive 25% growth, save it as demo-growth-scenarios-aggressive so we can analyze it.

The simulation for demo-growth-scenarios with an aggressive 25% monthly growth rate is complete and has been saved as demo-growth-scenarios-aggressive for further analysis.
Key changes compared to your original plan:
- June 2026 Revenue increases from $660,316 to $1,220,704 (+84.9%)
- June 2026 Costs rise from $396,190 to $732,422 (+84.9%)
This new scenario is now ready for detailed analysis, reporting, or further planning. Let me know if you’d like a summary, recommendations, or other actions on this aggressive growth scenario!

>> Run a full summary analysis on the aggressive scenario demo-growth-scenarios-aggressive.

Here is the full summary analysis of the aggressive scenario (demo-growth-scenarios-aggressive):
Summary: demo-growth-scenarios-aggressive
Updated: 2026-03-22
Metrics Overview:
- Revenue (USD)
  
  - Total: $4,503,517
  - Mean: $750,586
  - Min: $400,000 (Jan 2026)
  - Max: $1,220,704 (Jun 2026)
  - Trend: Up (largest swing: Apr 2026 → May 2026 at +25.0%)
- Costs (USD)
  
  - Total: $2,702,110
  - Mean: $450,352
  - Min: $240,000 (Jan 2026)
  - Max: $732,422 (Jun 2026)
  - Trend: Up (largest swing: Apr 2026 → May 2026 at +25.0%)
Anomalies (threshold: 50%):
- Revenue (USD): Jun 2026 is +62.6% above mean
- Costs (USD): Jun 2026 is +62.6% above mean
Overall:
2 anomalies detected across 2 metrics, specifically large upward deviations in June due to aggressive growth. Please review these for intentional targets or potential entry errors.
Would you like further breakdowns, visualizations, or other analytics on this scenario?

>> Run an anomaly check on demo-growth-scenarios-aggressive before we commit to a strategy.

An anomaly check on the demo-growth-scenarios-aggressive model reveals:
- Revenue (USD), mean = $750,586
  
  - [ANOMALY] June 2026: $1,220,704 (deviation: +62.6% from mean)
- Costs (USD), mean = $450,352
  
  - [ANOMALY] June 2026: $732,422 (deviation: +62.6% from mean)
Both anomalies are significant upward deviations for June 2026, directly resulting from the aggressive 25% growth acceleration in your scenario.
These spikes are intentional based on your target strategy, but if this is not expected or sustainable, you should review before committing.
Would you like further advice on interpreting or managing these anomalies, or proceed with strategic planning?

>> Delete the demo-growth-scenarios and demo-growth-scenarios-aggressive models.

Both models have been deleted:
- demo-growth-scenarios
- demo-growth-scenarios-aggressive
Your workspace is now clear of these scenarios. Let me know if you need to create new models or work on anything else!

>> /quit

Bye.
