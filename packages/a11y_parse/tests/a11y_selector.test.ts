// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { A11yTree } from '../src/libs/a11y_tree.js';
import { A11yQuery } from '../src/libs/a11y_selector.js';
import { SAMPLE_TREE_TEXT, SIBLINGS_TREE_TEXT, RELATIVE_HAS_TREE_TEXT } from './test-fixtures.js';

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

		it('throws on empty :is() argument list', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:is()'),
				/Expected selector/,
			);
		});

		it('throws on empty :has() argument list', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:has()'),
				/Expected selector/,
			);
		});

		it('throws on missing closing paren in :not(', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:not('),
				/Expected '\)' to close not\(/,
			);
		});

		it('throws on missing closing paren in :is(button', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, 'link:is(button'),
				/Expected '\)' to close is\(/,
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

	describe(':is() and :where() pseudo-classes', () => {
		it(':is(heading, button) matches the union', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, ':is(heading, button)');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['3', '5']);
		});

		it(':where(heading, button) matches the same as :is()', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, ':where(heading, button)');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['3', '5']);
		});

		it('link:is([href^="https"], [href="/"]) matches both links', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:is([href^="https"], [href="/"])');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['4', '7']);
		});

		it('stacks with attribute filters: link:is([href])', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:is([href])');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['4', '7']);
		});
	});

	describe(':not() pseudo-class', () => {
		it('link:not(:first-child) excludes the first child', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:not(:first-child)');
			assert.deepEqual(all.map((n) => n.uid), ['14', '15']);
		});

		it('*:not(link) excludes link nodes', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:not(link)');
			assert.deepEqual(all.map((n) => n.uid), ['10', '11', '13']);
		});

		it('link:not([href="/a"]) excludes a specific href', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:not([href="/a"])');
			assert.deepEqual(all.map((n) => n.uid), ['14', '15']);
		});

		it('main > *:not(button) returns non-button children of main', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'main > *:not(button)');
			assert.deepEqual(all.map((n) => n.uid), ['12', '14', '15']);
		});

		it(':not(link, button) excludes links and buttons', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:not(link, button)');
			assert.deepEqual(all.map((n) => n.uid), ['10', '11']);
		});
	});

	describe(':has() pseudo-class', () => {
		it('*:has(button) returns ancestors of the button', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(button)');
			assert.deepEqual(all.map((n) => n.uid), ['1', '2']);
		});

		it('*:has(link[href="/"]) returns ancestors of the matching link', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(link[href="/"])');
			assert.deepEqual(all.map((n) => n.uid), ['1', '6']);
		});

		it('*:has(heading) returns ancestors of the heading', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(heading)');
			assert.deepEqual(all.map((n) => n.uid), ['1', '2']);
		});

		it('link:has(*) returns nothing because links are leaves', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:has(*)');
			assert.deepEqual(all, []);
		});

		it('nested :not(:has(link)) returns nodes with no link descendant', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:not(:has(link))');
			assert.deepEqual(all.map((n) => n.uid).sort(), ['3', '4', '5', '7']);
		});
	});

	describe(':has() with relative selectors', () => {
		it('*:has(> button) matches only nodes with a direct button child', () => {
			const root = A11yTree.parse(RELATIVE_HAS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(> button)');
			assert.deepEqual(all.map((n) => n.uid), ['2', '8']);
		});

		it('*:has(button) still matches all ancestors of a button (regression)', () => {
			const root = A11yTree.parse(RELATIVE_HAS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(button)');
			assert.deepEqual(all.map((n) => n.uid), ['1', '2', '6', '8']);
		});

		it('*:has(+ button) matches nodes whose next sibling is a button', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(+ button)');
			assert.deepEqual(all.map((n) => n.uid), ['12']);
		});

		it('*:has(~ button) matches nodes with any following sibling that is a button', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(~ button)');
			assert.deepEqual(all.map((n) => n.uid), ['12']);
		});

		it('link:has(+ link) matches a link whose next sibling is a link', () => {
			const root = A11yTree.parse(SIBLINGS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'link:has(+ link)');
			assert.deepEqual(all.map((n) => n.uid), ['14']);
		});

		it('WebArea *:has(> button) > link returns only the direct link child of the direct-button parent', () => {
			const root = A11yTree.parse(RELATIVE_HAS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, 'WebArea *:has(> button) > link');
			assert.deepEqual(all.map((n) => n.uid), ['4']);
		});

		it(':has() accepts mixed relative and absolute groups', () => {
			const root = A11yTree.parse(RELATIVE_HAS_TREE_TEXT);
			const all = A11yQuery.querySelectorAll(root, '*:has(> button, heading)');
			assert.deepEqual(all.map((n) => n.uid), ['1', '2', '8']);
		});

		it('throws when :is() receives a leading combinator', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, '*:is(> button)'),
				/Expected role, \*, or #uid/,
			);
		});

		it('throws when :not() receives a leading combinator', () => {
			const root = A11yTree.parse(SAMPLE_TREE_TEXT);
			assert.throws(
				() => A11yQuery.querySelector(root, '*:not(> button)'),
				/Expected role, \*, or #uid/,
			);
		});
	});
});
