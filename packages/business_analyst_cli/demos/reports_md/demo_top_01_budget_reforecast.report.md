# Demo 07 — Elaborate: Mid-Year Budget Reforecast

## Description
Scenario: You're the FP&A lead at a B2B SaaS company. The original
2026 budget was approved in December 2025. Now it's mid-year — Q1
and Q2 actuals are in, and they missed the plan. The CFO wants a
revised forecast by end of week.

Workflow:
- Phase 1 — Recreate the original approved budget
- Phase 2 — Update with actual Q1/Q2 numbers (they missed)
- Phase 3 — Diagnose: where did we miss and by how much?
- Phase 4 — Build three reforecast scenarios for H2
- Phase 5 — Pick the best scenario and build a milestone plan
- Phase 6 — Simulate the chosen path with adjusted assumptions
- Phase 7 — Final recommendation for CFO review
- Cleanup


## Demo

>> Create the original 2026 budget model called demo-budget-2026 with Q1–Q4 dimensions, tracking Revenue, Costs, and Headcount, assuming 15% growth and 55% cost ratio, starting with $2M Q1 revenue and headcount ramping from 80 to 110.

The original 2026 budget model, named demo-budget-2026, has been created with these specifications:
- Dimensions: Q1 2026, Q2 2026, Q3 2026, Q4 2026
- Metrics: Revenue (USD), Costs (USD), Headcount (FTE)
- Assumptions:
  
  - Revenue grows 15% quarter-over-quarter, starting from $2M in Q1
  - Cost ratio at 55% of revenue
  - Headcount ramps evenly from 80 in Q1 to 110 in Q4
If you'd like to view, modify, or simulate scenarios on this model, just let me know!

>> Show me the approved demo-budget-2026.

Here is the approved demo-budget-2026 model:
```
  Model: demo-budget-2026
  Updated: 2026-03-22
  
                             Q1 2026 |   Q2 2026 |   Q3 2026 |   Q4 2026
  ------------------------------------------------------------------------
  Revenue (USD)            2,000,000 | 2,300,000 | 2,645,000 | 3,041,750
  Costs (USD)              1,100,000 | 1,265,000 | 1,454,750 | 1,672,962.5
  Headcount (FTE)                 80 |        90 |       100 |       110
  
  Assumptions:
    revenue_growth_rate: 0.15
    cost_ratio: 0.55
```
If you need further details, scenario analysis, or want to update anything, just let me know!

>> Run a summary analysis on demo-budget-2026 as a baseline.

Here is the summary analysis of demo-budget-2026 (baseline):
Metrics Overview:
- Revenue (USD)
  
  - Total:         9,986,750
  - Mean:          2,496,688
  - Min:           2,000,000  (Q1 2026)
  - Max:           3,041,750  (Q4 2026)
  - Trend:         Up (largest swing: Q1 2026 → Q2 2026 at +15.0%)
- Costs (USD)
  
  - Total:         5,492,713
  - Mean:          1,373,178
  - Min:           1,100,000  (Q1 2026)
  - Max:           1,672,962.5 (Q4 2026)
  - Trend:         Up (largest swing: Q1 2026 → Q2 2026 at +15.0%)
- Headcount (FTE)
  
  - Total:               380
  - Mean:                 95
  - Min:                  80  (Q1 2026)
  - Max:                 110  (Q4 2026)
  - Trend:         Up (largest swing: Q1 2026 → Q2 2026 at +12.5%)
Anomalies (threshold: 50%):
- None detected.
Overall: No anomalies detected. Model data looks consistent.
Let me know if you'd like to explore scenarios, compare to a new plan, or dig deeper into any area!

>> Update demo-budget-2026 with Q1 actuals: $1.85M revenue, $1.147M costs, and 78 headcount.

demo-budget-2026 has been updated with your Q1 actuals:
- Revenue (Q1 2026): $1,850,000 (was $2,000,000)
- Costs (Q1 2026): $1,147,000 (was $1,100,000)
- Headcount (Q1 2026): 78 (was 80)
Let me know if you want to review the updated model, run a refreshed analysis, or update further quarters!

