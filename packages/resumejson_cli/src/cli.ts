#!/usr/bin/env node
import Fs from 'node:fs';
import Path from 'node:path';

import * as Commander from 'commander';

import { UtilsPdf } from './utils/utils_pdf.js';
import { UtilsAisdk } from './utils/utils_aisdk.js';
import * as AiSdk from 'ai';
import KeyvSqlite from '@keyv/sqlite';
import { Cacheable } from "cacheable";
import { UtilsMemoisation } from './utils/utils_memoisation.js';
import { ResumeJsonSchema } from './resume_json/resume_schemas.js';
import { ResumeJson } from './resume_json/resume_types.js';
import { AtsScorer as AtsScorer } from './ats/ats_scorer.js';
import { AtsReviewer } from './ats/ats_reviewer.js';
import { AtsQuestioner } from './ats/ats_questioner.js';
import { AtsAnswering } from './ats/ats_answering.js';
import { AtsQuestion } from './ats/ats_question_type.js';
import { AtsQuestionSchema } from './ats/ats_question_schema.js';
import { ResumeHelper } from './resume_json/resume_helper.js';
import { AtsAnswered } from './ats/ats_answered.js';

const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = Path.resolve(__dirname, '..');

class MainHelper {
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	io helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async readInputBuffer(path: string): Promise<Buffer> {
		if (path === '-') {
			const chunks: Buffer[] = [];
			for await (const chunk of process.stdin) {
				chunks.push(chunk as Buffer);
			}
			return Buffer.concat(chunks);
		}
		return await Fs.promises.readFile(path);
	}

	static async readInputString(path: string): Promise<string> {
		const buffer = await MainHelper.readInputBuffer(path);
		return buffer.toString('utf8');
	}

	static async writeOutputBuffer(path: string, data: Buffer): Promise<void> {
		if (path === '-') {
			process.stdout.write(data);
			return;
		}
		await Fs.promises.writeFile(path, data);
	}

