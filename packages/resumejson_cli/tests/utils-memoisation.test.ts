// node imports
import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// npm imports
import { Cacheable } from 'cacheable';
import KeyvSqlite from '@keyv/sqlite';

// local imports
import { UtilsMemoisation } from '../src/utils/utils_memoisation.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	UtilsMemoisation.memoise — uses an in-memory Cacheable per test so
//	state never leaks between cases.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

describe('UtilsMemoisation.memoise', () => {
	it('runs the underlying fn once and serves the cached value on a hit', async () => {
		const cache = new Cacheable();
		let calls = 0;
		const slowAdd = async (a: number, b: number): Promise<number> => {
			calls += 1;
			return a + b;
		};
		const fastAdd = UtilsMemoisation.memoise(slowAdd, { cache, keyPrefix: 'slowAdd' });

		assert.equal(await fastAdd(2, 3), 5);
		assert.equal(await fastAdd(2, 3), 5);
		assert.equal(calls, 1);
	});

	it('treats different argument lists as different cache keys', async () => {
		const cache = new Cacheable();
		let calls = 0;
		const slowAdd = async (a: number, b: number): Promise<number> => {
			calls += 1;
			return a + b;
		};
		const fastAdd = UtilsMemoisation.memoise(slowAdd, { cache, keyPrefix: 'slowAdd' });

		assert.equal(await fastAdd(2, 3), 5);
		assert.equal(await fastAdd(2, 4), 6);
		assert.equal(calls, 2);
	});

	it('isolates cache entries by keyPrefix', async () => {
		const cache = new Cacheable();
		let aCalls = 0;
		let bCalls = 0;
		const fnA = UtilsMemoisation.memoise(
			async (n: number): Promise<string> => {
				aCalls += 1;
				return `A:${n}`;
			},
			{ cache, keyPrefix: 'fnA' },
		);
		const fnB = UtilsMemoisation.memoise(
			async (n: number): Promise<string> => {
				bCalls += 1;
				return `B:${n}`;
			},
			{ cache, keyPrefix: 'fnB' },
		);

		assert.equal(await fnA(1), 'A:1');
		assert.equal(await fnB(1), 'B:1');
		assert.equal(await fnA(1), 'A:1');
		assert.equal(await fnB(1), 'B:1');
		assert.equal(aCalls, 1);
		assert.equal(bCalls, 1);
	});

	it('propagates errors from the underlying fn without caching them', async () => {
		const cache = new Cacheable();
		let calls = 0;
		const flaky = async (): Promise<number> => {
			calls += 1;
			throw new Error('boom');
		};
		const memoFlaky = UtilsMemoisation.memoise(flaky, { cache, keyPrefix: 'flaky' });

		await assert.rejects(memoFlaky(), /boom/);
		await assert.rejects(memoFlaky(), /boom/);
		assert.equal(calls, 2);
	});

	it('round-trips Buffer args and Buffer[] returns through a SQLite-backed cache', async () => {
		const cache = new Cacheable({ secondary: new KeyvSqlite('sqlite://:memory:') });
		let calls = 0;
		const expected = [Buffer.from('hello'), Buffer.from('world')];
		const fn = async (_buf: Buffer): Promise<Buffer[]> => {
			calls += 1;
			return [Buffer.from('hello'), Buffer.from('world')];
		};
		const memoFn = UtilsMemoisation.memoise(fn, { cache, keyPrefix: 'bufFn' });

		const input = Buffer.from([0x00, 0x01, 0x02, 0x03]);
		const first = await memoFn(input);
		// drop primary so the next call must hydrate from SQLite secondary
		await cache.primary.clear();
		const second = await memoFn(input);

		assert.equal(calls, 1);
		assert.equal(second.length, expected.length);
		for (let i = 0; i < expected.length; i++) {
			assert.equal(Buffer.isBuffer(second[i]), true, `result[${i}] must be a Buffer instance`);
			assert.equal(second[i].equals(expected[i]), true, `result[${i}] bytes must match`);
		}
		// sanity: first call also returned valid Buffers
		assert.equal(Buffer.isBuffer(first[0]), true);
	});

	it('treats different Buffer args as different cache keys', async () => {
		const cache = new Cacheable({ secondary: new KeyvSqlite('sqlite://:memory:') });
		let calls = 0;
		const fn = async (buf: Buffer): Promise<number> => {
			calls += 1;
			return buf.length;
		};
		const memoFn = UtilsMemoisation.memoise(fn, { cache, keyPrefix: 'bufLen' });

		assert.equal(await memoFn(Buffer.from([1, 2, 3])), 3);
		assert.equal(await memoFn(Buffer.from([1, 2, 3, 4])), 4);
		assert.equal(await memoFn(Buffer.from([1, 2, 3])), 3);
		assert.equal(calls, 2);
	});
});
