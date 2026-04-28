import * as AiSdk from "ai";
import { z } from "zod";
import Fs from "node:fs";
import Path from "node:path";
import * as AiSdkOpenAI from '@ai-sdk/openai';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import OpenAICache from 'openai-cache';

const imageAnalysisSchema = z.object({
	description: z.string().describe("A concise description of the image"),
	objects: z.array(z.string()).describe("Main objects detected"),
	dominantColors: z.array(z.string()).describe("Top 3-5 dominant colors"),
	mood: z.enum(["happy", "neutral", "sad", "energetic", "calm"]),
	containsText: z.boolean(),
	extractedText: z.string().nullable(),
});

export type ImageAnalysis = z.infer<typeof imageAnalysisSchema>;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export async function analyzeImage(imagePath: string): Promise<ImageAnalysis> {
	const image = await Fs.promises.readFile(imagePath);
	// init OpenAI cache with sqlite backend (you can use any Keyv backend or even an in-memory cache)
	const sqlitePath = `sqlite://${__dirname}/../.openai_cache.sqlite`;
	const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqlitePath) });
	const openaiCache = new OpenAICache(sqliteCache, {
		markResponseEnabled: true, // enable marking cached responses with a special header
	});

	// const openaiAiSdk = AiSdkOpenAI.createOpenAI({
	// 	apiKey: process.env.OPENAI_API_KEY,
	// 	fetch: openaiCache.getFetchFn(), // use the caching fetch function
	// });

	const aiSdkProvider = AiSdkOpenAI.createOpenAI({
		// baseURL: 'https://api.openai.com/v1',
		baseURL: 'http://localhost:1234/v1',
		apiKey: process.env.OPENAI_API_KEY,
		fetch: openaiCache.getFetchFn(), // use the caching fetch function
	});
	// const aiSdkLanguageModel = aiSdkProvider("gpt-4.1-nano");
	const aiSdkLanguageModel = aiSdkProvider("google/gemma-4-e2b");


	const result = await AiSdk.generateText({
		model: aiSdkLanguageModel,
		output: AiSdk.Output.object({
			schema: imageAnalysisSchema
		}),
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: "Analyze this image." },
					{ type: "image", image }, // Buffer, Uint8Array, base64 string, or URL
				],
			},
		],
	});
	const output = result.output
	return output;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const __dirname = new URL('.', import.meta.url).pathname;
const imagePath = Path.resolve(__dirname, "sample_image.png");
const result = await analyzeImage(imagePath);
console.log(result);