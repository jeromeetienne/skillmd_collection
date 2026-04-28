// node imports
import Path from 'node:path';
import Fs from 'node:fs';

// npm imports
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import type { AtsQuestion } from './ats_question_type.js';
import { ResumeJson } from '../resume_json/resume_types.js';
import { ResumeJsonSchema } from '../resume_json/resume_schemas.js';

const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = Path.resolve(__dirname, '../..');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsAnswered
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsAnswered {
	static async evaluate(
		aiSdkLanguageModel: AiSdk.LanguageModel,
		resumeJson: ResumeJson,
		atsQuestion: AtsQuestion,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<ResumeJson> {
		// Construct the user prompt by combining the original resume and the answered questions
		const userPrompt = [
			`## Original Resume`,
			`${JSON.stringify(resumeJson)}`,
			``,
			`## Answered Questions`,
			`${JSON.stringify(atsQuestion)}`,
		].join('\n');

		// Construct the model messages with the system prompt and user content
		const modelMessages: AiSdk.ModelMessage[] = [
			{
				role: 'system',
				content: SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content: userPrompt,
			}
		]

		// Prompt the AI SDK to generate the revised resume markdown
		const response = await AiSdk.generateText({
			model: aiSdkLanguageModel,
			output: AiSdk.Output.object({
				schema: ResumeJsonSchema,
			}),
			messages: modelMessages,
		});

		// return revised resume in ResumeMd format
		const resumeAnsweredJson: ResumeJson = response.output;
		return resumeAnsweredJson;
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a resume editor. Your job is to produce a revised resume in ResumeMd format.

You receive three inputs:
1. The original resume in Markdown
2. A list of answered questions — each has a question, a context (which section it refers to), and the user's answer
3. The ResumeMd template — the exact structure your output must follow

────────────────────────────────────────────────────────────
YOUR TASK
────────────────────────────────────────────────────────────

Produce a complete, revised resume by:

1. INTEGRATING ANSWERS
   - For each answered question, insert the user's answer into the correct section of the resume.
   - The "context" field tells you which section or bullet the answer belongs to.
   - If an answer provides a metric (e.g. "reduced load time by 40%"), insert it into the relevant bullet.
   - If an answer fills a missing field (e.g. email, LinkedIn), add it to Contact Information.
   - If the answer is empty or blank, skip that question — do not invent a value.

2. PRESERVING EXISTING CONTENT
   - Keep all content from the original resume unless directly superseded by an answer.
   - Do not remove sections, jobs, or bullets unless the user's answer explicitly replaces them.

3. FOLLOWING THE TEMPLATE
   - Your output must follow the ResumeMd template structure exactly:
     sections, heading levels, field labels, and bullet format.
   - Use the template as the skeleton; fill it with the resume's actual content.
   - Do not add sections that have no content.

────────────────────────────────────────────────────────────
RULES
────────────────────────────────────────────────────────────

- Output ONLY the revised resume in ResumeMd markdown. No preamble, no commentary.
- Do NOT invent information not present in the original resume or the answers.
- Do NOT use placeholder text from the template (e.g. "{email}", "{Company Name}") in the output.
  Replace every placeholder with real content, or omit the field if no value exists.
- Dates must follow the template format: "Jan 2020" or "Present".`;
