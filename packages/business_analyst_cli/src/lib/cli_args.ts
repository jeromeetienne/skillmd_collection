export function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string | string[]> } {
	const positional: string[] = []
	const flags: Record<string, string | string[]> = {}
	let i = 0
	while (i < argv.length) {
		const arg = argv[i]
		if (arg.startsWith('--')) {
			const key = arg.slice(2)
			const values: string[] = []
			i++
			while (i < argv.length && !argv[i].startsWith('--')) {
				values.push(argv[i])
				i++
			}
			flags[key] = values.length === 1 ? values[0] : values
		} else {
			positional.push(arg)
			i++
		}
	}
	return { positional, flags }
}

export function flag(flags: Record<string, string | string[]>, key: string): string | undefined {
	const v = flags[key]
	return Array.isArray(v) ? v[0] : v
}

export function flagArray(flags: Record<string, string | string[]>, key: string): string[] {
	const v = flags[key]
	if (!v) return []
	return Array.isArray(v) ? v : [v]
}
