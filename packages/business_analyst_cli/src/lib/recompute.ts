import type { Model } from './types.js'

export function recompute(model: Model, forceGrowth = false): void {
	const { assumptions, data, dimensions } = model
	const costRatio = assumptions['cost_ratio']
	const growthRate = assumptions['revenue_growth_rate']

	// 1. Recompute Revenue growth across dimensions if growth_rate is set
	if (growthRate !== undefined && data['Revenue']) {
		for (let i = 1; i < dimensions.length; i++) {
			const prev = data['Revenue'][dimensions[i - 1]]
			if (prev !== undefined && (forceGrowth || data['Revenue'][dimensions[i]] === undefined)) {
				data['Revenue'][dimensions[i]] = Math.round(prev * (1 + growthRate))
			}
		}
	}

	// 2. Recompute Costs from Revenue × cost_ratio (after revenue is fully populated)
	if (costRatio !== undefined && data['Revenue'] && data['Costs']) {
		for (const dim of dimensions) {
			if (data['Revenue'][dim] !== undefined && (forceGrowth || data['Costs'][dim] === undefined)) {
				data['Costs'][dim] = Math.round(data['Revenue'][dim] * costRatio)
			}
		}
	}
}
