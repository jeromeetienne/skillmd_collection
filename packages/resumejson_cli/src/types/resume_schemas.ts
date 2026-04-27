// npm imports
import { z } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Zod schema for the JSON Resume format.
//	Generated from data/schemas/resume.schema.json.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export const Iso8601Schema = z.string()
	.regex(/^([1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]|[1-2][0-9]{3}-[0-1][0-9]|[1-2][0-9]{3})$/)
	.describe('Similar to the standard date type, but each section after the year is optional. e.g. 2014-06-29 or 2023-04');

export const ResumeLocationSchema = z.object({
	address: z.string()
		.describe('To add multiple address lines, use \\n. For example, 1234 Glücklichkeit Straße\\nHinterhaus 5. Etage li.')
		.nullable(),
	postalCode: z.string().nullable(),
	city: z.string().nullable(),
	countryCode: z.string()
		.describe('code as per ISO-3166-1 ALPHA-2, e.g. US, AU, IN')
		.nullable(),
	region: z.string()
		.describe('The general region where you live. Can be a US state, or a province, for instance.')
		.nullable(),
});

export const ResumeProfileSchema = z.object({
	network: z.string()
		.describe('e.g. Facebook or Twitter')
		.nullable(),
	username: z.string()
		.describe('e.g. neutralthoughts')
		.nullable(),
	url: z.string()
		.describe('e.g. http://twitter.example.com/neutralthoughts')
		.nullable(),
});

export const ResumeBasicsSchema = z.object({
	name: z.string().nullable(),
	label: z.string()
		.describe('e.g. Web Developer')
		.nullable(),
	image: z.string()
		.describe('URL (as per RFC 3986) to a image in JPEG or PNG format')
		.nullable(),
	email: z.string()
		.describe('e.g. thomas@gmail.com')
		.nullable(),
	phone: z.string()
		.describe('Phone numbers are stored as strings so use any format you like, e.g. 712-117-2923')
		.nullable(),
	url: z.string()
		.describe('URL (as per RFC 3986) to your website, e.g. personal homepage')
		.nullable(),
	summary: z.string()
		.describe('Write a short 2-3 sentence biography about yourself')
		.nullable(),
	location: ResumeLocationSchema.nullable(),
	profiles: z.array(ResumeProfileSchema)
		.describe('Specify any number of social networks that you participate in')
		.nullable(),
});

export const ResumeWorkSchema = z.object({
	name: z.string()
		.describe('e.g. Facebook')
		.nullable(),
	location: z.string()
		.describe('e.g. Menlo Park, CA')
		.nullable(),
	description: z.string()
		.describe('e.g. Social Media Company')
		.nullable(),
	position: z.string()
		.describe('e.g. Software Engineer')
		.nullable(),
	url: z.string()
		.describe('e.g. http://facebook.example.com')
		.nullable(),
	startDate: Iso8601Schema.nullable(),
	endDate: Iso8601Schema.nullable(),
	summary: z.string()
		.describe('Give an overview of your responsibilities at the company')
		.nullable(),
	highlights: z.array(z.string())
		.describe('Specify multiple accomplishments')
		.nullable(),
});

export const ResumeVolunteerSchema = z.object({
	organization: z.string()
		.describe('e.g. Facebook')
		.nullable(),
	position: z.string()
		.describe('e.g. Software Engineer')
		.nullable(),
	url: z.string()
		.describe('e.g. http://facebook.example.com')
		.nullable(),
	startDate: Iso8601Schema.nullable(),
	endDate: Iso8601Schema.nullable(),
	summary: z.string()
		.describe('Give an overview of your responsibilities at the company')
		.nullable(),
	highlights: z.array(z.string())
		.describe('Specify accomplishments and achievements')
		.nullable(),
});

export const ResumeEducationSchema = z.object({
	institution: z.string()
		.describe('e.g. Massachusetts Institute of Technology')
		.nullable(),
	url: z.string()
		.describe('e.g. http://facebook.example.com')
		.nullable(),
	area: z.string()
		.describe('e.g. Arts')
		.nullable(),
	studyType: z.string()
		.describe('e.g. Bachelor')
		.nullable(),
	startDate: Iso8601Schema.nullable(),
	endDate: Iso8601Schema.nullable(),
	score: z.string()
		.describe('grade point average, e.g. 3.67/4.0')
		.nullable(),
	courses: z.array(z.string())
		.describe('List notable courses/subjects')
		.nullable(),
});

export const ResumeAwardSchema = z.object({
	title: z.string()
		.describe('e.g. One of the 100 greatest minds of the century')
		.nullable(),
	date: Iso8601Schema.nullable(),
	awarder: z.string()
		.describe('e.g. Time Magazine')
		.nullable(),
	summary: z.string()
		.describe('e.g. Received for my work with Quantum Physics')
		.nullable(),
});

