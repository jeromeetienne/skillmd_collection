import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandDeepSearch } from '../src/commands/deep-search';

test('deep-search throws when PERPLEXITY_API_KEY is missing', async () => {
	const original = process.env['PERPLEXITY_API_KEY'];
	delete process.env['PERPLEXITY_API_KEY'];
	try {
		await assert.rejects(
			() => CommandDeepSearch.run({ query: 'test', preset: 'deep-research' }),
			(err: Error) => {
				assert.ok(err.message.includes('PERPLEXITY_API_KEY'), `expected key name in: ${err.message}`);
				return true;
			},
		);
	} finally {
		if (original !== undefined) {
			process.env['PERPLEXITY_API_KEY'] = original;
		}
	}
});

test('deep-search throws when PERPLEXITY_API_KEY is empty string', async () => {
	const original = process.env['PERPLEXITY_API_KEY'];
	process.env['PERPLEXITY_API_KEY'] = '';
	try {
		await assert.rejects(
			() => CommandDeepSearch.run({ query: 'test', preset: 'pro-search' }),
			(err: Error) => {
				assert.ok(err.message.includes('PERPLEXITY_API_KEY'), `expected key name in: ${err.message}`);
				return true;
			},
		);
	} finally {
		if (original !== undefined) {
			process.env['PERPLEXITY_API_KEY'] = original;
		} else {
			delete process.env['PERPLEXITY_API_KEY'];
		}
	}
});
