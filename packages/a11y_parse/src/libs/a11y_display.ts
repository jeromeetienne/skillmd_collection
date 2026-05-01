// a11y_display.ts

import type { AxNode } from './a11y_tree.js';

export class A11yDisplay {
	/**
	 * Converts an AxNode tree (the given node and all its descendants) back to its string representation.
	 * This is the inverse of `A11yTree.parse`, and the output can be parsed back to an identical tree.
	 * For a single node without its descendants, use `stringifyNode` instead.
	 *
	 * @param root The root of the tree to stringify.
	 * @returns The string representation of the tree.
	 */
	static stringifyTree(root: AxNode): string {
		const out: string[] = [];
		const write = (node: AxNode, depth: number) => {
			const pad = '  '.repeat(depth);
			out.push(`${pad}${A11yDisplay.stringifyNode(node)}`);
			for (const child of node.children) {
				write(child, depth + 1);
			}
		};
		write(root, 0);
		return out.join('\n');
	}

	/**
	 * Converts a single AxNode (without its descendants) to its one-line string representation.
	 *
	 * @param node The node to stringify.
	 * @returns The one-line string representation of the node.
	 */
	static stringifyNode(node: AxNode): string {
		const name = node.name !== undefined ? ` "${A11yDisplay.escape(node.name)}"` : '';
		const attributes = Object.entries(node.attributes)
			.map(([attrKey, attrValue]) => `${attrKey}="${A11yDisplay.escape(attrValue)}"`)
			.join(' ');
		return `uid=${node.uid} ${node.role}${name}${attributes ? ' ' + attributes : ''}`;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static escape(s: string): string {
		return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}
}
