import Fs from 'node:fs'
import Path from 'node:path'
import type { Model } from './types.js'

export const MODELS_DIR = Path.resolve(__dirname, '../../_data')

export function modelPath(name: string): string {
	return Path.join(MODELS_DIR, `${name}.json`)
}

export async function readModel(name: string): Promise<Model> {
	const p = modelPath(name)
	try {
		const raw = await Fs.promises.readFile(p, 'utf8')
		return JSON.parse(raw) as Model
	} catch {
		console.error(`Error: model "${name}" not found at ${p}`)
		process.exit(1)
	}
}

export async function writeModel(model: Model): Promise<void> {
	await Fs.promises.mkdir(MODELS_DIR, { recursive: true })
	model.updated_at = new Date().toISOString()
	await Fs.promises.writeFile(modelPath(model.name), JSON.stringify(model, null, 2), 'utf8')
}

export async function deleteModel(name: string): Promise<void> {
	const p = modelPath(name)
	try {
		await Fs.promises.unlink(p)
	} catch {
		console.error(`Error: model "${name}" not found at ${p}`)
		process.exit(1)
	}
}

export async function listModels(): Promise<Array<{ name: string; updated_at: string }>> {
	await Fs.promises.mkdir(MODELS_DIR, { recursive: true })
	const files = await Fs.promises.readdir(MODELS_DIR)
	const jsonFiles = files.filter(f => f.endsWith('.json'))

	if (jsonFiles.length === 0) return []

	return Promise.all(
		jsonFiles.map(async f => {
			const raw = await Fs.promises.readFile(Path.join(MODELS_DIR, f), 'utf8')
			const m = JSON.parse(raw) as Model
			return { name: m.name, updated_at: m.updated_at }
		})
	)
}
