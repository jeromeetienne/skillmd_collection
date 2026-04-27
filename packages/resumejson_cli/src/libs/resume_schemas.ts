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
		.optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
	countryCode: z.string()
		.describe('code as per ISO-3166-1 ALPHA-2, e.g. US, AU, IN')
		.optional(),
	region: z.string()
		.describe('The general region where you live. Can be a US state, or a province, for instance.')
		.optional(),
}).passthrough();

export const ResumeProfileSchema = z.object({
	network: z.string()
		.describe('e.g. Facebook or Twitter')
		.optional(),
	username: z.string()
		.describe('e.g. neutralthoughts')
		.optional(),
	url: z.string().url()
		.describe('e.g. http://twitter.example.com/neutralthoughts')
		.optional(),
}).passthrough();

export const ResumeBasicsSchema = z.object({
	name: z.string().optional(),
	label: z.string()
		.describe('e.g. Web Developer')
		.optional(),
	image: z.string()
		.describe('URL (as per RFC 3986) to a image in JPEG or PNG format')
		.optional(),
	email: z.string().email()
		.describe('e.g. thomas@gmail.com')
		.optional(),
	phone: z.string()
		.describe('Phone numbers are stored as strings so use any format you like, e.g. 712-117-2923')
		.optional(),
	url: z.string().url()
		.describe('URL (as per RFC 3986) to your website, e.g. personal homepage')
		.optional(),
	summary: z.string()
		.describe('Write a short 2-3 sentence biography about yourself')
		.optional(),
	location: ResumeLocationSchema.optional(),
	profiles: z.array(ResumeProfileSchema)
		.describe('Specify any number of social networks that you participate in')
		.optional(),
}).passthrough();

export const ResumeWorkSchema = z.object({
	name: z.string()
		.describe('e.g. Facebook')
		.optional(),
	location: z.string()
		.describe('e.g. Menlo Park, CA')
		.optional(),
	description: z.string()
		.describe('e.g. Social Media Company')
		.optional(),
	position: z.string()
		.describe('e.g. Software Engineer')
		.optional(),
	url: z.string().url()
		.describe('e.g. http://facebook.example.com')
		.optional(),
	startDate: Iso8601Schema.optional(),
	endDate: Iso8601Schema.optional(),
	summary: z.string()
		.describe('Give an overview of your responsibilities at the company')
		.optional(),
	highlights: z.array(z.string())
		.describe('Specify multiple accomplishments')
		.optional(),
}).passthrough();

export const ResumeVolunteerSchema = z.object({
	organization: z.string()
		.describe('e.g. Facebook')
		.optional(),
	position: z.string()
		.describe('e.g. Software Engineer')
		.optional(),
	url: z.string().url()
		.describe('e.g. http://facebook.example.com')
		.optional(),
	startDate: Iso8601Schema.optional(),
	endDate: Iso8601Schema.optional(),
	summary: z.string()
		.describe('Give an overview of your responsibilities at the company')
		.optional(),
	highlights: z.array(z.string())
		.describe('Specify accomplishments and achievements')
		.optional(),
}).passthrough();

export const ResumeEducationSchema = z.object({
	institution: z.string()
		.describe('e.g. Massachusetts Institute of Technology')
		.optional(),
	url: z.string().url()
		.describe('e.g. http://facebook.example.com')
		.optional(),
	area: z.string()
		.describe('e.g. Arts')
		.optional(),
	studyType: z.string()
		.describe('e.g. Bachelor')
		.optional(),
	startDate: Iso8601Schema.optional(),
	endDate: Iso8601Schema.optional(),
	score: z.string()
		.describe('grade point average, e.g. 3.67/4.0')
		.optional(),
	courses: z.array(z.string())
		.describe('List notable courses/subjects')
		.optional(),
}).passthrough();

export const ResumeAwardSchema = z.object({
	title: z.string()
		.describe('e.g. One of the 100 greatest minds of the century')
		.optional(),
	date: Iso8601Schema.optional(),
	awarder: z.string()
		.describe('e.g. Time Magazine')
		.optional(),
	summary: z.string()
		.describe('e.g. Received for my work with Quantum Physics')
		.optional(),
}).passthrough();

export const ResumeCertificateSchema = z.object({
	name: z.string()
		.describe('e.g. Certified Kubernetes Administrator')
		.optional(),
	date: Iso8601Schema.optional(),
	url: z.string().url()
		.describe('e.g. http://example.com')
		.optional(),
	issuer: z.string()
		.describe('e.g. CNCF')
		.optional(),
}).passthrough();

