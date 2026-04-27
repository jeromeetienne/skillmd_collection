#!/usr/bin/env node
import Fs from 'node:fs';
import Path from 'node:path';

import * as Commander from 'commander';

import { UtilsPdf } from './utils/utils_pdf.js';
import { UtilsAisdk } from './utils/utils_aisdk.js';
import * as AiSdk from 'ai';
import { z } from 'zod';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import { UtilsMemoisation } from './utils/utils_memoisation.js';
import { ResumeJsonSchema } from './types/resume_schemas.js';
import { ResumeJson } from './types/resume_types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = Path.resolve(__dirname, '..');

class MainHelper {
	static async pdf2images(pdfBuffer: Buffer): Promise<Buffer[]> {
		if (false) {
			const imageBuffers = await UtilsPdf.pdf2images(pdfBuffer);
			return imageBuffers;
		}

		const sqlitePath = Path.resolve(PROJECT_ROOT, '.openai_cache.sqlite');
		const sqliteUrl = `sqlite://${sqlitePath}`;
		const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqliteUrl) });

		const pdf2imagesMemoized = UtilsMemoisation.memoise(UtilsPdf.pdf2images, {
			cache: sqliteCache,
			keyPrefix: 'pdf2images',
		})

		const imageBuffers = await pdf2imagesMemoized(pdfBuffer);
		return imageBuffers;
	}

	static async fromPdf(inputPath: string): Promise<ResumeJson> {
		const pdfBuffer = await Fs.promises.readFile(inputPath);
		const imageBuffers = await MainHelper.pdf2images(pdfBuffer);

		const openaiAiSdk = await UtilsAisdk.openaiAiSdk();
		const result = await AiSdk.generateText({
			model: openaiAiSdk('gpt-4.1'),
			output: AiSdk.Output.object({
				schema: ResumeJsonSchema,
			}),
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Analyze this image.' },
						{
							type: 'image',
							image: imageBuffers[0],
						},
					],
				},
			],
		});
		const resumeJson = result.output;
		return resumeJson;
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main() {
	const program = new Commander.Command();

	program
		.name('resumejson_cli')
		.description('Command-line interface for resume JSON tooling.')
		.version('1.0.0');

	program
		.command('from_pdf')
		.description('Extract resume JSON from a PDF file')
		.argument('<inputPdfPath>', 'path to the input PDF file')
		.action(async (inputPdfPath: string) => {
			const resumeJson = await MainHelper.fromPdf(inputPdfPath);
			console.log(JSON.stringify(resumeJson));
		});



	program.parse(process.argv);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main()