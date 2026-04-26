# Ai Workflow to Shell Scripts

## Introduction
This document explains how to use SKILL.md files to create shell scripts from AI-assisted workflows.

### What SKILL.md files are
- SKILL.md files contain knowledge — that's why they're called *skills*.
- To interact with the outside world, a skill launches shell commands from the command line.

### The AI-to-script workflow
- You collaborate with an AI agent that uses a skill, which in turn runs a sequence of shell commands to accomplish a task.
- Once the workflow is proven, you ask the agent to extract those commands into a standalone shell script — a *recipe* that reproduces the same workflow without an agent in the loop.

### Why this matters
- **First run (with AI):** expensive and relatively slow, since every step goes through the agent.
- **Subsequent runs (script only):** faster and cheaper — no AI calls, just the recorded recipe doing the same work.
- **Reproducibility:** same input produces the same output every time; the run-to-run variance of an agent disappears.
- **Auditability:** the script is a plain, reviewable artifact — you can read it, diff it, and commit it, instead of trusting opaque agent reasoning.
- **Automation-friendly:** the recipe drops cleanly into cron, CI/CD, Makefiles, or other scripts — places where keeping an agent in the loop isn't practical.
- **Offline / air-gapped:** runs with no internet access and no API key, which matters for restricted or disconnected environments.

