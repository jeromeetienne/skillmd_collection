// ─── Types ───────────────────────────────────────────────────────────────────

export type AtsQuestionItem = {
	/** Priority of the question */
	priority: 'critical' | 'important' | 'optional';
	/** Category of the missing data */
	category:
	| 'target_role'
	| 'contact_info'
	| 'missing_metrics'
	| 'employment_gap'
	| 'work_experience'
	| 'education_details'
	| 'certification'
	| 'skills_gap';
	/** Specific, direct question for the user to fill in the missing data */
	question: string;
	/** Which resume section or bullet prompted this question and why the data is needed for ATS */
	context: string;
	/** The user's answer — leave empty, to be filled in later */
	answer: string;
};

export type AtsQuestion = {
	questions: AtsQuestionItem[];
};
