import { Command } from 'commander'
import { readModel, listModels } from '../lib/models.js'
import { recompute } from '../lib/recompute.js'
import { fmt, pad, fmtPct } from '../lib/format.js'
import type { Model, Metric } from '../lib/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Scenario {
	name: string
	assumption_overrides?: Record<string, number>
	data_overrides?: Record<string, Record<string, number>>
}

interface MetricStats {
	metric: Metric
	values: Array<{ dim: string; value: number }>
	total: number
	mean: number
	min: { dim: string; value: number } | undefined
	max: { dim: string; value: number } | undefined
	first: { dim: string; value: number } | undefined
	last: { dim: string; value: number } | undefined
	overallChangePct: number | undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStats(model: Model, metric: Metric): MetricStats {
	const values: Array<{ dim: string; value: number }> = []
	for (const dim of model.dimensions) {
		const v = model.data[metric.name]?.[dim]
		if (v !== undefined) values.push({ dim, value: v })
	}

	const total = values.reduce((s, e) => s + e.value, 0)
	const mean = values.length > 0 ? total / values.length : 0

	let min: { dim: string; value: number } | undefined
	let max: { dim: string; value: number } | undefined
	for (const e of values) {
		if (min === undefined || e.value < min.value) min = e
		if (max === undefined || e.value > max.value) max = e
	}

	const first = values[0]
	const last = values[values.length - 1]

	let overallChangePct: number | undefined
	if (first && last && first !== last && first.value !== 0) {
		overallChangePct = ((last.value - first.value) / first.value) * 100
	}

	return { metric, values, total, mean, min, max, first, last, overallChangePct }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList(): Promise<void> {
	const entries = await listModels()
	console.log(JSON.stringify(entries, null, 2))
}

async function cmdRecommend(name: string, goal: string): Promise<void> {
	const model = await readModel(name)

	console.log(`\nRecommendations: ${name}`)
	if (goal) console.log(`Goal: ${goal}`)
	console.log()

	console.log('Model Overview:')
	const statsList = model.metrics.map(m => computeStats(model, m))

	for (const stats of statsList) {
		const trendStr = stats.overallChangePct !== undefined
			? `trend: ${fmtPct(stats.overallChangePct)}`
			: 'trend: n/a'
		const firstStr = stats.first ? `first=${fmt(stats.first.value)}` : 'no data'
		const lastStr = stats.last ? `last=${fmt(stats.last.value)}` : ''
		console.log(
			`  ${pad(`${stats.metric.name} (${stats.metric.unit})`, 18, 'left')}` +
			`  total=${fmt(stats.total)}  mean=${fmt(Math.round(stats.mean))}  ${trendStr}  ${firstStr}  ${lastStr}`
		)
	}

	console.log()
	console.log('Strategic Recommendations:')

	const recs: string[] = []

	for (const stats of statsList) {
		if (stats.values.length === 0) {
			recs.push(`No data found for ${stats.metric.name}. Populate values to enable planning.`)
			continue
		}

		if (stats.max && stats.last && stats.max !== stats.last && stats.last.value < stats.max.value * 0.5) {
			const dropPct = ((stats.last.value - stats.max.value) / stats.max.value) * 100
			recs.push(
				`${stats.metric.name} dropped ${fmtPct(dropPct)} from peak ${fmt(stats.max.value)} (${stats.max.dim}) ` +
				`to ${fmt(stats.last.value)} (${stats.last.dim}). Investigate before projecting forward.`
			)
		}

		if (stats.values.length >= 2) {
			const prev = stats.values[stats.values.length - 2]
			const curr = stats.values[stats.values.length - 1]
			if (prev.value !== 0) {
				const change = ((curr.value - prev.value) / prev.value) * 100
				if (change < -20) {
					recs.push(
						`${stats.metric.name} declined ${fmtPct(change)} from ${prev.dim} to ${curr.dim}. ` +
						`Review drivers and consider a recovery plan.`
					)
				} else if (change > 50) {
					recs.push(
						`${stats.metric.name} surged ${fmtPct(change)} from ${prev.dim} to ${curr.dim}. ` +
						`Validate data accuracy and assess sustainability.`
					)
				}
			}
		}
	}

	const costRatio = model.assumptions['cost_ratio']
	const growthRate = model.assumptions['revenue_growth_rate']

	if (costRatio === undefined) {
		recs.push('cost_ratio assumption is not set. Define it to enable automatic cost recomputation.')
	} else if (costRatio > 0.75) {
		recs.push(`cost_ratio is ${costRatio} (${(costRatio * 100).toFixed(0)}%). Consider targeting below 70% to improve margins.`)
	} else if (costRatio < 0.5) {
		recs.push(`cost_ratio is unusually low at ${costRatio}. Verify this reflects actual costs.`)
	}

	if (growthRate === undefined) {
		recs.push('revenue_growth_rate assumption is not set. Define it to enable period-over-period projections.')
	} else if (growthRate > 0.3) {
		recs.push(`revenue_growth_rate of ${(growthRate * 100).toFixed(0)}% is aggressive. Validate with historical benchmarks.`)
	}

	if (goal) {
		const revenueStats = statsList.find(s => s.metric.name === 'Revenue')
		if (revenueStats && revenueStats.total > 0) {
			const target20 = Math.round(revenueStats.total * 1.2)
			recs.push(`With goal "${goal}", consider targeting Revenue ≥ ${fmt(target20)} (20% above current total of ${fmt(revenueStats.total)}).`)
		}
	}

	if (recs.length === 0) {
		recs.push('Model data looks healthy. No critical issues found.')
	}

	recs.forEach((r, i) => console.log(`  ${i + 1}. ${r}`))
	console.log()
}

async function cmdPlan(
	name: string,
	targetMetric: string,
	targetValue: number,
	targetDimension: string
): Promise<void> {
	if (!targetMetric) { console.error('Error: --target-metric required'); process.exit(1) }
	if (isNaN(targetValue)) { console.error('Error: --target-value must be a number'); process.exit(1) }
	if (!targetDimension) { console.error('Error: --target-dimension required'); process.exit(1) }

	const model = await readModel(name)

	const metric = model.metrics.find(m => m.name === targetMetric)
	if (!metric) {
		console.error(`Error: metric "${targetMetric}" not found in model "${name}"`)
		process.exit(1)
	}

	const dimIdx = model.dimensions.indexOf(targetDimension)
	if (dimIdx === -1) {
		console.error(`Error: dimension "${targetDimension}" not found in model "${name}"`)
		process.exit(1)
	}

	const stats = computeStats(model, metric)

	console.log(`\nAction Plan: ${name}`)
	console.log(`Target: ${targetMetric} = ${fmt(targetValue)} by ${targetDimension}`)
	console.log()

	const precedingDims = model.dimensions.slice(0, dimIdx)
	let latestKnown: { dim: string; value: number } | undefined
	for (const dim of [...precedingDims].reverse()) {
		const v = model.data[targetMetric]?.[dim]
		if (v !== undefined) {
			latestKnown = { dim, value: v }
			break
		}
	}

	const currentAtTarget = model.data[targetMetric]?.[targetDimension]

	const referenceValue = latestKnown?.value ?? currentAtTarget ?? stats.max?.value
	const referenceDim = latestKnown?.dim ?? (currentAtTarget !== undefined ? targetDimension : stats.max?.dim)

	console.log('Current State:')
	if (stats.values.length === 0) {
		console.log(`  No data found for ${targetMetric}. Populate the model first.`)
	} else {
		if (stats.max && stats.last && stats.max.dim !== stats.last.dim) {
			console.log(`  Latest ${targetMetric} value: ${fmt(stats.last.value)} (${stats.last.dim})`)
			console.log(`  Peak ${targetMetric} value:   ${fmt(stats.max.value)} (${stats.max.dim})`)
		} else if (stats.last) {
			console.log(`  Latest ${targetMetric} value: ${fmt(stats.last.value)} (${stats.last.dim})`)
		}
	}

	console.log()
	console.log('Gap Analysis:')

	const gapBase = referenceValue ?? 0
	const gap = targetValue - gapBase
	const gapPct = gapBase !== 0 ? (gap / gapBase) * 100 : undefined

	console.log(`  Reference: ${fmt(gapBase)}${referenceDim ? ` (${referenceDim})` : ''}`)
	console.log(`  Target:    ${fmt(targetValue)}`)
	console.log(`  Gap:       ${fmt(gap)} (${gapPct !== undefined ? fmtPct(gapPct) : 'n/a'})`)

	const remainingPeriods = model.dimensions.slice(
		latestKnown ? model.dimensions.indexOf(latestKnown.dim) + 1 : 0,
		dimIdx + 1
	).length

	if (remainingPeriods > 0 && gapBase > 0) {
		const requiredRate = (Math.pow(targetValue / gapBase, 1 / remainingPeriods) - 1) * 100
		console.log()
		console.log(`Required Growth Rate: ${fmtPct(requiredRate)} per period over ${remainingPeriods} period(s)`)
	}

	console.log()
	console.log('Milestone Plan:')
	const colWidth = 18
	const dimColWidth = 16
	const header = pad('Dimension', dimColWidth, 'left') + ' | ' + pad(`${targetMetric} (${metric.unit})`, colWidth)
	const sep = '-'.repeat(dimColWidth + colWidth + 3)
	console.log('  ' + header)
	console.log('  ' + sep)

	for (const dim of model.dimensions.slice(0, dimIdx + 1)) {
		const actual = model.data[targetMetric]?.[dim]
		const isTarget = dim === targetDimension
		const marker = isTarget ? '  ← target' : actual !== undefined ? '  ✓ (actual)' : ''
		const displayVal = isTarget && actual === undefined ? targetValue : actual
		console.log('  ' + pad(dim, dimColWidth, 'left') + ' | ' + pad(fmt(displayVal), colWidth) + marker)
	}

	console.log()
	console.log('Actions:')
	const actions: string[] = []

	if (stats.max && stats.last && stats.max.dim !== stats.last.dim && stats.last.value < stats.max.value * 0.5) {
		actions.push(`Investigate the drop from ${fmt(stats.max.value)} (${stats.max.dim}) to ${fmt(stats.last.value)} (${stats.last.dim}) before projecting.`)
	}

	if (model.assumptions['revenue_growth_rate'] === undefined) {
		actions.push('Set revenue_growth_rate assumption in the model to enable automatic milestone recomputation.')
	} else {
		actions.push(`Update revenue_growth_rate to match the required per-period growth rate above.`)
	}

	actions.push(`Run \`modeler-skill simulate\` with the required growth rate to preview milestones.`)
	actions.push(`After simulation, use \`modeler-skill update\` to commit the approved plan to the model.`)

	actions.forEach(a => console.log(`  - ${a}`))
	console.log()
}

async function cmdCompare(name: string, scenariosJson: string): Promise<void> {
	if (!scenariosJson) { console.error('Error: --scenarios required'); process.exit(1) }

	const model = await readModel(name)
	let scenarios: Scenario[]
	try {
		scenarios = JSON.parse(scenariosJson)
	} catch {
		console.error('Error: --scenarios must be valid JSON')
		process.exit(1)
	}

	if (!Array.isArray(scenarios) || scenarios.length === 0) {
		console.error('Error: --scenarios must be a non-empty JSON array')
		process.exit(1)
	}

	const simulations: Array<{ scenario: Scenario; model: Model }> = scenarios.map(scenario => {
		const sim: Model = JSON.parse(JSON.stringify(model))

		if (scenario.assumption_overrides) {
			for (const [k, v] of Object.entries(scenario.assumption_overrides)) {
				sim.assumptions[k] = v
			}
		}
		if (scenario.data_overrides) {
			for (const [metric, dimValues] of Object.entries(scenario.data_overrides)) {
				if (!sim.data[metric]) sim.data[metric] = {}
				for (const [dim, value] of Object.entries(dimValues)) {
					sim.data[metric][dim] = value
				}
			}
		}

		const forceGrowth = !!scenario.assumption_overrides
		recompute(sim, forceGrowth)

		return { scenario, model: sim }
	})

	console.log(`\nScenario Comparison: ${name}`)
	console.log()

	for (const { scenario } of simulations) {
		const overrides: string[] = []
		if (scenario.assumption_overrides) {
			for (const [k, v] of Object.entries(scenario.assumption_overrides)) {
				const base = model.assumptions[k]
				overrides.push(`${k}: ${base ?? '—'} → ${v}`)
			}
		}
		if (overrides.length > 0) {
			console.log(`  ${scenario.name}: ${overrides.join(', ')}`)
		}
	}
	console.log()

	const labelWidth = 28
	const colWidth = 12

	const headerCols = simulations.map(s => pad(s.scenario.name, colWidth))
	console.log(pad('', labelWidth, 'left') + ' | ' + headerCols.join(' | '))
	console.log('-'.repeat(labelWidth + simulations.length * (colWidth + 3)))

	const totals: Record<string, Record<string, number>> = {}

	for (const metric of model.metrics) {
		for (const dim of model.dimensions) {
			const label = pad(`${metric.name} / ${dim}`, labelWidth, 'left')
			const cells = simulations.map(({ scenario, model: sim }) => {
				const v = sim.data[metric.name]?.[dim]
				if (!totals[metric.name]) totals[metric.name] = {}
				totals[metric.name][scenario.name] = (totals[metric.name][scenario.name] ?? 0) + (v ?? 0)
				return pad(fmt(v), colWidth)
			})
			console.log(label + ' | ' + cells.join(' | '))
		}
		console.log()
	}

	console.log('Best scenario per metric (by total):')
	for (const metric of model.metrics) {
		const metricTotals = totals[metric.name]
		if (!metricTotals) continue

		const sorted = Object.entries(metricTotals).sort(([, a], [, b]) => b - a)
		const [bestName, bestTotal] = sorted[0]
		const baseTotal = totals[metric.name][simulations[0].scenario.name] ?? 0
		const vsBase = baseTotal !== 0 && bestName !== simulations[0].scenario.name
			? ` (${fmtPct(((bestTotal - baseTotal) / baseTotal) * 100)} vs ${simulations[0].scenario.name})`
			: ''

		console.log(`  ${metric.name} (${metric.unit}): ${bestName} = ${fmt(bestTotal)}${vsBase}`)
	}
	console.log()
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class PlannerCommand {
	static build(): Command {
		const cmd = new Command('planner').description('Pigment OSS Planner')

		cmd.command('list')
			.description('List available models')
			.action(() => cmdList())

		cmd.command('recommend')
			.description('Get recommendations for a model')
			.argument('<model-name>', 'Name of the model')
			.option('--goal <text>', 'Planning goal', '')
			.action((modelName: string, opts: { goal: string }) => cmdRecommend(modelName, opts.goal))

		cmd.command('plan')
			.description('Create an action plan to reach a target')
			.argument('<model-name>', 'Name of the model')
			.requiredOption('--target-metric <name>', 'Target metric name')
			.requiredOption('--target-value <num>', 'Target numeric value')
			.requiredOption('--target-dimension <dim>', 'Target dimension')
			.action((modelName: string, opts: { targetMetric: string; targetValue: string; targetDimension: string }) =>
				cmdPlan(modelName, opts.targetMetric, parseFloat(opts.targetValue), opts.targetDimension))

		cmd.command('compare')
			.description('Compare multiple scenarios')
			.argument('<model-name>', 'Name of the model')
			.requiredOption('--scenarios <json>', 'Scenarios as JSON array')
			.action((modelName: string, opts: { scenarios: string }) => cmdCompare(modelName, opts.scenarios))

		return cmd
	}
}
