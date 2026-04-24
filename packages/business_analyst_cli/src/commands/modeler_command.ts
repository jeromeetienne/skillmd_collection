import { Command } from 'commander'
import { readModel, writeModel, listModels, deleteModel } from '../lib/models.js'
import { recompute } from '../lib/recompute.js'
import { fmt } from '../lib/format.js'
import type { Model, Metric } from '../lib/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpdatePatch {
	data?: Record<string, Record<string, number>>
	assumptions?: Record<string, number>
}

interface SimulateScenario {
	assumption_overrides?: Record<string, number>
	data_overrides?: Record<string, Record<string, number>>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTable(model: Model): string {
	const header = '| Metric | ' + model.dimensions.join(' | ') + ' |'
	const separator = '| --- |' + model.dimensions.map(() => ' --- |').join('')

	const rows = model.metrics.map(metric => {
		const cells = model.dimensions.map(dim => fmt(model.data[metric.name]?.[dim]))
		return `| ${metric.name} (${metric.unit}) | ${cells.join(' | ')} |`
	})

	return [header, separator, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList(): Promise<void> {
	const entries = await listModels()
	console.log(JSON.stringify(entries, null, 2))
}

async function cmdCreate(
	name: string,
	dimensions: string[],
	metrics: string[],
	assumptionsJson: string,
	dataJson: string
): Promise<void> {
	if (!name) { console.error('Error: model name required'); process.exit(1) }
	if (dimensions.length === 0) { console.error('Error: --dimensions required'); process.exit(1) }
	if (metrics.length === 0) { console.error('Error: --metrics required'); process.exit(1) }

	const parsedMetrics: Metric[] = metrics.map(m => {
		const [metricName, unit = ''] = m.split(':')
		return { name: metricName, unit }
	})

	const assumptions: Record<string, number> = assumptionsJson ? JSON.parse(assumptionsJson) : {}
	const data: Record<string, Record<string, number>> = dataJson ? JSON.parse(dataJson) : {}

	for (const metric of parsedMetrics) {
		if (!data[metric.name]) data[metric.name] = {}
	}

	const now = new Date().toISOString()
	const model: Model = {
		name,
		created_at: now,
		updated_at: now,
		dimensions,
		metrics: parsedMetrics,
		assumptions,
		data,
	}

	recompute(model)
	await writeModel(model)
	console.log(`Model created: ${name}`)
}

async function cmdView(name: string): Promise<void> {
	const model = await readModel(name)
	console.log(`\nModel: ${model.name}`)
	console.log(`Updated: ${model.updated_at}\n`)
	console.log(renderTable(model))
	console.log('\nAssumptions:')
	for (const [k, v] of Object.entries(model.assumptions)) {
		console.log(`  ${k}: ${v}`)
	}
	console.log()
}

async function cmdUpdate(name: string, patchJson: string): Promise<void> {
	if (!patchJson) { console.error('Error: --patch required'); process.exit(1) }

	const model = await readModel(name)
	const patch: UpdatePatch = JSON.parse(patchJson)
	const changes: string[] = []

	if (patch.assumptions) {
		for (const [k, v] of Object.entries(patch.assumptions)) {
			const old = model.assumptions[k]
			model.assumptions[k] = v
			changes.push(`  assumptions.${k}: ${old ?? '(new)'} → ${v}`)
		}
	}

	if (patch.data) {
		for (const [metric, dimValues] of Object.entries(patch.data)) {
			if (!model.data[metric]) model.data[metric] = {}
			for (const [dim, value] of Object.entries(dimValues)) {
				const old = model.data[metric][dim]
				model.data[metric][dim] = value
				changes.push(`  data.${metric}.${dim}: ${old ?? '(new)'} → ${value}`)
			}
		}
	}

	recompute(model)
	await writeModel(model)

	console.log(`Model updated: ${name}`)
	for (const c of changes) console.log(c)
}

async function cmdDelete(name: string): Promise<void> {
	if (!name) { console.error('Error: model name required'); process.exit(1) }
	await deleteModel(name)
	console.log(`Model deleted: ${name}`)
}

async function cmdSimulate(name: string, scenarioJson: string, saveAs: string | undefined): Promise<void> {
	if (!scenarioJson) { console.error('Error: --scenario required'); process.exit(1) }

	const model = await readModel(name)
	const scenario: SimulateScenario = JSON.parse(scenarioJson)

	const sim: Model = JSON.parse(JSON.stringify(model))

	const assumptionChanges: string[] = []
	if (scenario.assumption_overrides) {
		for (const [k, v] of Object.entries(scenario.assumption_overrides)) {
			assumptionChanges.push(`${k}: ${sim.assumptions[k] ?? '—'} → ${v}`)
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

	console.log(`\nSimulation: ${name}`)
	if (assumptionChanges.length > 0) {
		console.log(`Scenario: ${assumptionChanges.join(', ')}`)
	}
	console.log()

	console.log('| Metric / Dimension | Before | After | Delta |')
	console.log('| --- | --- | --- | --- |')

	let hasChanges = false
	for (const metric of model.metrics) {
		for (const dim of model.dimensions) {
			const before = model.data[metric.name]?.[dim]
			const after = sim.data[metric.name]?.[dim]
			if (before !== after) {
				hasChanges = true
				const deltaStr = before !== undefined && after !== undefined
					? `${((after - before) / before * 100).toFixed(1)}%`
					: '—'
				console.log(`| ${metric.name} / ${dim} | ${fmt(before)} | ${fmt(after)} | ${deltaStr} |`)
			}
		}
	}

	if (!hasChanges) {
		console.log('  (no changes detected)')
	}
	console.log()

	if (saveAs !== undefined) {
		sim.name = saveAs
		sim.created_at = new Date().toISOString()
		await writeModel(sim)
		console.log(`Model saved as: ${saveAs}`)
	}
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class ModelerCommand {
	static build(): Command {
		const cmd = new Command('modeler').description('Pigment OSS Modeler')

		cmd.command('list')
			.description('List available models')
			.action(() => cmdList())

		cmd.command('create')
			.description('Create a new model')
			.argument('<model-name>', 'Name of the model')
			.requiredOption('--dimensions <values...>', 'Dimension names')
			.requiredOption('--metrics <values...>', 'Metric definitions (Name:Unit)')
			.option('--assumptions <json>', 'Assumptions as JSON object', '')
			.option('--data <json>', 'Initial data as JSON object', '')
			.action((modelName: string, opts: { dimensions: string[]; metrics: string[]; assumptions: string; data: string }) =>
				cmdCreate(modelName, opts.dimensions, opts.metrics, opts.assumptions, opts.data))

		cmd.command('view')
			.description('View a model')
			.argument('<model-name>', 'Name of the model')
			.action((modelName: string) => cmdView(modelName))

		cmd.command('update')
			.description('Update a model with a patch')
			.argument('<model-name>', 'Name of the model')
			.requiredOption('--patch <json>', 'Patch as JSON object')
			.action((modelName: string, opts: { patch: string }) => cmdUpdate(modelName, opts.patch))

		cmd.command('simulate')
			.description('Run a simulation scenario')
			.argument('<model-name>', 'Name of the model')
			.requiredOption('--scenario <json>', 'Scenario as JSON object')
			.option('--save-as <name>', 'Save simulation result as a new model')
			.action((modelName: string, opts: { scenario: string; saveAs?: string }) =>
				cmdSimulate(modelName, opts.scenario, opts.saveAs))

		cmd.command('delete')
			.description('Delete a model')
			.argument('<model-name>', 'Name of the model')
			.action((modelName: string) => cmdDelete(modelName))

		return cmd
	}
}
