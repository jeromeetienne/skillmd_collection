import { Command } from 'commander'
import Fs from 'node:fs'
import { readModel, listModels, MODELS_DIR } from '../lib/models.js'
import { fmt, pad, fmtPct } from '../lib/format.js'

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList(): Promise<void> {
	try {
		await Fs.promises.access(MODELS_DIR)
	} catch {
		console.log(JSON.stringify([]))
		console.error(`Note: models directory not found at ${MODELS_DIR}. Create a model with modeler-skill first.`)
		return
	}
	const entries = await listModels()
	console.log(JSON.stringify(entries, null, 2))
}

async function cmdTrend(name: string, metricFilter: string | undefined): Promise<void> {
	const model = await readModel(name)
	const metrics = metricFilter
		? model.metrics.filter(m => m.name === metricFilter)
		: model.metrics

	if (metrics.length === 0) {
		const available = model.metrics.map(m => m.name).join(', ')
		console.error(`Error: metric "${metricFilter}" not found. Available: ${available}`)
		process.exit(1)
	}

	console.log(`\nTrend Analysis: ${name}\n`)

	const colWidth = 12
	const periodWidth = 30

	for (const metric of metrics) {
		console.log(`Metric: ${metric.name} (${metric.unit})`)

		if (model.dimensions.length < 2) {
			console.log('  (single dimension — no period-over-period trend available)')
			console.log()
			continue
		}

		const header =
			pad('Period', periodWidth, 'left') + ' | ' +
			pad('Before', colWidth) + ' | ' +
			pad('After', colWidth) + ' | ' +
			pad('Change%', 10)
		const separator = '-'.repeat(periodWidth + colWidth * 2 + 16)
		console.log('  ' + header)
		console.log('  ' + separator)

		for (let i = 1; i < model.dimensions.length; i++) {
			const fromDim = model.dimensions[i - 1]
			const toDim = model.dimensions[i]
			const before = model.data[metric.name]?.[fromDim]
			const after = model.data[metric.name]?.[toDim]

			const periodLabel = `${fromDim} → ${toDim}`
			let changePctStr = '—'
			if (before !== undefined && after !== undefined) {
				if (before === 0) {
					changePctStr = after > 0 ? '+∞' : after < 0 ? '-∞' : '0.0%'
				} else {
					changePctStr = fmtPct(((after - before) / Math.abs(before)) * 100)
				}
			}

			const row =
				pad(periodLabel, periodWidth, 'left') + ' | ' +
				pad(fmt(before), colWidth) + ' | ' +
				pad(fmt(after), colWidth) + ' | ' +
				pad(changePctStr, 10)
			console.log('  ' + row)
		}
		console.log()
	}
}

async function cmdAnomaly(name: string, threshold: number): Promise<void> {
	if (isNaN(threshold) || threshold < 0) {
		console.error('Error: --threshold must be a non-negative number (e.g. 50 for 50%)')
		process.exit(1)
	}

	const model = await readModel(name)
	console.log(`\nAnomaly Detection: ${name} (threshold: ${threshold}%)\n`)

	let anyFound = false

	for (const metric of model.metrics) {
		const values = model.dimensions
			.map(dim => ({ dim, value: model.data[metric.name]?.[dim] }))
			.filter((e): e is { dim: string; value: number } => e.value !== undefined)

		if (values.length === 0) continue

		const mean = values.reduce((sum, v) => sum + v.value, 0) / values.length

		if (mean === 0) continue

		const anomalies = values.filter(v => Math.abs(((v.value - mean) / Math.abs(mean)) * 100) > threshold)

		if (anomalies.length > 0) {
			anyFound = true
			console.log(`${metric.name} (${metric.unit})  mean=${fmt(Math.round(mean))}`)
			for (const a of anomalies) {
				const devPct = ((a.value - mean) / Math.abs(mean)) * 100
				console.log(`  [ANOMALY] ${a.dim}: ${fmt(a.value)}  (deviation: ${fmtPct(devPct)} from mean)`)
			}
			console.log()
		}
	}

	if (!anyFound) {
		console.log('  No anomalies detected.')
		console.log()
	}
}