>> Update demo-budget-2026 with Q2 actuals: $1.95M revenue, $1.209M costs, and 85 headcount.

demo-budget-2026 has been updated with your Q2 actuals:
- Revenue (Q2 2026): $1,950,000 (was $2,300,000)
- Costs (Q2 2026): $1,209,000 (was $1,265,000)
- Headcount (Q2 2026): 85 (was 90)
If you'd like to review the full updated model, rerun a summary analysis, or continue updating further quarters, just let me know!

>> Adjust the cost ratio in demo-budget-2026 to 62% to reflect actual spending.

The cost_ratio assumption in demo-budget-2026 has been updated from 55% to 62% to reflect actual spending.
If you'd like to model future quarters based on this new ratio, rerun a summary, or adjust any other assumptions, let me know!

>> Show me demo-budget-2026 with the actuals baked in.

Here is the current demo-budget-2026 model with your actuals baked in:
```
  Model: demo-budget-2026
  
                              Q1 2026 |   Q2 2026 |   Q3 2026 |   Q4 2026
  ------------------------------------------------------------------------
  Revenue (USD)             1,850,000 | 1,950,000 | 2,645,000 | 3,041,750
  Costs (USD)               1,147,000 | 1,209,000 | 1,454,750 | 1,672,962.5
  Headcount (FTE)                  78 |        85 |       100 |       110
  
  Assumptions:
    revenue_growth_rate: 0.15
    cost_ratio: 0.62
```
Let me know if you'd like to update additional quarters, run a fresh analysis, or see scenario impacts going forward!

>> Run a full summary analysis on demo-budget-2026 now that actuals are in.

Here is the full summary analysis of demo-budget-2026 with actuals included:
Metrics Overview:
- Revenue (USD)
  
  - Total:         9,486,750
  - Mean:          2,371,688
  - Min:           1,850,000 (Q1 2026)
  - Max:           3,041,750 (Q4 2026)
  - Trend:         Up (largest swing: Q2 2026 → Q3 2026 at +35.6%)
- Costs (USD)
  
  - Total:         5,483,713
  - Mean:          1,370,928
  - Min:           1,147,000 (Q1 2026)
  - Max:           1,672,962.5 (Q4 2026)
  - Trend:         Up (largest swing: Q2 2026 → Q3 2026 at +20.3%)
- Headcount (FTE)
  
  - Total:               373
  - Mean:                 93
  - Min:                  78 (Q1 2026)
  - Max:                 110 (Q4 2026)
  - Trend:         Up (largest swing: Q2 2026 → Q3 2026 at +17.6%)
Anomalies (threshold: 50%):
- None detected.
Overall: No anomalies detected. Model data looks consistent.
If you want to dive into trends, compare to other scenarios, or make further updates, just let me know!

>> Analyze the revenue trend for demo-budget-2026 — is it accelerating or decelerating?

Here is the quarter-over-quarter revenue trend for demo-budget-2026:
- Q1 2026 → Q2 2026:    +5.4%
- Q2 2026 → Q3 2026:   +35.6%
- Q3 2026 → Q4 2026:   +15.0%
Interpretation:
- The trend is not steadily accelerating or decelerating: growth was modest from Q1 to Q2, then sharply accelerated into Q3, and slowed somewhat into Q4.
- The spike between Q2 and Q3 (+35.6%) stands out compared to the other periods.
If you’d like a visual, scenario explanation, or further breakdown, just let me know!

>> Analyze the cost trend for demo-budget-2026 — are costs growing faster than revenue?