export const ResumeCertificateSchema = z.object({
	name: z.string()
		.describe('e.g. Certified Kubernetes Administrator')
		.nullable(),
	date: Iso8601Schema.nullable(),
	url: z.string()
		.describe('e.g. http://example.com')
		.nullable(),
	issuer: z.string()
		.describe('e.g. CNCF')
		.nullable(),
});

export const ResumePublicationSchema = z.object({
	name: z.string()
		.describe('e.g. The World Wide Web')
		.nullable(),
	publisher: z.string()
		.describe('e.g. IEEE, Computer Magazine')
		.nullable(),
	releaseDate: Iso8601Schema.nullable(),
	url: z.string()
		.describe('e.g. http://www.computer.org.example.com/csdl/mags/co/1996/10/rx069-abs.html')
		.nullable(),
	summary: z.string()
		.describe('Short summary of publication. e.g. Discussion of the World Wide Web, HTTP, HTML.')
		.nullable(),
});

export const ResumeSkillSchema = z.object({
	name: z.string()
		.describe('e.g. Web Development')
		.nullable(),
	level: z.string()
		.describe('e.g. Master')
		.nullable(),
	keywords: z.array(z.string())
		.describe('List some keywords pertaining to this skill')
		.nullable(),
});

export const ResumeLanguageSchema = z.object({
	language: z.string()
		.describe('e.g. English, Spanish')
		.nullable(),
	fluency: z.string()
		.describe('e.g. Fluent, Beginner')
		.nullable(),
});

export const ResumeInterestSchema = z.object({
	name: z.string()
		.describe('e.g. Philosophy')
		.nullable(),
	keywords: z.array(z.string()).nullable(),
});

export const ResumeReferenceSchema = z.object({
	name: z.string()
		.describe('e.g. Timothy Cook')
		.nullable(),
	reference: z.string()
		.describe('e.g. Joe blogs was a great employee, who turned up to work at least once a week. He exceeded my expectations when it came to doing nothing.')
		.nullable(),
});

export const ResumeProjectSchema = z.object({
	name: z.string()
		.describe('e.g. The World Wide Web')
		.nullable(),
	description: z.string()
		.describe('Short summary of project. e.g. Collated works of 2017.')
		.nullable(),
	highlights: z.array(z.string())
		.describe('Specify multiple features')
		.nullable(),
	keywords: z.array(z.string())
		.describe('Specify special elements involved')
		.nullable(),
	startDate: Iso8601Schema.nullable(),
	endDate: Iso8601Schema.nullable(),
	url: z.string()
		.describe('e.g. http://www.computer.org/csdl/mags/co/1996/10/rx069-abs.html')
		.nullable(),
	roles: z.array(z.string())
		.describe('Specify your role on this project or in company')
		.nullable(),
	entity: z.string()
		.describe('Specify the relevant company/entity affiliations e.g. \'greenpeace\', \'corporationXYZ\'')
		.nullable(),
	type: z.string()
		.describe('e.g. \'volunteering\', \'presentation\', \'talk\', \'application\', \'conference\'')
		.nullable(),
});

export const ResumeMetaSchema = z.object({
	canonical: z.string()
		.describe('URL (as per RFC 3986) to latest version of this document')
		.nullable(),
	version: z.string()
		.describe('A version field which follows semver - e.g. v1.0.0')
		.nullable(),
	lastModified: z.string()
		.describe('Using ISO 8601 with YYYY-MM-DDThh:mm:ss')
		.nullable(),
});

export const ResumeJsonSchema = z.object({
	$schema: z.string()
		.describe('link to the version of the schema that can validate the resume')
		.nullable(),
	basics: ResumeBasicsSchema.nullable(),
	work: z.array(ResumeWorkSchema).nullable(),
	volunteer: z.array(ResumeVolunteerSchema).nullable(),
	education: z.array(ResumeEducationSchema).nullable(),
	awards: z.array(ResumeAwardSchema)
		.describe('Specify any awards you have received throughout your professional career')
		.nullable(),
	certificates: z.array(ResumeCertificateSchema)
		.describe('Specify any certificates you have received throughout your professional career')
		.nullable(),
	publications: z.array(ResumePublicationSchema)
		.describe('Specify your publications through your career')
		.nullable(),
	skills: z.array(ResumeSkillSchema)
		.describe('List out your professional skill-set')
		.nullable(),
	languages: z.array(ResumeLanguageSchema)
		.describe('List any other languages you speak')
		.nullable(),
	interests: z.array(ResumeInterestSchema).nullable(),
	references: z.array(ResumeReferenceSchema)
		.describe('List references you have received')
		.nullable(),
	projects: z.array(ResumeProjectSchema)
		.describe('Specify career projects')
		.nullable(),
	meta: ResumeMetaSchema
		.describe('The schema version and any other tooling configuration lives here')
		.nullable(),
});