async function cmdSummary(name: string): Promise<void> {
	const ANOMALY_THRESHOLD = 50
	const model = await readModel(name)

	console.log(`\nSummary: ${name}`)
	console.log(`Updated: ${model.updated_at}\n`)
	console.log('Metrics Overview:')

	let totalAnomalyCount = 0
	let affectedMetricCount = 0
	const anomalyLines: string[] = []

	for (const metric of model.metrics) {
		const values = model.dimensions
			.map(dim => ({ dim, value: model.data[metric.name]?.[dim] }))
			.filter((e): e is { dim: string; value: number } => e.value !== undefined)

		console.log(`  ${metric.name} (${metric.unit})`)

		if (values.length === 0) {
			console.log('    (no data)')
			continue
		}

		const nums = values.map(v => v.value)
		const total = nums.reduce((s, v) => s + v, 0)
		const mean = total / nums.length
		const min = Math.min(...nums)
		const max = Math.max(...nums)
		const minEntry = values.find(v => v.value === min)!
		const maxEntry = values.find(v => v.value === max)!

		let biggestSwingStr = '—'
		let biggestSwingAbs = 0
		for (let i = 1; i < model.dimensions.length; i++) {
			const fromVal = model.data[metric.name]?.[model.dimensions[i - 1]]
			const toVal = model.data[metric.name]?.[model.dimensions[i]]
			if (fromVal !== undefined && toVal !== undefined && fromVal !== 0) {
				const pct = ((toVal - fromVal) / Math.abs(fromVal)) * 100
				if (Math.abs(pct) > biggestSwingAbs) {
					biggestSwingAbs = Math.abs(pct)
					biggestSwingStr = `${model.dimensions[i - 1]} → ${model.dimensions[i]} at ${fmtPct(pct)}`
				}
			}
		}

		const firstVal = model.data[metric.name]?.[model.dimensions[0]]
		const lastVal = model.data[metric.name]?.[model.dimensions[model.dimensions.length - 1]]
		let trendDir = 'Stable'
		if (firstVal !== undefined && lastVal !== undefined) {
			if (lastVal > firstVal) trendDir = 'Up'
			else if (lastVal < firstVal) trendDir = 'Down'
		}
		const trendStr = nums.length > 1
			? `${trendDir} (largest swing: ${biggestSwingStr})`
			: trendDir

		const labelW = 10
		console.log(`    ${'Total:'.padEnd(labelW)} ${fmt(Math.round(total)).padStart(12)}`)
		console.log(`    ${'Mean:'.padEnd(labelW)} ${fmt(Math.round(mean)).padStart(12)}`)
		console.log(`    ${'Min:'.padEnd(labelW)} ${fmt(min).padStart(12)}  (${minEntry.dim})`)
		console.log(`    ${'Max:'.padEnd(labelW)} ${fmt(max).padStart(12)}  (${maxEntry.dim})`)
		console.log(`    ${'Trend:'.padEnd(labelW)} ${trendStr}`)

		if (mean !== 0) {
			const anomalies = values.filter(v => Math.abs(((v.value - mean) / Math.abs(mean)) * 100) > ANOMALY_THRESHOLD)
			if (anomalies.length > 0) {
				affectedMetricCount++
				totalAnomalyCount += anomalies.length
				const parts = anomalies.map(a => {
					const devPct = ((a.value - mean) / Math.abs(mean)) * 100
					return `${a.dim} is ${fmtPct(devPct)} ${devPct >= 0 ? 'above' : 'below'} mean`
				})
				anomalyLines.push(`  ${metric.name} (${metric.unit}): ${parts.join(', ')}`)
			}
		}
	}

	console.log()
	console.log(`Anomalies (threshold: ${ANOMALY_THRESHOLD}%):`)
	if (anomalyLines.length > 0) {
		for (const line of anomalyLines) console.log(line)
	} else {
		console.log('  None detected.')
	}

	console.log()
	if (totalAnomalyCount > 0) {
		console.log(`Overall: ${totalAnomalyCount} anomaly(ies) detected across ${affectedMetricCount} metric(s). Review model data for data entry errors or intentional spikes.`)
	} else {
		console.log('Overall: No anomalies detected. Model data looks consistent.')
	}
	console.log()
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class AnalystCommand {
	static build(): Command {
		const cmd = new Command('analyst').description('Pigment OSS Analyst')

		cmd.command('list')
			.description('List available models')
			.action(() => cmdList())

		cmd.command('trend')
			.description('Show period-over-period trend analysis')
			.argument('<model-name>', 'Name of the model')
			.option('--metric <name>', 'Filter to a specific metric')
			.action((modelName: string, opts: { metric?: string }) => cmdTrend(modelName, opts.metric))

		cmd.command('anomaly')
			.description('Detect anomalies in model data')
			.argument('<model-name>', 'Name of the model')
			.option('--threshold <pct>', 'Anomaly threshold percentage', '50')
			.action((modelName: string, opts: { threshold: string }) => cmdAnomaly(modelName, Number(opts.threshold)))

		cmd.command('summary')
			.description('Show a full summary of a model')
			.argument('<model-name>', 'Name of the model')
			.action((modelName: string) => cmdSummary(modelName))

		return cmd
	}
}
