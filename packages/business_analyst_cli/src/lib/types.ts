export interface Metric {
	name: string
	unit: string
}

export interface Model {
	name: string
	created_at: string
	updated_at: string
	dimensions: string[]
	metrics: Metric[]
	assumptions: Record<string, number>
	data: Record<string, Record<string, number>>
}
