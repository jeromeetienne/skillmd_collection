// node imports
import Path from 'node:path';

// npm imports
import * as AiSdkOpenAI from '@ai-sdk/openai';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import OpenAICache from 'openai-cache';

const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = Path.resolve(__dirname, '../..');

export class UtilsAisdk {
	static async openaiAiSdk() {
		// init OpenAI cache with sqlite backend (you can use any Keyv backend or even an in-memory cache)
		const sqlitePath = Path.resolve(PROJECT_ROOT, '.openai_cache.sqlite');
		const sqliteUrl = `sqlite://${sqlitePath}`;
		const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqliteUrl) });
		const openaiCache = new OpenAICache(sqliteCache, {
			markResponseEnabled: true, // enable marking cached responses with a special header
		});

		const openaiAiSdk = AiSdkOpenAI.createOpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			fetch: openaiCache.getFetchFn(), // use the caching fetch function
		});


		return openaiAiSdk;
	}
}