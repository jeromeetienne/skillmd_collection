// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { QueryBuilder } from '../src/fastbrowser_cli/libs/query-builder.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

describe('QueryBuilder.buildQuerySelectorsBody', () => {
	describe('--selector list', () => {
		it('builds a single-selector body with defaults', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
			});
			assert.deepEqual(body, {
				selectors: [{ selector: 'button', limit: 0, withAncestors: true }],
			});
		});

		it('builds a multi-selector body', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button', 'link'],
				limit: '5',
			});
			assert.deepEqual(body, {
				selectors: [
					{ selector: 'button', limit: 5, withAncestors: true },
					{ selector: 'link', limit: 5, withAncestors: true },
				],
			});
		});

		it('honors --no-with-ancestors (withAncestors === false)', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
				withAncestors: false,
			});
			assert.equal(body.selectors[0].withAncestors, false);
		});

		it('treats omitted withAncestors as true (default)', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
			});
			assert.equal(body.selectors[0].withAncestors, true);
		});

		it('parses --limit as an integer', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
				limit: '42',
			});
			assert.equal(body.selectors[0].limit, 42);
		});

		it('defaults --limit to 0 when not provided', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
			});
			assert.equal(body.selectors[0].limit, 0);
		});
	});

	describe('--selectors-json input', () => {
		it('parses a JSON array and uses it verbatim', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selectorsJson: '[{"selector":"button","limit":3,"withAncestors":false}]',
			});
			assert.deepEqual(body, {
				selectors: [{ selector: 'button', limit: 3, withAncestors: false }],
			});
		});

		it('takes precedence over --selector when both are given', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['ignored'],
				selectorsJson: '[{"selector":"button","limit":1,"withAncestors":true}]',
			});
			assert.deepEqual(body.selectors, [
				{ selector: 'button', limit: 1, withAncestors: true },
			]);
		});

		it('treats empty --selectors-json as not provided', () => {
			const body = QueryBuilder.buildQuerySelectorsBody({
				selector: ['button'],
				selectorsJson: '',
			});
			assert.equal(body.selectors[0].selector, 'button');
		});
	});

	describe('error cases', () => {
		it('throws when --selectors-json is invalid JSON', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorsBody({ selectorsJson: 'not-json' }),
				/--selectors-json is not valid JSON/,
			);
		});

		it('throws when --selectors-json is not an array', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorsBody({ selectorsJson: '{"selector":"button"}' }),
				/--selectors-json must be a JSON array/,
			);
		});

		it('throws when no --selector and no --selectors-json provided', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorsBody({}),
				/At least one --selector or --selectors-json is required/,
			);
		});

		it('throws when --selector list is empty', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorsBody({ selector: [] }),
				/At least one --selector or --selectors-json is required/,
			);
		});

		it('throws when --limit is not a number', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorsBody({ selector: ['button'], limit: 'abc' }),
				/Invalid --limit: abc/,
			);
		});
	});
});

describe('QueryBuilder.buildQuerySelectorFirstBody', () => {
	describe('--selector list', () => {
		it('builds a body with default withAncestors=true', () => {
			const body = QueryBuilder.buildQuerySelectorFirstBody({
				selector: ['button'],
			});
			assert.deepEqual(body, {
				selectors: [{ selector: 'button', withAncestors: true }],
			});
		});

		it('honors --no-with-ancestors', () => {
			const body = QueryBuilder.buildQuerySelectorFirstBody({
				selector: ['button'],
				withAncestors: false,
			});
			assert.equal(body.selectors[0].withAncestors, false);
		});

		it('builds a multi-selector body preserving order', () => {
			const body = QueryBuilder.buildQuerySelectorFirstBody({
				selector: ['a', 'b', 'c'],
			});
			assert.deepEqual(body.selectors.map((s) => s.selector), ['a', 'b', 'c']);
		});
	});

	describe('--selectors-json input', () => {
		it('parses a JSON array verbatim', () => {
			const body = QueryBuilder.buildQuerySelectorFirstBody({
				selectorsJson: '[{"selector":"button","withAncestors":false}]',
			});
			assert.deepEqual(body, {
				selectors: [{ selector: 'button', withAncestors: false }],
			});
		});

		it('takes precedence over --selector when both are given', () => {
			const body = QueryBuilder.buildQuerySelectorFirstBody({
				selector: ['ignored'],
				selectorsJson: '[{"selector":"button","withAncestors":true}]',
			});
			assert.equal(body.selectors[0].selector, 'button');
		});
	});

	describe('error cases', () => {
		it('throws when --selectors-json is invalid JSON', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorFirstBody({ selectorsJson: '{' }),
				/--selectors-json is not valid JSON/,
			);
		});

		it('throws when --selectors-json is not an array', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorFirstBody({ selectorsJson: '"oops"' }),
				/--selectors-json must be a JSON array/,
			);
		});

		it('throws when no selector source is provided', () => {
			assert.throws(
				() => QueryBuilder.buildQuerySelectorFirstBody({}),
				/At least one --selector or --selectors-json is required/,
			);
		});
	});
});
