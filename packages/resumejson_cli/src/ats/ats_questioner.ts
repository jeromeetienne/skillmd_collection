// npm imports
import Chalk from "chalk";
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import { AtsQuestionSchema } from './ats_question_schema.js';
import type { AtsQuestion } from './ats_question_type.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsQuestioner
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsQuestioner {
	static async evaluate(
		aiSdkProvider: AiSdkOpenAI.OpenAIProvider,
		resumeMd: string,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<AtsQuestion> {
		// Construct the model messages with the system prompt and user content
		const modelMessages: AiSdk.ModelMessage[] = [
			{
				role: 'system',
				content: SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content: resumeMd,
			}
		]

		// Prompt the AI SDK to generate the ATS questions
		const response = await AiSdk.generateText({
			model: aiSdkProvider(modelName),
			output: AiSdk.Output.object({
				schema: AtsQuestionSchema,
			}),
			messages: modelMessages,
		});

		// return AtsQuestions
		const atsQuestions: AtsQuestion = response.output;
		return atsQuestions;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * - use `Chalk` to pretty-print the ATS questions in the terminal with colors and formatting for better readability.
	 *
	 * @param atsQuestions
	 */
	static async prettyPrint(atsQuestions: AtsQuestion): Promise<string> {
		const lines: string[] = [];
		lines.push(Chalk.bold.underline(`ATS Resume Gap Questions (${atsQuestions.questions.length}):`));
		lines.push("");
		const priorityColor = (priority: string) => {
			switch (priority) {
				case "critical":
					return Chalk.red;
				case "important":
					return Chalk.yellow;
				case "optional":
					return Chalk.blue;
				default:
					return Chalk.white;
			}
		};
		for (const question of atsQuestions.questions) {
			const questionIndex = atsQuestions.questions.indexOf(question) + 1;
			const color = priorityColor(question.priority);
			lines.push(color(`    ${questionIndex}. [${question.priority.toUpperCase()}] (${question.category}) ${question.question}`));
			lines.push(color(`       Context: ${question.context}`));
		}
		return lines.join("\n");
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an ATS resume gap analyst.

Your ONLY job is to identify information that is ABSENT from the resume and that
the user must supply — data the AI cannot infer or fabricate from the text alone.

Do NOT flag formatting issues, weak verbs, or keyword density. Those are handled
by a separate critic. Your output feeds a questionnaire the user fills in before
the next revision pass.

────────────────────────────────────────────────────────────
WHAT TO LOOK FOR
────────────────────────────────────────────────────────────

TARGET ROLE  [critical if absent]
  Is the target job title or industry stated or clearly implied?
  If not, ask — without it, keyword optimization is impossible.

CONTACT INFO  [critical if any field is missing]
  Required: email, phone number, LinkedIn URL, city/region.
  Ask about each missing field as a separate question.

UNQUANTIFIED ACHIEVEMENTS  [important]
  Bullets that describe impact without a number (%, $, count, time saved).
  Quote the exact bullet and ask: "Can you give a number for this result?"
  Flag only the top 3 most impactful bullets — not every single one.

EMPLOYMENT GAPS  [important if gap > 3 months]
  Date ranges that leave an unexplained gap between jobs.
  Ask what the candidate was doing during that period.

WORK EXPERIENCE  [critical if section is missing or incomplete]
  Required for each position: job title, company name, start date, end date (or "Present") and location.
  Ask about each missing field as a separate question.
  If no work experience section exists at all, flag it as critical.

EDUCATION DETAILS  [critical if section exists but is incomplete]
  Missing: degree name, field of study, graduation year, or institution name.
  Ask only for what is actually absent — do not ask about fields already present.

CERTIFICATIONS  [optional]
  Certifications mentioned without an issuing body or date.
  Ask for the specific missing detail.

SKILLS GAP  [important]
  Technologies named in job descriptions that do not appear in the Skills section.
  List the missing ones and ask the user to confirm they should be added.

────────────────────────────────────────────────────────────
RULES
────────────────────────────────────────────────────────────

1. Ask about MISSING data only. Never ask about something already present.
2. Maximum 7 questions. Prioritize: critical > important > optional.
3. Each question must cite the specific section or bullet it refers to (context field).
4. One concrete thing per question — no compound questions.
5. Order output: critical questions first.`;
