// npm imports
import Chalk from "chalk";
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import { AtsReviewSchema } from './ats_review_schema.js';
import type { AtsReview } from './ats_review_type.js';
import { ResumeJson } from "../resume_json/resume_types.js";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsEvaluator
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsReviewer {
	static async evaluate(
		aiSdkLanguageModel: AiSdk.LanguageModel,
		resumeJson: ResumeJson,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<AtsReview> {
		// Construct the model messages with the system prompt and user content
		const modelMessages: AiSdk.ModelMessage[] = [
			{
				role: 'system',
				content: SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content: JSON.stringify(resumeJson),
			}
		]

		// Prompt the AI SDK to generate the critic report
		const response = await AiSdk.generateText({
			model: aiSdkLanguageModel,
			output: AiSdk.Output.object({
				schema: AtsReviewSchema,
			}),
			messages: modelMessages,
		});

		// return AtsCriticReport
		const atsCriticReport: AtsReview = response.output;
		return atsCriticReport;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * - use `Chalk` to pretty-print the AtsCriticReport results in the terminal with colors and formatting for better readability.
	 *
	 * @param report
	 */
	static async prettyPrint(report: AtsReview): Promise<string> {
		const lines: string[] = [];

		const complianceColor = (level: string) => {
			switch (level) {
				case "fully_compliant":
					return Chalk.green;
				case "mostly_compliant":
					return Chalk.cyan;
				case "partially_compliant":
					return Chalk.yellow;
				case "non_compliant":
					return Chalk.red;
				default:
					return Chalk.white;
			}
		};

		const complianceLabel = report.complianceLevel.replace(/_/g, " ").toUpperCase();
		lines.push(Chalk.bold.underline(`ATS Compliance: ${complianceColor(report.complianceLevel)(complianceLabel)}`));
		lines.push("");
		lines.push(Chalk.dim(report.summary));
		lines.push("");

		if (report.dealBreakers.length > 0) {
			lines.push(Chalk.bold.red("Deal Breakers:"));
			for (const dealBreaker of report.dealBreakers) {
				lines.push(Chalk.red(`  ✗ ${dealBreaker}`));
			}
			lines.push("");
		}

		lines.push(Chalk.bold("Actions:"));
		for (const action of report.actions) {
			const priorityColor = (priority: string) => {
				switch (priority) {
					case "high":
						return Chalk.red;
					case "medium":
						return Chalk.yellow;
					case "low":
						return Chalk.blue;
					default:
						return Chalk.white;
				}
			};
			const color = priorityColor(action.priority);
			lines.push(color(`  [${action.priority.toUpperCase()}] ${action.problem}`));
			lines.push(Chalk.white(`    Action: ${action.action}`));
			lines.push(Chalk.dim(`    Before: ${action.exampleBefore}`));
			lines.push(Chalk.green(`    After:  ${action.exampleAfter}`));
		}
		lines.push("");

		if (report.quickWins.length > 0) {
			lines.push(Chalk.bold("Quick Wins:"));
			for (const quickWin of report.quickWins) {
				lines.push(Chalk.green(`  ✓ ${quickWin}`));
			}
			lines.push("");
		}

		return lines.join("\n");
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) compliance critic.

You receive a resume as a JSON object. Your job is NOT to score it, but to produce
an actionable report: what exactly must change to make this resume pass ATS filters
used by Workday, Greenhouse, Lever, Taleo, iCIMS, and similar systems.

For every issue you find, provide:
- The exact problem
- The exact action to fix it
- A before/after example so the user can see the change

FOCUS AREAS:

PARSING COMPATIBILITY
- Section headings must match what ATS parsers expect (e.g., "Work Experience" not "Where I've Been")
- Contact info must be in structured metadata, not embedded in free text
- Dates must be in consistent, machine-parseable formats (e.g., "Jan 2020 - Present")
- No special unicode characters (smart quotes, em dashes, bullets) that break parsers

KEYWORD OPTIMIZATION
- Skills and technologies should appear in both a Skills section AND contextually in experience
- Acronyms must be expanded on first use: "Amazon Web Services (AWS)"
- Job-relevant keywords must appear in their standard forms

CONTENT STRUCTURE
- Every bullet should start with a strong action verb
- Achievements must include quantifiable metrics (numbers, percentages, dollar amounts)
- Remove vague language: "responsible for", "helped with", "various", "etc."

COMPLETENESS
- Must have: Contact Info, Professional Summary, Work Experience, Education, Skills
- Each job entry needs: company name, job title, dates, description with bullets

PRIORITIZATION
- Order actions by impact: deal breakers first, then high-priority, then nice-to-have
- Identify quick wins that take minimal effort but significantly improve ATS performance
- Flag deal breakers that will almost certainly cause automatic rejection

QUESTIONS FOR USER
- If critical information is missing or ambiguous (e.g. target job title/industry, career level, contact details), formulate a clear, specific question for the user so they can provide it before the next revision.
- Only ask when the information is truly needed to improve ATS compliance; do not ask about things already present in the resume.

Be specific and actionable. Never give generic advice like "add more keywords."
Instead say exactly which keywords are missing and where to add them.`;
