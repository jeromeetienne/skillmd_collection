// axtree.ts

export interface AxNode {
	uid: string;
	role: string;
	name?: string;
	attributes: Record<string, string>;
	children: AxNode[];
	parent?: AxNode;
}

export type AxTreeTestFn = (n: AxNode) => boolean;

const LINE_REGEXP =
	/^(\s*)uid=(\S+)\s+(\w+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*(.*)$/;

const ATTR_REGEXP = /(\w+)="((?:[^"\\]|\\.)*)"/g;

export class A11yTree {
	static parse(input: string): AxNode {
		const lines = input.split('\n').filter((l) => l.trim().length > 0);
		if (lines.length === 0) throw new Error('Empty input');

		const stack: Array<{ node: AxNode; indent: number }> = [];
		let root: AxNode | undefined;

		for (const line of lines) {
			const m = LINE_REGEXP.exec(line);
			if (m === null) throw new Error(`Cannot parse line: ${line}`);

			const [, indentStr, uid, role, name, rest] = m;
			const indent = indentStr.length;

			const attributes: Record<string, string> = {};
			for (const a of rest.matchAll(ATTR_REGEXP)) {
				attributes[a[1]] = A11yTree.unescape(a[2]);
			}

			const node: AxNode = {
				uid,
				role,
				name: name !== undefined ? A11yTree.unescape(name) : undefined,
				attributes,
				children: [],
			};

			while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
				stack.pop();
			}

			const parent = stack[stack.length - 1]?.node;
			if (parent !== undefined) {
				node.parent = parent;
				parent.children.push(node);
			} else {
				root = node;
			}

			stack.push({ node, indent });
		}

		if (root === undefined) throw new Error('No root node');
		return root;
	}

	static *walk(node: AxNode): Generator<AxNode> {
		yield node;
		for (const child of node.children) {
			yield* A11yTree.walk(child);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static findOne(root: AxNode, testFn: AxTreeTestFn): AxNode | undefined {
		for (const node of A11yTree.walk(root)) {
			if (testFn(node)) {
				return node;
			}
		}
		return undefined;
	}

	static findAll(root: AxNode, testFn: AxTreeTestFn): AxNode[] {
		const result: AxNode[] = [];
		for (const node of A11yTree.walk(root)) {
			if (testFn(node)) {
				result.push(node);
			}
		}
		return result;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static filterByUid(uid: string): AxTreeTestFn {
		const testFn = function (axNode: AxNode) {
			if (axNode.uid === uid) {
				return true
			}
			return false
		}
		return testFn
	}

	static filterByRole(role: string): AxTreeTestFn {
		const testFn = function (axNode: AxNode) {
			if (axNode.role === role) {
				return true
			}
			return false
		}
		return testFn
	}

	static filterByName(name: string | RegExp): AxTreeTestFn {
		const testFn = function (axNode: AxNode) {
			if (axNode.name === undefined) {
				return false
			}
			if (typeof name === 'string') {
				return axNode.name === name
			} else {
				return name.test(axNode.name)
			}
		}
		return testFn
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Converts an AxNode tree back to its string representation. This is the inverse of the parse method, and the output can 
	 * be parsed back to an identical tree.
	 * 
	 * @param root The root of the tree to stringify.
	 * @returns The string representation of the tree.
	 */
	static stringify(root: AxNode): string {
		const out: string[] = [];
		const write = (node: AxNode, depth: number) => {
			const pad = '  '.repeat(depth);
			const name = node.name !== undefined ? ` "${A11yTree.escape(node.name)}"` : '';
			const attrs = Object.entries(node.attributes)
				.map(([k, v]) => `${k}="${A11yTree.escape(v)}"`)
				.join(' ');
			out.push(`${pad}uid=${node.uid} ${node.role}${name}${attrs ? ' ' + attrs : ''}`);
			for (const child of node.children) write(child, depth + 1);
		};
		write(root, 0);
		return out.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Builds a new tree containing only the specified nodes and all their ancestors. The structure of the tree is 
	 * preserved, but any node that is not an ancestor of one of the specified nodes is removed.
	 * - `axNodes` is typically coming from selector queries
	 * 
	 * @param axNodes The list of nodes to keep, along with all their ancestors. Must be non-empty and all nodes must belong to the same tree.
	 * @returns The root of the new tree containing only the specified nodes and their ancestors.
	 */
	static buildAncestorTree(axNodes: AxNode[]): AxNode {
		if (axNodes.length === 0) throw new Error('axNodes must not be empty');

		const keptUids = new Set<string>();
		for (const node of axNodes) {
			let current: AxNode | undefined = node;
			while (current !== undefined) {
				keptUids.add(current.uid);
				current = current.parent;
			}
		}

		let root: AxNode = axNodes[0];
		while (root.parent !== undefined) {
			root = root.parent;
		}

		return this._cloneNode(root, keptUids);
	}

	/**
	 * Internal method to clone a node and its children, but only keeping the nodes whose uid is in keptUids. 
	 * The parent of the cloned node is set to the provided parent.
	 * 
	 * @param node The node to clone.
	 * @param keptUids A set of uids representing the nodes to keep.
	 * @param parent The parent of the cloned node.
	 * @returns The cloned node.
	 */
	private static _cloneNode(node: AxNode, keptUids: Set<string>, parent?: AxNode): AxNode {
		const cloned: AxNode = {
			uid: node.uid,
			role: node.role,
			name: node.name,
			attributes: { ...node.attributes },
			children: [],
			parent,
		};
		for (const child of node.children) {
			if (keptUids.has(child.uid)) {
				cloned.children.push(this._cloneNode(child, keptUids, cloned));
			}
		}
		return cloned;
	}

	private static unescape(s: string): string {
		return s.replace(/\\(.)/g, '$1');
	}

	private static escape(s: string): string {
		return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}
}
