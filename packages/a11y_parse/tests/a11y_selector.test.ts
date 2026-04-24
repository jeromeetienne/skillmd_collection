// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { A11yTree } from '../src/libs/a11y_tree';
import { A11yQuery } from '../src/libs/a11y_selector';
import { SAMPLE_TREE_TEXT, SIBLINGS_TREE_TEXT } from './test-fixtures';

describe('A11yQuery', () => {
	describe('simple selectors', () => {
		it('matches by role', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button');
			assert.equal(found?.uid, '5');
		});

		it('matches by #uid', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, '#4');
			assert.equal(found?.role, 'link');
		});

		it('matches any role with *', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*');
			assert.equal(all.length, 7);
		});
	});

	describe('attribute selectors', () => {
		it('matches [attr] existence', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link[href]');
			assert.deepEqual(all.map((n) => n.uid), ['4', '7']);
		});

		it('matches [attr=value]', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link[href="/"]');
			assert.equal(found?.uid, '7');
		});

		it('matches [attr^=prefix]', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link[href^="https"]');
			assert.deepEqual(all.map((n) => n.uid), ['4']);
		});

		it('matches [attr$=suffix]', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link[href$=".com"]');
			assert.deepEqual(all.map((n) => n.uid), ['4']);
		});

		it('matches [attr*=substring]', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link[href*="example"]');
			assert.deepEqual(all.map((n) => n.uid), ['4']);
		});

		it('matches the virtual name attribute', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'heading[name="Welcome"]');
			assert.equal(found?.uid, '3');
		});

		it('matches quoted attribute values containing special chars', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link[name="Click \\"here\\""]');
			assert.equal(found?.uid, '4');
		});
	});

	describe('combinators', () => {
		it('descendant combinator (A B)', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'WebArea link');
			assert.deepEqual(all.map((n) => n.uid), ['4', '7']);
		});

		it('child combinator (A > B)', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const direct = A11yQuery.querySelectorAll(root, 'WebArea > link');
			assert.deepEqual(direct, []);
			const viaMain = A11yQuery.querySelectorAll(root, 'main > link');
			assert.deepEqual(viaMain.map((n) => n.uid), ['4']);
		});

		it('union selector (A, B)', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'heading, button');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['3', '5']);
		});
	});

	describe('return semantics', () => {
		it('querySelector returns the first match in walk order', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link');
			assert.equal(found?.uid, '4');
		});

		it('querySelector returns undefined when nothing matches', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'nonexistent');
			assert.equal(found, undefined);
		});

		it('querySelectorAll returns an empty array when nothing matches', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'nonexistent');
			assert.deepEqual(all, []);
		});
	});

	describe('parse errors', () => {
		it('throws on unterminated string', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link[href="unterminated'),
				/Unterminated string/,
			);
		});

		it('throws on unexpected character', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link%'),
				/Unexpected character/,
			);
		});

		it('throws on stray value inside brackets without operator', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link[href "/"]'),
				/Expected operator/,
			);
		});

		it('throws on unknown pseudo-class', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:unknown'),
				/Unknown pseudo-class/,
			);
		});

		it('throws on non-integer inside nth-child()', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:nth-child(abc)'),
				/Expected integer/,
			);
		});

		it('error messages include column number and pointer', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link%'),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.match(err.message, /column \d+/);
					assert.match(err.message, /\^/);
					return true;
				},
			);
		});
	});

	describe('[attr~=value] word-match', () => {
		it('matches when the value is the only word', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link[name~="Home"]');
			assert.equal(found?.uid, '7');
		});

		it('matches the first word of a multi-word name', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button[name~="Submit"]');
			assert.equal(found?.uid, '5');
		});

		it('does not match a substring that is not a whole word', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link[name~="Hom"]');
			assert.equal(found, undefined);
		});

		it('matches wildcard with word-match', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*[name~="Home"]');
			assert.deepEqual(all.map((n) => n.uid), ['7']);
		});
	});

	describe('adjacent sibling combinator (A + B)', () => {
		it('matches the immediately following sibling', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link + button');
			assert.equal(found?.uid, '13');
		});

		it('matches a link immediately after a button', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button + link');
			assert.equal(found?.uid, '14');
		});

		it('matches link immediately after a link', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link + link');
			assert.equal(found?.uid, '15');
		});

		it('returns undefined when no adjacent sibling matches', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button + button');
			assert.equal(found, undefined);
		});

		it('combines with child combinator', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'main > link + button');
			assert.equal(found?.uid, '13');
		});
	});

	describe('general sibling combinator (A ~ B)', () => {
		it('matches all following siblings of the given role', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link ~ link');
			assert.deepEqual(all.map((n) => n.uid), ['14', '15']);
		});

		it('matches a following sibling of a different role', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link ~ button');
			assert.deepEqual(all.map((n) => n.uid), ['13']);
		});

		it('returns empty when no preceding sibling of that role exists', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'button ~ button');
			assert.deepEqual(all, []);
		});
	});

	describe(':first-child pseudo-class', () => {
		it('matches the first child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link:first-child');
			assert.equal(found?.uid, '12');
		});

		it('does not match when the node is not first', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button:first-child');
			assert.equal(found, undefined);
		});

		it('root node never matches :first-child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'WebArea:first-child');
			assert.equal(found, undefined);
		});
	});

	describe(':last-child pseudo-class', () => {
		it('matches the last child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link:last-child');
			assert.equal(found?.uid, '15');
		});

		it('does not match when the node is not last', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button:last-child');
			assert.equal(found, undefined);
		});
	});

	describe(':nth-child(n) pseudo-class', () => {
		it('nth-child(1) matches the first child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link:nth-child(1)');
			assert.equal(found?.uid, '12');
		});

		it('nth-child(2) matches the second child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button:nth-child(2)');
			assert.equal(found?.uid, '13');
		});

		it('nth-child(3) matches the third child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link:nth-child(3)');
			assert.equal(found?.uid, '14');
		});

		it('does not match when position is wrong', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'button:nth-child(1)');
			assert.equal(found, undefined);
		});

		it('stacked :first-child and :nth-child(1) both pass', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const found = A11yQuery.querySelector(root, 'link:first-child:nth-child(1)');
			assert.equal(found?.uid, '12');
		});
	});
});