export const ResumePublicationSchema = z.object({
	name: z.string()
		.describe('e.g. The World Wide Web')
		.optional(),
	publisher: z.string()
		.describe('e.g. IEEE, Computer Magazine')
		.optional(),
	releaseDate: Iso8601Schema.optional(),
	url: z.string().url()
		.describe('e.g. http://www.computer.org.example.com/csdl/mags/co/1996/10/rx069-abs.html')
		.optional(),
	summary: z.string()
		.describe('Short summary of publication. e.g. Discussion of the World Wide Web, HTTP, HTML.')
		.optional(),
}).passthrough();

export const ResumeSkillSchema = z.object({
	name: z.string()
		.describe('e.g. Web Development')
		.optional(),
	level: z.string()
		.describe('e.g. Master')
		.optional(),
	keywords: z.array(z.string())
		.describe('List some keywords pertaining to this skill')
		.optional(),
}).passthrough();

export const ResumeLanguageSchema = z.object({
	language: z.string()
		.describe('e.g. English, Spanish')
		.optional(),
	fluency: z.string()
		.describe('e.g. Fluent, Beginner')
		.optional(),
}).passthrough();

export const ResumeInterestSchema = z.object({
	name: z.string()
		.describe('e.g. Philosophy')
		.optional(),
	keywords: z.array(z.string()).optional(),
}).passthrough();

export const ResumeReferenceSchema = z.object({
	name: z.string()
		.describe('e.g. Timothy Cook')
		.optional(),
	reference: z.string()
		.describe('e.g. Joe blogs was a great employee, who turned up to work at least once a week. He exceeded my expectations when it came to doing nothing.')
		.optional(),
}).passthrough();

export const ResumeProjectSchema = z.object({
	name: z.string()
		.describe('e.g. The World Wide Web')
		.optional(),
	description: z.string()
		.describe('Short summary of project. e.g. Collated works of 2017.')
		.optional(),
	highlights: z.array(z.string())
		.describe('Specify multiple features')
		.optional(),
	keywords: z.array(z.string())
		.describe('Specify special elements involved')
		.optional(),
	startDate: Iso8601Schema.optional(),
	endDate: Iso8601Schema.optional(),
	url: z.string().url()
		.describe('e.g. http://www.computer.org/csdl/mags/co/1996/10/rx069-abs.html')
		.optional(),
	roles: z.array(z.string())
		.describe('Specify your role on this project or in company')
		.optional(),
	entity: z.string()
		.describe('Specify the relevant company/entity affiliations e.g. \'greenpeace\', \'corporationXYZ\'')
		.optional(),
	type: z.string()
		.describe('e.g. \'volunteering\', \'presentation\', \'talk\', \'application\', \'conference\'')
		.optional(),
}).passthrough();

export const ResumeMetaSchema = z.object({
	canonical: z.string().url()
		.describe('URL (as per RFC 3986) to latest version of this document')
		.optional(),
	version: z.string()
		.describe('A version field which follows semver - e.g. v1.0.0')
		.optional(),
	lastModified: z.string()
		.describe('Using ISO 8601 with YYYY-MM-DDThh:mm:ss')
		.optional(),
}).passthrough();

export const ResumeSchema = z.object({
	$schema: z.string().url()
		.describe('link to the version of the schema that can validate the resume')
		.optional(),
	basics: ResumeBasicsSchema.optional(),
	work: z.array(ResumeWorkSchema).optional(),
	volunteer: z.array(ResumeVolunteerSchema).optional(),
	education: z.array(ResumeEducationSchema).optional(),
	awards: z.array(ResumeAwardSchema)
		.describe('Specify any awards you have received throughout your professional career')
		.optional(),
	certificates: z.array(ResumeCertificateSchema)
		.describe('Specify any certificates you have received throughout your professional career')
		.optional(),
	publications: z.array(ResumePublicationSchema)
		.describe('Specify your publications through your career')
		.optional(),
	skills: z.array(ResumeSkillSchema)
		.describe('List out your professional skill-set')
		.optional(),
	languages: z.array(ResumeLanguageSchema)
		.describe('List any other languages you speak')
		.optional(),
	interests: z.array(ResumeInterestSchema).optional(),
	references: z.array(ResumeReferenceSchema)
		.describe('List references you have received')
		.optional(),
	projects: z.array(ResumeProjectSchema)
		.describe('Specify career projects')
		.optional(),
	meta: ResumeMetaSchema
		.describe('The schema version and any other tooling configuration lives here')
		.optional(),
}).passthrough();