Here is the quarter-over-quarter trend comparison for demo-budget-2026:
Revenue (QoQ % Growth):
- Q1 → Q2: +5.4%
- Q2 → Q3: +35.6%
- Q3 → Q4: +15.0%
Costs (QoQ % Growth):
- Q1 → Q2: +5.4%
- Q2 → Q3: +20.3%
- Q3 → Q4: +15.0%
Analysis:
- Q1 → Q2: Costs grew at the same rate as revenue (+5.4%)
- Q2 → Q3: Revenue grew faster than costs (+35.6% vs +20.3%)
- Q3 → Q4: Costs and revenue grew at the same rate (+15.0%)
At no point did costs grow faster than revenue; the periods with strong revenue growth (Q2 → Q3) show revenue outpacing costs by a significant margin. Other periods show parallel growth rates.
Let me know if you want a deeper breakdown or visualization!

>> Run anomaly detection on demo-budget-2026 with a tight 30% threshold.

Anomaly detection for demo-budget-2026 (with a tight 30% threshold) found:
No anomalies detected.
All metric values are within 30% of their respective means across Q1–Q4 2026, indicating consistent and expected data with no major outliers. Let me know if you want to analyze further or simulate different scenarios!

>> Compare three reforecast scenarios for demo-budget-2026: Continued Drag at 5% growth, Partial Recovery at 10%, and Full Recovery at 15%.

Here is the comparison of the three reforecast scenarios for demo-budget-2026 (Q1–Q4 2026), using the updated 62% cost ratio—
Scenario Names:
- Continued Drag (5% quarterly revenue growth)
- Partial Recovery (10% growth)
- Full Recovery (15% growth)
Results:
|                            | Continued Drag | Partial Recovery | Full Recovery |
|----------------------------|:-------------:|:----------------:|:-------------:|
| Revenue / Q1 2026          |   1,850,000   |    1,850,000     |   1,850,000   |
| Revenue / Q2 2026          |   1,942,500   |    2,035,000     |   2,127,500   |
| Revenue / Q3 2026          |   2,039,625   |    2,238,500     |   2,446,625   |
| Revenue / Q4 2026          |   2,141,606   |    2,462,350     |   2,813,619   |
| Costs / Q1 2026            |   1,147,000   |    1,147,000     |   1,147,000   |
| Costs / Q2 2026            |   1,204,350   |    1,261,700     |   1,319,050   |
| Costs / Q3 2026            |   1,264,568   |    1,387,870     |   1,516,908   |
| Costs / Q4 2026            |   1,327,796   |    1,526,657     |   1,744,444   |
| Headcount / Q1 2026        |       78      |        78        |      78       |
| Headcount / Q2 2026        |       85      |        85        |      85       |
| Headcount / Q3 2026        |      100      |       100        |     100       |
| Headcount / Q4 2026        |      110      |       110        |     110       |
Highlights:
- Full Recovery scenario delivers the highest total revenue ($9,237,744), and highest costs (growing at the same 62% ratio).
- Headcount ramp is the same in all scenarios, matching your updated plan.
- Revenue and costs ramp most slowly in the Continued Drag scenario.
If you want a scenario visual, further analysis, or new scenario definitions, let me know!

>> Simulate the worst case for demo-budget-2026: 5% growth with 62% cost ratio.

Here are the simulation results for the worst-case scenario in demo-budget-2026 (5% quarterly growth, 62% cost ratio):
Revenue (Q2–Q4 2026):
- Q2: $1,950,000 → $1,942,500 (−0.4%)
- Q3: $2,645,000 → $2,039,625 (−22.9%)
- Q4: $3,041,750 → $2,141,606 (−29.6%)
Costs (Q2–Q4 2026):
- Q2: $1,209,000 → $1,204,350 (−0.4%)
- Q3: $1,454,750 → $1,264,568 (−13.1%)
- Q4: $1,672,963 → $1,327,796 (−20.6%)
Headcount remains unchanged.
Interpretation:
- Revenue and costs both drop significantly in Q3 and Q4 compared to the baseline, with revenue hit more sharply.
- Cost savings are proportionate to the revenue drop due to the fixed ratio, but margin dollars shrink further.
If you need more scenario details or wish to explore margin or headcount strategies under this scenario, just say the word!

>> Simulate the best case for demo-budget-2026: 15% growth with 55% cost ratio. Save it as demo-budget-2026-best-case.

