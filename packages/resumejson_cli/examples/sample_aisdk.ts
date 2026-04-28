import { generateText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { createOpenAI } from '@ai-sdk/openai';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import OpenAICache from 'openai-cache';

const __dirname = new URL('.', import.meta.url).pathname;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	// init OpenAI cache with sqlite backend (you can use any Keyv backend or even an in-memory cache)
	const sqlitePath = `sqlite://${__dirname}/.openai_cache.sqlite`;
	const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqlitePath) });
	const openaiCache = new OpenAICache(sqliteCache, {
		markResponseEnabled: true, // enable marking cached responses with a special header
	});

	const aiSdkProvider = createOpenAI({
		// baseURL: 'https://api.openai.com/v1',
		baseURL: 'http://localhost:1234/v1',
		apiKey: process.env.OPENAI_API_KEY,
		fetch: openaiCache.getFetchFn(), // use the caching fetch function
	});
	// const aiSdkLanguageModel = aiSdkProvider("gpt-4.1-nano");
	const aiSdkLanguageModel = aiSdkProvider("google/gemma-4-e2b");
	// const aiSdkLanguageModel = aiSdkProvider("liquid/lfm2.5-1.2b");

	const { text } = await generateText({
		model: aiSdkLanguageModel,
		prompt: 'Write a one-sentence summary of what a resume is.',
	});

	console.log(text);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();

