// node imports
import Path from 'node:path';
import Fs from 'node:fs';

// npm imports
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import type { AtsReview } from './ats_review_type.js';
import { ResumeJson } from '../resume_json/resume_types.js';
import { ResumeJsonSchema } from '../resume_json/resume_schemas.js';

const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = Path.resolve(__dirname, '../..');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsOptimizer
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsOptimizer {
	static async optimize(
		aiSdkLanguageModel: AiSdk.LanguageModel,
		resumeJson: ResumeJson,
		atsReview: AtsReview,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<ResumeJson> {
		// Construct the user prompt by combining the original resume and ATS review
		const userPrompt = [
			`## Original Resume JSON`,
			`${JSON.stringify(resumeJson)}`,
			``,
			`## ATS Review`,
			`${JSON.stringify(atsReview)}`,
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

		// Prompt the AI SDK to generate the optimized ResumeJson
		const response = await AiSdk.generateText({
			model: aiSdkLanguageModel,
			output: AiSdk.Output.object({
				schema: ResumeJsonSchema,
			}),
			messages: modelMessages,
		});

		// return optimized resume as ResumeJson
		const resumeOptimizedJson: ResumeJson = response.output;
		return resumeOptimizedJson;
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume optimizer.

You receive two inputs:
1. "Original Resume JSON" — the original resume as a ResumeJson object (JSON Resume schema), to be optimized
2. "ATS Review" — an ATS compliance review with specific actions to apply

Your job is to return an OPTIMIZED ResumeJson object that applies the actions from the review.
The output MUST conform exactly to the ResumeJson schema (JSON Resume).

RULES:
FOLLOW THE RESUMEJSON SCHEMA:
- The output is a single JSON object with these top-level fields: "$schema", "basics", "work", "volunteer", "education", "awards", "certificates", "publications", "skills", "languages", "interests", "references", "projects", "meta"
- "basics" holds personal info: "name", "label", "image", "email", "phone", "url", "summary", "location" (object: "address", "postalCode", "city", "countryCode", "region"), "profiles" (array of { "network", "username", "url" })
- Each "work" entry uses: "name" (company), "location", "description", "position" (job title), "url", "startDate", "endDate", "summary", "highlights" (array of accomplishment strings)
- Each "education" entry uses: "institution", "url", "area", "studyType", "startDate", "endDate", "score", "courses"
- Each "skills" entry uses: "name", "level", "keywords"
- Each "projects" entry uses: "name", "description", "highlights", "keywords", "startDate", "endDate", "url", "roles", "entity", "type"
- Each "certificates" entry uses: "name", "date", "url", "issuer"
- Use the same field names, nesting, and data types as the input ResumeJson — do not rename fields, do not invent fields
- Preserve every top-level field that exists in the input; set fields you cannot fill to null (or [] for arrays) rather than omitting them
- All dates MUST be ISO-8601 strings (e.g. "2023-04-15", "2023-04", or "2023")

PRESERVE ACCURACY:
- Never fabricate experience, skills, companies, dates, or credentials
- Never add technologies or tools the person hasn't mentioned
- Keep all factual information (dates, company names, job titles, degrees) intact
- You may rephrase and restructure string values, but not invent new entries

APPLY THE REVIEW'S ACTIONS:
- Address every action in the ATS review, prioritizing high-priority ones
- Fix deal breakers first
- Apply quick wins
- For each action, follow the suggested fix as closely as possible

ATS OPTIMIZATION:
- Ensure contact info lives in the proper "basics" fields ("email", "phone", "url", "location", "profiles"), not embedded in summary or highlight text
- Expand acronyms on first use: "Amazon Web Services (AWS)"
- Start each "highlights" bullet with a strong action verb
- Add quantifiable metrics where the original content implies them
- Remove vague language ("responsible for", "helped with", "various")
- Ensure "startDate" / "endDate" values are in consistent ISO-8601 format

OUTPUT:
- Return ONLY the optimized ResumeJson object, no explanations, no commentary, no code fences
- The output must validate against the ResumeJson schema`;
