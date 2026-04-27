// npm imports
import * as AiSdkOpenAI from '@ai-sdk/openai';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import OpenAICache from 'openai-cache';


export class UtilsAisdk {
	static async openaiAiSdk() {
		// init OpenAI cache with sqlite backend (you can use any Keyv backend or even an in-memory cache)
		const sqlitePath = `sqlite://${__dirname}/../.../.openai_cache.sqlite`;
		const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqlitePath) });
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