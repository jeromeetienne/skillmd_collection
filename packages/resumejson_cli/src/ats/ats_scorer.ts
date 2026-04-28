// npm imports
import Chalk from "chalk";
import * as AiSdk from 'ai';
import * as AiSdkOpenAI from '@ai-sdk/openai';

// local imports
import { AtsScoreSchema } from './ats_score_schema.js';
import type { AtsScore } from './ats_score_type.js';
import { ResumeJson } from "../resume_json/resume_types.js";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AtsScorer
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class AtsScorer {
	static async evaluate(
		aiSdkLanguageModel: AiSdk.LanguageModel,
		resumeJson: ResumeJson,
		{
			modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-nano",
		}: {
			modelName?: string
		} = {}
	): Promise<AtsScore> {
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

		// Prompt the AI SDK to generate the resume JSON
		const response = await AiSdk.generateText({
			model: aiSdkLanguageModel,
			output: AiSdk.Output.object({
				schema: AtsScoreSchema,
			}),
			messages: modelMessages,
		});

		// return ATSReadiness
		const atsReadiness: AtsScore = response.output;
		return atsReadiness;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * - use `Chalk` to pretty-print the ATSReadiness results in the terminal with colors and formatting for better readability.
	 * 
	 * @param atsReadiness 
	 */
	static async prettyPrint(atsReadiness: AtsScore): Promise<string> {
		const lines: string[] = [];
		lines.push(Chalk.bold.underline(`Overall ATS Readiness Score: ${atsReadiness.overallScore}`));
		lines.push("");
		lines.push(Chalk.bold("Section Scores:"));
		for (const sectionScore of atsReadiness.sectionScores) {
			const sectionIndex = atsReadiness.sectionScores.indexOf(sectionScore) + 1;
			const severityColor = (severity: string) => {
				switch (severity) {
					case "critical":
						return Chalk.red;
					case "major":
						return Chalk.yellow;
					case "minor":
						return Chalk.blue;
					default:
						return Chalk.white;
				}
			};
			lines.push(Chalk.bold(`    ${sectionIndex}. ${sectionScore.section}: ${sectionScore.score}`));
			for (const issue of sectionScore.issues) {
				const issueIndex = sectionScore.issues.indexOf(issue) + 1;
				const color = severityColor(issue.severity);
				lines.push(color(`        ${sectionIndex}.${issueIndex}. [${issue.severity.toUpperCase()}] ${issue.message}`));
				lines.push(color(`           Suggestion: ${issue.suggestion}`));
			}
		}
		lines.push("");
		lines.push(Chalk.bold("Missing Critical Sections:"));
		for (const missingSection of atsReadiness.missingCriticalSections) {
			lines.push(Chalk.red(`  - ${missingSection}`));
		}
		lines.push("");
		lines.push(Chalk.bold(`Keyword Density: ${atsReadiness.keywordDensity.toUpperCase()}`));
		lines.push("");
		lines.push(Chalk.bold("Top Strengths:"));
		for (const strength of atsReadiness.topStrengths) {
			lines.push(Chalk.green(`  - ${strength}`));
		}
		lines.push("");
		lines.push(Chalk.bold("Top Improvements:"));
		for (const improvement of atsReadiness.topImprovements) {
			lines.push(Chalk.yellow(`  - ${improvement}`));
		}
		return lines.join("\n");
	}
}

// ─── Prompt ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) readiness auditor.

You receive a resume as a JSON object and evaluate how well it would perform
when parsed and ranked by common ATS software (Workday, Greenhouse, Lever,
Taleo, iCIMS, etc.).

Score each section and the overall resume on a 0-100 scale based on:

STRUCTURE (30%)
- Uses standard section headings ATS parsers recognize
- Contact info is in metadata, not buried in text
- Clean hierarchy: sections > objects > fields
- No content hidden in unusual fields

CONTENT QUALITY (40%)
- Bullets start with strong action verbs
- Achievements include quantifiable metrics (numbers, %, $)
- No vague language ("responsible for", "helped with", "various tasks")
- Technical keywords are spelled out AND abbreviated (e.g., "Amazon Web Services (AWS)")
- Skills section exists with comprehensive keyword coverage

FORMATTING (15%)
- No special unicode characters that break parsers (smart quotes, em dashes, etc.)
- No excessive nesting or unusual structures
- Dates in consistent, parseable formats

COMPLETENESS (15%)
- Has Professional Summary / objective
- Has contact info (email, phone, location at minimum)
- Has Education section with degree and institution
- Has Skills section
- Work experience includes company, title, dates, descriptions

Be strict but fair. A score of 70+ means "likely to pass most ATS filters."
Below 50 means "will probably be filtered out."

Flag every concrete issue you find. Each issue must have a specific fix, not generic advice.`;