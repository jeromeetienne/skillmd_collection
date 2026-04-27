#!/usr/bin/env node
import Fs from 'node:fs';
import Path from 'node:path';

import * as Commander from 'commander';

import { UtilsPdf } from './utils/utils_pdf.js';
import { UtilsAisdk } from './utils/utils_aisdk.js';
import * as AiSdk from 'ai';
import { z } from 'zod';

import { ResumeSchema } from './types/resume_schemas.js';
import { Resume } from './types/resume_types.js';


class MainHelper {
	async fromPdf(inputPath: string): Promise<Resume> {
		const pdfBuffer = await Fs.promises.readFile(inputPath);
		const imageBuffers = await UtilsPdf.pdf2images(pdfBuffer);

		const openaiAiSdk = await UtilsAisdk.openaiAiSdk();
		const result = await AiSdk.generateText({
			model: openaiAiSdk('gpt-4.1'),
			output: AiSdk.Output.object({
				schema: z.object({ resume: ResumeSchema }),
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
		const resume = result.output.resume;
		return resume;
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

	const mainHelper = new MainHelper();

	program
		.command('from_pdf')
		.description('Extract resume JSON from a PDF file')
		.argument('<inputPdfPath>', 'path to the input PDF file')
		.action(async (inputPdfPath: string) => {
			await mainHelper.fromPdf(inputPdfPath);
		});



	program.parse(process.argv);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main()