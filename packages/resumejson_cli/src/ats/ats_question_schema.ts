// npm imports
import { z as Zod } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const AtsQuestionItemSchema = Zod.object({
	priority: Zod.enum(['critical', 'important', 'optional']),
	category: Zod.enum([
		'target_role',
		'contact_info',
		'missing_metrics',
		'employment_gap',
		'work_experience',
		'education_details',
		'certification',
		'skills_gap',
	]),
	question: Zod.string().describe('Specific, direct question for the user to fill in the missing data'),
	context: Zod.string().describe('Which resume section or bullet prompted this question and why the data is needed for ATS'),
	answer: Zod.string().describe('The user\'s answer — leave empty, to be filled in later'),
});

export const AtsQuestionSchema = Zod.object({
	questions: Zod.array(AtsQuestionItemSchema),
});