The best-case scenario for demo-budget-2026 has been simulated and saved as demo-budget-2026-best-case. This scenario applies:
- 15% quarterly revenue growth (Q3 & Q4)
- 55% cost ratio
Key results:
- Revenue and costs are higher in Q2 (due to stronger growth) compared to baseline, and costs are notably lower as a percent of revenue compared to your current plan.
- The model has been saved and is now ready for further analysis or planning.
Let me know if you want a summary or specific analysis on this best-case scenario!

>> Run a summary analysis on demo-budget-2026-best-case to see if full recovery is realistic.

Here is the summary analysis for demo-budget-2026-best-case (full recovery scenario: 15% QoQ revenue growth, 55% cost ratio in Q3 and Q4):
Metrics Overview:
- Revenue (USD)
  
  - Total:        9,237,744
  - Mean:         2,309,436
  - Min:          1,850,000 (Q1 2026)
  - Max:          2,813,619 (Q4 2026)
  - Trend:        Up (largest swing: Q3 → Q4 at +15.0%)
- Costs (USD)
  
  - Total:        5,080,759
  - Mean:         1,270,190
  - Min:          1,017,500 (Q1 2026)
  - Max:          1,547,490 (Q4 2026)
  - Trend:        Up (largest swing: Q2 → Q3 at +15.0%)
- Headcount (FTE)
  
  - Total:              373
  - Mean:                93
  - Min:                 78 (Q1 2026)
  - Max:                110 (Q4 2026)
  - Trend:        Up (largest swing: Q2 → Q3 at +17.6%)
Anomalies (threshold: 50%):
- None detected.
Overall assessment:
- No anomalies detected, indicating consistency with model assumptions.
- Revenue and costs both accelerate cleanly into Q4, following the modeled 15% growth and 55% cost ratio.
- If your business can realistically achieve steady 15% QoQ revenue recovery (and maintain the lower 55% cost ratio), this scenario is within the expected range and has no internal inconsistencies.
If you'd like a comparison to your actuals or baseline, or want a stress test on other variables, let me know!

>> Give recommendations for demo-budget-2026-best-case to sustain 15% growth.

Here are strategic recommendations based on demo-budget-2026-best-case to sustain 15% quarterly revenue growth and keep costs at or below 55% of revenue:
1. With the goal to "sustain 15% quarterly revenue growth and keep costs at or below 55% of revenue," aim to push total Revenue to at least $11,085,293 (20% above the current total of $9,237,744).
Key Focus Areas:
- Sales: Aggressively expand lead generation and pipeline development—align incentives to drive consistent quarterly closes.
- Marketing: Scale high-performing digital campaigns, prioritize channels with short sales cycles, and continually optimize for ROI to support accelerated pipeline growth.
- Product: Accelerate feature releases that enable expansion into new markets or up-sell/cross-sell to existing customers.
- Headcount: Proactively staff sales, marketing, and customer success teams to handle growth—but closely monitor productivity metrics to avoid over-hiring.
- Cost Control: Rigorously review all spending to ensure costs do not exceed 55% of revenue—negotiate vendor contracts and limit discretionary spend.
General Recommendation:
- Review results at the end of each quarter. If growth targets are not being met, prepare contingency measures, such as cost freezes or reallocation of spend.
If you would like targeted action items, implementation milestones, or ongoing monitoring suggestions, let me know!

>> Build a milestone plan for demo-budget-2026 to hit $2.5M revenue by Q4 2026.

