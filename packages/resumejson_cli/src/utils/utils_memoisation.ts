// node imports
import Crypto from 'node:crypto';

// npm imports
import { Cacheable } from 'cacheable';

type MemoiseOptions = {
	cache: Cacheable;
	keyPrefix?: string;
	ttl?: number | string;
};

export class UtilsMemoisation {
	static memoise<TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => Promise<TReturn>,
		options: MemoiseOptions,
	): (...args: TArgs) => Promise<TReturn> {
		const prefix = options.keyPrefix ?? fn.name ?? 'memoise';
		return async (...args: TArgs): Promise<TReturn> => {
			const hash = Crypto.createHash('sha256');
			for (const arg of args) {
				if (Buffer.isBuffer(arg) === true) {
					hash.update('B:');
					hash.update(arg);
				} else {
					hash.update('J:');
					hash.update(JSON.stringify(arg) ?? 'undefined');
				}
				hash.update('\0');
			}
			const argsHash = hash.digest('hex');
			const key = `${prefix}:${argsHash}`;

			const hit = await options.cache.has(key);
			if (hit === true) {
				const cached = await options.cache.get<TReturn>(key);
				return cached as TReturn;
			}

			const result = await fn(...args);
			await options.cache.set(key, result, options.ttl);
			return result;
		};
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Usage example
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// import KeyvSqlite from '@keyv/sqlite';
// import { Cacheable } from 'cacheable';
//
// const cache = new Cacheable({ secondary: new KeyvSqlite('sqlite://./.memo.sqlite') });
//
// async function slowAdd(a: number, b: number): Promise<number> {
// 	await new Promise(resolve => setTimeout(resolve, 1000));
// 	return a + b;
// }
//
// const fastAdd = UtilsMemoisation.memoise(slowAdd, { cache, keyPrefix: 'slowAdd' });
//
// console.log(await fastAdd(2, 3)); // ~1s — cache miss
// console.log(await fastAdd(2, 3)); // instant — cache hit
