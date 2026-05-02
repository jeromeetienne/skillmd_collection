// axtree.ts

import { A11yDisplay } from './a11y_display.js';

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
	/**
	 * Parses a string representation of an accessibility tree into an AxNode tree. 
	 * - The input format is the one produced by the `stringifyTree` method, and is a line-based format where each line represents 
	 *   a node with its attributes, and indentation represents the parent-child relationships between nodes.
	 * 
	 * @param input The string representation of the accessibility tree.
	 * @returns The root node of the parsed accessibility tree.
	 */
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

	/**
	 * Walks the tree in depth-first order, yielding each node. The input node is also yielded.
	 * 
	 * @param rootNode The root of the subtree to walk.
	 */
	static *walk(rootNode: AxNode): Generator<AxNode> {
		yield rootNode;
		for (const childNode of rootNode.children) {
			yield* A11yTree.walk(childNode);
		}
	}

	/**
	 * Creates a deep clone of the given AxNode and all its children. The parent of the cloned node is set to undefined.
	 * 
	 * @param axNode The node to clone.
	 * @returns A deep clone of the given node.
	 */
	static clone(axNode: AxNode): AxNode {
		const cloned: AxNode = {
			uid: axNode.uid,
			role: axNode.role,
			name: axNode.name,
			attributes: { ...axNode.attributes },
			children: [],
		};
		for (const child of axNode.children) {
			const clonedChild = A11yTree.clone(child);
			clonedChild.parent = cloned;
			cloned.children.push(clonedChild);
		}
		return cloned;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * TODO add the others modification operations that we need
	 * - copy the one from the DOM
	 * - .appendChild, .insertBefore, .removeChild, .replaceChild
	 */

	/**
	 * Removes a node from the tree. The children of the removed node are also removed. If the removed node is the root, an error is thrown.
	 * - inspired by `domElement.remove()` - https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
	 * 
	 * @param axTree The root of the tree.
	 * @param axNodeToRemove The node to remove.
	 */
	static remove(axTree: AxNode, axNodeToRemove: AxNode): void {
		if (axNodeToRemove.parent === undefined) {
			throw new Error('Cannot remove the root node');
		}
		const parent = axNodeToRemove.parent;
		parent.children = parent.children.filter((child) => child !== axNodeToRemove);
		axNodeToRemove.parent = undefined;
	}

	/**
	 * Returns the previous sibling of the given node, or undefined if there is no previous sibling. If the given node has no parent, undefined is returned.
	 * - inspired by `domElement.previousSibling` - https://developer.mozilla.org/en-US/docs/Web/API/Node/previousSibling
	 * 
	 * @param axNode The node whose previous sibling is to be found.
	 * @returns The previous sibling node, or undefined if there is no previous sibling.
	 */
	static previousSibling(axNode: AxNode): AxNode | undefined {
		if (axNode.parent === undefined) return undefined;
		const axNodeParent = axNode.parent;
		const index = axNodeParent.children.findIndex((child) => child.uid === axNode.uid);
		if (index === -1 || index === 0) return undefined;
		return axNodeParent.children[index - 1];
	}

	/**
	 * Returns the next sibling of the given node, or undefined if there is no next sibling. If the given node has no parent, undefined is returned.
	 * - inspired by `domElement.nextSibling` - https://developer.mozilla.org/en-US/docs/Web/API/Node/nextSibling
	 * 
	 * @param axNode The node whose next sibling is to be found.
	 * @returns The next sibling node, or undefined if there is no next sibling.
	 */
	static nextSibling(axNode: AxNode): AxNode | undefined {
		if (axNode.parent === undefined) return undefined;
		const axNodeParent = axNode.parent;
		const index = axNodeParent.children.findIndex((child) => child.uid === axNode.uid);
		if (index === -1 || index === axNodeParent.children.length - 1) return undefined;
		return axNodeParent.children[index + 1];
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
	//	backwards compatibility with the old A11yDisplay API, to avoid having to change the CLI code
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// /**
	//  * Converts an AxNode tree (the given node and all its children) back to its string representation.
	//  * This is the inverse of the parse method, and the output can be parsed back to an identical tree.
	//  * For a single node without its children, use `stringifyNode` instead.
	//  * @deprecated Use `A11yDisplay.stringifyTree` instead.
	//  * @param root The root of the tree to stringify.
	//  * @returns The string representation of the tree.
	//  */
	// static stringifyTree(root: AxNode): string {
	// 	return A11yDisplay.stringifyTree(root);
	// }

	// /**
	//  * Converts a single AxNode (without its children) to its one-line string representation.
	//  * @deprecated Use `A11yDisplay.stringifyNode` instead.
	//  * @param node The node to stringify.
	//  * @returns The one-line string representation of the node.
	//  */
	// static stringifyNode(node: AxNode): string {
	// 	return A11yDisplay.stringifyNode(node);
	// }

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Builds a new tree containing the specified nodes and, optionally, their ancestors and/or children.
	 * - When `options.withAncestors === true` (default): the original root is preserved and pruned so that
	 *   only the matched nodes and their ancestors remain.
	 * - When `options.withChildren === true`: each matched node retains its full children subtree.
	 * - When `options.withAncestors === false`: a synthetic `FakeRoot` node (`role: 'FakeRoot'`,
	 *   `uid: 'fake-root'`) is created and the matched nodes (each cloned with its children if
	 *   requested) are attached as its direct children. This keeps the return type a single AxNode
	 *   even when the matches don't share a real ancestor in the result.
	 * - `axNodes` is typically coming from selector queries.
	 *
	 * @param axNodes The list of matched nodes. Must be non-empty and all nodes must belong to the same tree.
	 * @param options Flags controlling whether ancestors and/or children are included. Defaults to `{ withAncestors: true, withChildren: false }`.
	 * @returns The root of the new tree.
	 */
	static buildSubsetTree(axNodes: AxNode[], { withAncestors, withChildren }: {
		withAncestors: boolean;
		withChildren: boolean;
	}): AxNode {
		// sanity check - all nodes must belong to the same tree, so they should have the same root
		if (axNodes.length === 0) throw new Error('axNodes must not be empty');

		// Collect the uids of all nodes to keep (the matched nodes and, optionally, their ancestors and/or children)
		const keptUids = new Set<string>();
		for (const node of axNodes) {
			keptUids.add(node.uid);

			if (withAncestors === true) {
				let current: AxNode | undefined = node.parent;
				while (current !== undefined) {
					keptUids.add(current.uid);
					current = current.parent;
				}
			}

			if (withChildren === true) {
				for (const descendant of A11yTree.walk(node)) {
					keptUids.add(descendant.uid);
				}
			}
		}

		// Real-root path: clone the original tree from its root, pruning by keptUids.
		if (withAncestors === true) {
			let root: AxNode = axNodes[0];
			while (root.parent !== undefined) {
				root = root.parent;
			}
			return this._cloneNode(root, keptUids);
		}

		// FakeRoot path: synthesize a root and attach a clone of each matched node as a direct child.
		const fakeRoot: AxNode = {
			uid: 'fake-root',
			role: 'FakeRoot',
			attributes: {},
			children: [],
			parent: undefined,
		};
		for (const node of axNodes) {
			fakeRoot.children.push(this._cloneNode(node, keptUids, fakeRoot));
		}
		return fakeRoot;
	}

	/**
	 * Backward-compatible wrapper around `buildSubsetTree({ withAncestors: true })`.
	 * Preserved so existing callers (e.g. fastbrowser_cli) keep working unchanged.
	 *
	 * @deprecated Use `buildSubsetTree` with `withAncestors: true` instead, which is more flexible and can also include children if needed.
	 * @param axNodes The list of nodes to keep, along with all their ancestors. Must be non-empty and all nodes must belong to the same tree.
	 * @returns The root of the new tree containing only the specified nodes and their ancestors.
	 */
	static buildAncestorTree(axNodes: AxNode[]): AxNode {
		return this.buildSubsetTree(axNodes, {
			withAncestors: true,
			withChildren: false,
		});
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
}
