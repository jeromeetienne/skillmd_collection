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
		aiSdkProvider: AiSdkOpenAI.OpenAIProvider,
		resumeJson: ResumeJson,
		atsReview: AtsReview,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<ResumeJson> {
		const filePath = Path.join(PROJECT_ROOT, `./assets/resumemd_template.md`);
		const resumeMdTemplate = await Fs.promises.readFile(filePath, 'utf-8');

		// Construct the user prompt by combining the template, original resume, and ATS review
		const userPrompt = [
			`## Original Resume`,
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

		// Prompt the AI SDK to generate the optimized resume markdown
		const response = await AiSdk.generateText({
			model: aiSdkProvider(modelName),
			output: AiSdk.Output.object({
				schema: ResumeJsonSchema,
			}),
			messages: modelMessages,
		});

		// return optimized resume in ResumeMd format
		const resumeOptimizedJson: ResumeJson = response.output;
		return resumeOptimizedJson;
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume optimizer.

You receive three inputs:
1. "resumeMdTemplate" — the authoritative ResumeMd template that defines the exact structure your output MUST follow
2. "resumeJson" — the original resume as a JSON object, to be optimized
3. "atsReview" — an ATS compliance review with specific actions to apply

Your job is to return an OPTIMIZED version of the resume that applies the actions from the review.
The output MUST be a ResumeMd markdown document that follows the exact structure and formatting of the resumeMdTemplate.

RULES:
FOLLOW THE TEMPLATE:
- The resumeMdTemplate defines the heading hierarchy, section order, and metadata format (e.g., "- Company: {value}", "- Start date: {value}")
- Your output MUST use the same headings, the same metadata field names, and the same nesting as the template
- Use the template's sections: "Contact Information", "Professional Summary", "Work Experience", "Skills", "Education", "Certifications", "Projects"
- Each Work Experience entry must use the template's format: "### {Job Title}" followed by "- Company:", "- Start date:", "- End date:", "- Location:", then "#### Key Achievements" with bullet points
- The Skills section must use the template's categories: "Languages", "Frameworks", "Infrastructure", "Data", "Practices"

PRESERVE ACCURACY:
- Never fabricate experience, skills, companies, dates, or credentials
- Never add technologies or tools the person hasn't mentioned
- Keep all factual information (dates, company names, job titles, degrees) intact
- You may rephrase and restructure, but not invent

APPLY THE REVIEW'S ACTIONS:
- Address every action in the ATS review, prioritizing high-priority ones
- Fix deal breakers first
- Apply quick wins
- For each action, follow the suggested fix as closely as possible

ATS OPTIMIZATION:
- Ensure contact info is in metadata fields, not embedded in text
- Expand acronyms on first use: "Amazon Web Services (AWS)"
- Start bullets with strong action verbs
- Add quantifiable metrics where the original content implies them
- Remove vague language ("responsible for", "helped with", "various")
- Ensure dates are in consistent, parseable formats

OUTPUT:
- Return ONLY the optimized ResumeMd markdown, no explanations, no commentary, no code blocks
- The output must conform exactly to the structure defined in resumeMdTemplate`;