	static async writeOutputString(path: string, data: string): Promise<void> {
		if (path === '-') {
			process.stdout.write(data);
			return;
		}
		await Fs.promises.writeFile(path, data, 'utf8');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	fromPdf
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

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

	static async fromPdf(pdfBuffer: Buffer): Promise<ResumeJson> {
		const imageBuffers = await MainHelper.pdf2images(pdfBuffer);

		// Build the user content array with the initial instruction and the images
		const userContent: AiSdk.UserContent = [
			{
				type: 'text',
				text: [
					'Analyze this image and extract resume information in JSON format according to the ResumeJsonSchema.',
					'Only output the JSON, no explanations.',
				].join('\n'),
			}
		]
		for (const imageBuffer of imageBuffers) {
			userContent.push({
				type: 'image',
				image: imageBuffer,
			})
		}

		// Prompt the AI SDK to generate the resume JSON
		const modelName = 'gpt-4.1';
		const openaiAiSdk = await UtilsAisdk.openaiAiSdk();
		const result = await AiSdk.generateText({
			model: openaiAiSdk(modelName),
			output: AiSdk.Output.object({
				schema: ResumeJsonSchema,
			}),
			messages: [
				{
					role: 'user',
					content: userContent,
				},
			],
		});

		// return ResumeJson
		const resumeJson: ResumeJson = result.output;
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
		.requiredOption('-i, --inputResumePdf <path>', 'path to the input PDF file')
		.requiredOption('-o, --outputResumeJson <path>', 'path to write the resume JSON output')
		.action(async (options: { inputResumePdf: string; outputResumeJson: string }) => {
			const pdfBuffer = await MainHelper.readInputBuffer(options.inputResumePdf);

			const resumeJson = await MainHelper.fromPdf(pdfBuffer);
			const resumeJsonStr = JSON.stringify(resumeJson, null, '\t');

			await MainHelper.writeOutputString(options.outputResumeJson, resumeJsonStr);

			const resumeJsonPrettyStr = await ResumeHelper.prettyPrint(resumeJson);
			console.log(resumeJsonPrettyStr);
		});

	program
		.command('ats_score')
		.description('Evaluate the ATS readiness of a resume JSON')
		.requiredOption('-i, --inputResumeJson <path>', 'path to the input resume JSON file')
		.requiredOption('-o, --outputAtsScore <path>', 'path to write the ATS score output')
		.action(async (options: { inputResumeJson: string; outputAtsScore: string }) => {
			const aiSdkProvider = await UtilsAisdk.openaiAiSdk()

			const resumeJsonStr = await MainHelper.readInputString(options.inputResumeJson);
			const resumeJson: ResumeJson = ResumeJsonSchema.parse(JSON.parse(resumeJsonStr));

			const atsScore = await AtsScorer.evaluate(aiSdkProvider, resumeJson);

			const atsScoreStr = JSON.stringify(atsScore, null, '\t');
			await MainHelper.writeOutputString(options.outputAtsScore, atsScoreStr);

			const atsScorePrettyStr = await AtsScorer.prettyPrint(atsScore);
			console.log(atsScorePrettyStr);
		});

	program
		.command('ats_review')
		.description('Generate an ATS review for a resume JSON')
		.requiredOption('-i, --inputResumeJson <path>', 'path to the input resume JSON file')
		.requiredOption('-o, --outputAtsReview <path>', 'path to write the ATS review output')
		.action(async (options: { inputResumeJson: string; outputAtsReview: string }) => {
			const aiSdkProvider = await UtilsAisdk.openaiAiSdk()

			const resumeJsonStr = await MainHelper.readInputString(options.inputResumeJson);
			const resumeJson: ResumeJson = ResumeJsonSchema.parse(JSON.parse(resumeJsonStr));

			const atsReview = await AtsReviewer.evaluate(aiSdkProvider, resumeJson);

			const atsReviewStr = JSON.stringify(atsReview, null, '\t');
			await MainHelper.writeOutputString(options.outputAtsReview, atsReviewStr);

			const atsReviewPrettyStr = await AtsReviewer.prettyPrint(atsReview);
			console.log(atsReviewPrettyStr);
		});

	program
		.command('ats_question')
		.description('Generate ATS questions for a resume JSON')
		.requiredOption('-i, --inputResumeJson <path>', 'path to the input resume JSON file')
		.requiredOption('-o, --outputAtsQuestions <path>', 'path to write the ATS questions output')
		.action(async (options: { inputResumeJson: string; outputAtsQuestions: string }) => {
			const aiSdkProvider = await UtilsAisdk.openaiAiSdk()

			const resumeJsonStr = await MainHelper.readInputString(options.inputResumeJson);
			const resumeJson: ResumeJson = ResumeJsonSchema.parse(JSON.parse(resumeJsonStr));

			const atsQuestions = await AtsQuestioner.evaluate(aiSdkProvider, resumeJson);

			const atsQuestionsStr = JSON.stringify(atsQuestions, null, '\t');
			await MainHelper.writeOutputString(options.outputAtsQuestions, atsQuestionsStr);

			const atsQuestionsPrettyStr = await AtsQuestioner.prettyPrint(atsQuestions);
			console.log(atsQuestionsPrettyStr);
		});

	program
		.command('ats_answered')
		.description('Integrate ATS questions with answers to produce an improved resume JSON')
		.requiredOption('-i, --inputResumeJson <path>', 'path to the input resume JSON file')
		.requiredOption('-q, --inputAtsQuestion <path>', 'path to the input ATS answered questions JSON file')
		.requiredOption('-o, --outputResumeJson <path>', 'path to write the improved resume JSON output')
		.action(async (options: { inputResumeJson: string; inputAtsQuestion: string; outputResumeJson: string }) => {
			const aiSdkProvider = await UtilsAisdk.openaiAiSdk()

			const resumeJsonStr = await MainHelper.readInputString(options.inputResumeJson);
			const resumeJson: ResumeJson = ResumeJsonSchema.parse(JSON.parse(resumeJsonStr));

			const atsQuestionStr = await MainHelper.readInputString(options.inputAtsQuestion);
			const atsQuestion: AtsQuestion = AtsQuestionSchema.parse(JSON.parse(atsQuestionStr))

			const resumeAnsweredJson = await AtsAnswered.evaluate(aiSdkProvider, resumeJson, atsQuestion);

			const resumeAnsweredStr = JSON.stringify(resumeAnsweredJson, null, '\t');
			await MainHelper.writeOutputString(options.outputResumeJson, resumeAnsweredStr);

			const resumeAnsweredPrettyStr = await ResumeHelper.prettyPrint(resumeAnsweredJson);
			console.log(resumeAnsweredPrettyStr);
		});

	program
		.command('ats_answering')
		.description('Produce answers via AI to ATS questions based on the resume JSON')
		.requiredOption('-i, --inputResumeJson <path>', 'path to the input resume JSON file')
		.requiredOption('-q, --inputAtsQuestion <path>', 'path to the input ATS questions JSON file')
		.requiredOption('-o, --outputAtsQuestionsAnswered <path>', 'path to write the answered ATS questions JSON output')
		.action(async (options: { inputResumeJson: string; inputAtsQuestion: string; outputAtsQuestionsAnswered: string }) => {
			const aiSdkProvider = await UtilsAisdk.openaiAiSdk()

			const resumeJsonStr = await MainHelper.readInputString(options.inputResumeJson);
			const resumeJson: ResumeJson = ResumeJsonSchema.parse(JSON.parse(resumeJsonStr));

			const atsQuestionStr = await MainHelper.readInputString(options.inputAtsQuestion);
			const atsQuestion: AtsQuestion = AtsQuestionSchema.parse(JSON.parse(atsQuestionStr))

			const atsQuestionAnswered = await AtsAnswering.evaluate(aiSdkProvider, resumeJson, atsQuestion);

			const atsQuestionAnsweredStr = JSON.stringify(atsQuestionAnswered, null, '\t');
			await MainHelper.writeOutputString(options.outputAtsQuestionsAnswered, atsQuestionAnsweredStr);

			const atsQuestionAnsweredPrettyStr = await AtsQuestioner.prettyPrint(atsQuestionAnswered);
			console.log(atsQuestionAnsweredPrettyStr);
		});


	program.parse(process.argv);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main()