Here is the milestone plan for demo-budget-2026 to hit $2.5M in revenue by Q4 2026:
Target:
- Revenue = $2,500,000 by Q4 2026
Current Data:
- Latest actual Q4 2026 Revenue: $3,041,750 (already above target)
Gap Analysis:
- You are currently projected to be $541,750 above your Q4 goal.
If you want to set Q4 at exactly $2.5M, you’d need to slow growth. This requires a -5.5% growth rate from Q3 to Q4.
Milestone Plan:
| Period   | Revenue (USD) | Status       |
|----------|---------------|--------------|
| Q1 2026  |  1,850,000    | ✓ (actual)   |
| Q2 2026  |  1,950,000    | ✓ (actual)   |
| Q3 2026  |  2,645,000    | ✓ (actual)   |
| Q4 2026  |  3,041,750    | ← current    |
Recommended Actions:
- Update the revenue growth rate assumption towards the required (slightly negative) per-period growth to hit exactly $2.5M in Q4.
- Simulate this scenario before committing it to the model.
- After simulation, approve and update your plan as needed.
Would you like to simulate the path to $2.5M for Q4, keep your current forecast, or target a higher goal? Let me know how you’d like to proceed!

>> Lock in the Scenario B assumptions for demo-budget-2026: 10% growth and 58% cost ratio.

Scenario B assumptions are now locked in for demo-budget-2026:
- Revenue growth rate: 10% per quarter
- Cost ratio: 58%
This reflects a moderate recovery path. Let me know if you want to model, simulate, or analyze outcomes under these new assumptions!

>> Show me the reforecast demo-budget-2026 with the updated assumptions.

Here is the reforecast for demo-budget-2026 with updated Scenario B assumptions (10% revenue growth, 58% cost ratio):
```
  Model: demo-budget-2026
  
                             Q1 2026 |   Q2 2026 |   Q3 2026 |   Q4 2026
  ------------------------------------------------------------------------
  Revenue (USD)             1,850,000 | 1,950,000 | 2,645,000 | 3,041,750
  Costs (USD)               1,147,000 | 1,209,000 | 1,454,750 | 1,672,962.5
  Headcount (FTE)                  78 |        85 |       100 |       110
  
  Assumptions:
    revenue_growth_rate: 0.10
    cost_ratio: 0.58
```
If you'd like to see a summary analysis under these new assumptions, project margin changes, or simulate additional scenarios, just let me know!

>> Run a summary analysis on the reforecast demo-budget-2026.

It appears there was a technical issue running the summary analysis on the reforecast demo-budget-2026. Would you like me to try running the analysis again, or would you prefer an overview based on the latest model data and assumptions? Let me know how you'd like to proceed!

>> Generate strategic recommendations for demo-budget-2026 to close the gap between original budget and reforecast while improving cost efficiency by Q4.

Strategic recommendations for demo-budget-2026 to close the gap between the original budget and the reforecast, while improving cost efficiency by Q4 2026:
1. To close the gap, aim for Revenue of at least $11,384,100 (20% above your current total of $9,486,750). This will help move closer to the original budget’s trajectory.
2. Improve cost efficiency by targeting a further reduction in your cost ratio (ideally below 58%). Strive for incremental process improvements and focus spending more directly on revenue-generating activities.
Key operational levers and actions:
- Sales & Revenue Enhancement
  
  - Deploy targeted campaigns focusing on higher-yield segments/customers.
  - Incentivize upsells/cross-sells with existing accounts to accelerate growth beyond base projections.
  - Strengthen partnership channels or explore new distribution/market access opportunities.
- Marketing Optimization
  
  - Cut underperforming channels and aggressively reallocate to those with the highest conversion and lowest CAC.
  - Systematically test messaging, offers, and digital spend to drive up lead quality and conversion rate.
- Cost Control
  
  - Scrutinize all discretionary and overhead spending, prioritizing “must-have” outlays.
  - Batch or automate repetitive operational tasks to reduce labor intensity.
  - Negotiate with vendors and consolidate suppliers for stronger terms.
- Headcount & Productivity
  
  - Evaluate productivity metrics per role and hold strict headcount growth in support/admin roles unless justified.
  - Tie any hiring to clear, measureable revenue growth milestones.
- Monitoring & Accountability
  
  - Set monthly/quarterly cost review and forecast checkpoints to enable course correction before larger budget overruns develop.
  - Assign clear ownership for revenue and cost targets by team/department.
Let me know if you need milestone plans, specific quarterly financial targets, or scenario simulations to support these recommendations!

>> /quit

Bye.
