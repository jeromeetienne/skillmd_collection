import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createOutput } from '../src/libs/output';

///////////////////////////////////////////////////////////////////////////////
// output.ts - createOutput
///////////////////////////////////////////////////////////////////////////////

describe('createOutput', () => {
	describe('json mode', () => {
		let writtenData: string;
		let output: ReturnType<typeof createOutput>;

		beforeEach(() => {
			writtenData = '';
			mock.method(process.stdout, 'write', (data: string) => {
				writtenData += data;
				return true;
			});
			output = createOutput(true);
		});

		it('isJson is true', () => {
			assert.equal(output.isJson, true);
		});

		it('result() writes JSON to stdout', () => {
			output.result({ foo: 'bar' });
			assert.equal(writtenData, JSON.stringify({ foo: 'bar' }, null, 2) + '\n');
		});

		it('progress() does not write anything', () => {
			output.progress('loading...');
			assert.equal(writtenData, '');
		});
	});

	describe('text mode', () => {
		let loggedMessages: string[];
		let output: ReturnType<typeof createOutput>;

		beforeEach(() => {
			loggedMessages = [];
			mock.method(console, 'log', (...args: unknown[]) => {
				loggedMessages.push(args.map(String).join(' '));
			});
			output = createOutput(false);
		});

		it('isJson is false', () => {
			assert.equal(output.isJson, false);
		});

		it('result() does not log anything', () => {
			output.result({ foo: 'bar' });
			assert.equal(loggedMessages.length, 0);
		});

		it('progress() logs message to console', () => {
			output.progress('loading...');
			assert.equal(loggedMessages.length, 1);
			assert.match(loggedMessages[0], /loading\.\.\./);
		});
	});
});
