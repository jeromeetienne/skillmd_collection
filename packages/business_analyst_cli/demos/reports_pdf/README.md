# Agents descriptions
- the business analyst multi-agent has 4 agents: modeler, analyst, planner, and orchestrator
  - analyst: Analyze business models for trends, anomalies, and insights
  - modeler: Build, view, update, delete and simulate structured business models
  - planner: Generate strategic recommendations, milestone plans, and scenario comparisons for business models.

# List of PDF reports for each demo
- each demo is a set of inputs sent to the business analyst multi-agent
- for each demo, we generate a markdown report with the description of the demo, the inputs, the outputs, and the analysis of the results
- we then convert the markdown report to a PDF file using the md-to-pdf library
  - NOTE: some markdown formating may glitchy but it is a demo