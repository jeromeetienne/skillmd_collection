// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { A11yTree } from '../src/libs/a11y_tree.js';
import type { AxNode } from '../src/libs/a11y_tree.js';
import { SAMPLE_TREE_TEXT } from './test-fixtures.js';
import { A11yDisplay } from '../src/index.js';

const collectUids = (root: AxNode): string[] => {
	const uids: string[] = [];
	for (const node of A11yTree.walk(root)) {
		uids.push(node.uid);
	}
	return uids;
};

describe('A11yTree', () => {
	describe('parse', () => {
		it('parses a single root node', () => {
			const root = A11yTree.parse('uid=1 WebArea "Root"');
			assert.equal(root.uid, '1');
			assert.equal(root.role, 'WebArea');
			assert.equal(root.name, 'Root');
			assert.equal(root.children.length, 0);
			assert.equal(root.parent, undefined);
		});

		it('parses nested indentation into a parent/child tree', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.equal(root.uid, '1');
			assert.equal(root.children.length, 2);
			assert.equal(root.children[0].uid, '2');
			assert.equal(root.children[0].parent, root);
			assert.equal(root.children[0].children[0].uid, '3');
			assert.equal(root.children[0].children[0].parent, root.children[0]);
		});

		it('parses name strings including escaped quotes', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const link = A11yTree.findOne(root, A11yTree.filterByUid('4'));
			assert.notEqual(link, undefined);
			assert.equal(link?.name, 'Click "here"');
		});

		it('parses attributes into the attributes record', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const link = A11yTree.findOne(root, A11yTree.filterByUid('4'));
			assert.deepEqual(link?.attributes, { href: 'https://example.com' });
			const button = A11yTree.findOne(root, A11yTree.filterByUid('5'));
			assert.deepEqual(button?.attributes, { disabled: 'true' });
		});

		it('parses a node without a name', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const main = A11yTree.findOne(root, A11yTree.filterByUid('2'));
			assert.equal(main?.name, undefined);
		});

		it('throws on empty input', () => {
			assert.throws(() => A11yTree.parse(''), /Empty input/);
			assert.throws(() => A11yTree.parse('   \n  \n'), /Empty input/);
		});

		it('throws on a malformed line', () => {
			assert.throws(
				() => A11yTree.parse('this is not a valid line'),
				/Cannot parse line/,
			);
		});
	});

	describe('walk', () => {
		it('yields nodes in depth-first pre-order', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.deepEqual(collectUids(root), ['1', '2', '3', '4', '5', '6', '7']);
		});
	});

	describe('findOne / findAll', () => {
		it('findOne returns the matching node', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yTree.findOne(root, (n) => n.role === 'button');
			assert.equal(found?.uid, '5');
		});

		it('findOne returns undefined when nothing matches', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yTree.findOne(root, (n) => n.role === 'nothing');
			assert.equal(found, undefined);
		});

		it('findAll returns every match', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const links = A11yTree.findAll(root, (n) => n.role === 'link');
			assert.deepEqual(links.map((n) => n.uid), ['4', '7']);
		});

		it('findAll returns an empty array when nothing matches', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const none = A11yTree.findAll(root, (n) => n.role === 'nothing');
			assert.deepEqual(none, []);
		});
	});

	describe('filterByUid', () => {
		it('matches the node with the given uid', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yTree.findOne(root, A11yTree.filterByUid('3'));
			assert.equal(found?.role, 'heading');
		});
	});

	describe('filterByRole', () => {
		it('matches every node with the given role', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const links = A11yTree.findAll(root, A11yTree.filterByRole('link'));
			assert.equal(links.length, 2);
		});
	});

	describe('filterByName', () => {
		it('matches by string equality', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yTree.findOne(root, A11yTree.filterByName('Welcome'));
			assert.equal(found?.uid, '3');
		});

		it('matches by RegExp', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const matches = A11yTree.findAll(root, A11yTree.filterByName(/^Home|Welcome$/));
			assert.deepEqual(matches.map((n) => n.uid).sort(), ['3', '7']);
		});

		it('returns false when name is undefined', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const main = A11yTree.findOne(root, A11yTree.filterByUid('2'));
			assert.equal(main?.name, undefined);
			assert.equal(A11yTree.filterByName('anything')(main as AxNode), false);
			assert.equal(A11yTree.filterByName(/.*/)(main as AxNode), false);
		});
	});

	describe('stringifyTree', () => {
		it('round-trips through parse', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const text = A11yDisplay.stringifyTree(root);
			const reparsed = A11yTree.parse(text);

			const normalize = (n: AxNode): unknown => ({
				uid: n.uid,
				role: n.role,
				name: n.name,
				attributes: n.attributes,
				children: n.children.map(normalize),
			});

			assert.deepEqual(normalize(reparsed), normalize(root));
		});

		it('escapes quotes and backslashes in names and attribute values', () => {
			const root: AxNode = {
				uid: '1',
				role: 'text',
				name: 'He said "hi"\\there',
				attributes: { data: 'a"b\\c' },
				children: [],
			};
			const text = A11yDisplay.stringifyTree(root);
			const reparsed = A11yTree.parse(text);
			assert.equal(reparsed.name, 'He said "hi"\\there');
			assert.equal(reparsed.attributes.data, 'a"b\\c');
		});
	});

	describe('buildAncestorTree', () => {
		it('throws on empty input', () => {
			assert.throws(() => A11yTree.buildAncestorTree([]), /must not be empty/);
		});

		it('returns a tree rooted at the original root', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const button = A11yTree.findOne(root, A11yTree.filterByUid('5')) as AxNode;
			const pruned = A11yTree.buildAncestorTree([button]);
			assert.equal(pruned.uid, '1');
			assert.equal(pruned.parent, undefined);
		});

		it('prunes siblings not on the ancestor path', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const button = A11yTree.findOne(root, A11yTree.filterByUid('5')) as AxNode;
			const pruned = A11yTree.buildAncestorTree([button]);
			const uids = collectUids(pruned);
			assert.deepEqual(uids, ['1', '2', '5']);
		});

		it('keeps the union of ancestor paths when given multiple nodes', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const heading = A11yTree.findOne(root, A11yTree.filterByUid('3')) as AxNode;
			const homeLink = A11yTree.findOne(root, A11yTree.filterByUid('7')) as AxNode;
			const pruned = A11yTree.buildAncestorTree([heading, homeLink]);
			assert.deepEqual(collectUids(pruned).sort(), ['1', '2', '3', '6', '7']);
		});

		it('wires parents on cloned nodes and shares no references with the original', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const button = A11yTree.findOne(root, A11yTree.filterByUid('5')) as AxNode;
			const pruned = A11yTree.buildAncestorTree([button]);
			const main = pruned.children[0];
			assert.equal(main.parent, pruned);
			assert.equal(main.children[0].parent, main);
			assert.notEqual(main, root.children[0]);
			assert.notEqual(main.attributes, root.children[0].attributes);
		});
	});
});
