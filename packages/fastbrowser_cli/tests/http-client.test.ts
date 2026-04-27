// node imports
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { HttpClient } from '../src/fastbrowser_cli/libs/http-client.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

describe('HttpClient.getServerUrl', () => {
	let originalEnv: string | undefined;

	beforeEach(() => {
		originalEnv = process.env['FASTBROWSER_SERVER'];
		delete process.env['FASTBROWSER_SERVER'];
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env['FASTBROWSER_SERVER'] = originalEnv;
		} else {
			delete process.env['FASTBROWSER_SERVER'];
		}
	});

	it('returns the override URL when one is provided', () => {
		const url = HttpClient.getServerUrl('http://example.com:1234');
		assert.equal(url, 'http://example.com:1234');
	});

	it('prefers the override URL over the env var', () => {
		process.env['FASTBROWSER_SERVER'] = 'http://from-env:9999';
		const url = HttpClient.getServerUrl('http://override:1111');
		assert.equal(url, 'http://override:1111');
	});

	it('falls back to FASTBROWSER_SERVER env var when override is undefined', () => {
		process.env['FASTBROWSER_SERVER'] = 'http://from-env:9999';
		const url = HttpClient.getServerUrl(undefined);
		assert.equal(url, 'http://from-env:9999');
	});

	it('falls back to FASTBROWSER_SERVER env var when override is empty string', () => {
		process.env['FASTBROWSER_SERVER'] = 'http://from-env:9999';
		const url = HttpClient.getServerUrl('');
		assert.equal(url, 'http://from-env:9999');
	});

	it('ignores empty FASTBROWSER_SERVER env var', () => {
		process.env['FASTBROWSER_SERVER'] = '';
		const url = HttpClient.getServerUrl(undefined);
		assert.equal(url, 'http://localhost:8787');
	});

	it('returns the default URL when nothing is set', () => {
		const url = HttpClient.getServerUrl(undefined);
		assert.equal(url, 'http://localhost:8787');
	});
});
