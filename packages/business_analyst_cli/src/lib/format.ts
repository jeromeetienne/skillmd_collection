export function fmt(value: number | undefined): string {
	if (value === undefined || isNaN(value)) return '—'
	return value.toLocaleString('en-US')
}

export function pad(s: string, width: number, align: 'left' | 'right' = 'right'): string {
	if (align === 'left') return s.padEnd(width)
	return s.padStart(width)
}

export function fmtPct(value: number): string {
	const sign = value >= 0 ? '+' : ''
	return `${sign}${value.toFixed(1)}%`
}
