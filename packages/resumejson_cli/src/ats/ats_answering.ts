// npm imports
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import { AtsQuestionSchema } from './ats_question_schema.js';
import type { AtsQuestion } from './ats_question_type.js';
import { ResumeJson } from '../resume_json/resume_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsAnswering
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsAnswering {
	static async evaluate(
		aiSdkLanguageModel: AiSdk.LanguageModel,
		resumeJson: ResumeJson,
		atsQuestion: AtsQuestion,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<AtsQuestion> {
		// Construct the user prompt by combining the original resume and the answered questions
		const userPrompt = [
			`## Resume JSON`,
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

		// Prompt the AI SDK to generate answers for each ATS question
		const response = await AiSdk.generateText({
			model: aiSdkLanguageModel,
			output: AiSdk.Output.object({
				schema: AtsQuestionSchema,
			}),
			messages: modelMessages,
		});

		// return AtsQuestion with answers filled in
		const atsQuestionsAnswered: AtsQuestion = response.output;
		return atsQuestionsAnswered;
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a resume simulation assistant. For each ATS question, invent a realistic answer as if you were the candidate.

- Answer every question — never leave an answer blank.
- One short sentence per answer (under 15 words).
- Use concrete values where relevant (metrics, tools, dates, numbers).
- Keep answers consistent with the context (section/role described).`;
