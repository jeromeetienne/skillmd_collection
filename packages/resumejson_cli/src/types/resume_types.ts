/**
 * TypeScript types for the JSON Resume schema.
 * Generated from data/schemas/resume.schema.json.
 */

/**
 * ISO-8601 date string. Each section after the year is optional.
 * e.g. `2014-06-29`, `2023-04`, or `2023`.
 */
export type Iso8601 = string;

/**
 * Postal address and geographic location.
 */
export type ResumeLocation = {
	/** Street address. To add multiple address lines, use `\n`. e.g. `1234 Glücklichkeit Straße\nHinterhaus 5. Etage li.`. */
	address: string | null;
	/** Postal/ZIP code. */
	postalCode: string | null;
	/** City name. */
	city: string | null;
	/** Country code as per ISO-3166-1 ALPHA-2. e.g. `US`, `AU`, `IN`. */
	countryCode: string | null;
	/** General region — a US state, province, etc. */
	region: string | null;
	[key: string]: unknown;
};

/**
 * A social network profile (Twitter, GitHub, LinkedIn, etc.).
 */
export type ResumeProfile = {
	/** Network name. e.g. `Facebook` or `Twitter`. */
	network: string | null;
	/** Username on that network. e.g. `neutralthoughts`. */
	username: string | null;
	/** Profile URL (RFC 3986). e.g. `http://twitter.example.com/neutralthoughts`. */
	url: string | null;
	[key: string]: unknown;
};

/**
 * Top-level personal information block.
 */
export type ResumeBasics = {
	/** Full name. */
	name: string | null;
	/** Job title or headline. e.g. `Web Developer`. */
	label: string | null;
	/** URL (RFC 3986) to a profile image in JPEG or PNG format. */
	image: string | null;
	/** Email address. e.g. `thomas@gmail.com`. */
	email: string | null;
	/** Phone number. Stored as a string, any format. e.g. `712-117-2923`. */
	phone: string | null;
	/** Personal website URL (RFC 3986). */
	url: string | null;
	/** Short 2–3 sentence biography. */
	summary: string | null;
	/** Postal address and region. */
	location: ResumeLocation | null;
	/** Social network profiles. */
	profiles: ResumeProfile[] | null;
	[key: string]: unknown;
};

/**
 * A work/employment entry.
 */
export type ResumeWork = {
	/** Company name. e.g. `Facebook`. */
	name: string | null;
	/** Office location. e.g. `Menlo Park, CA`. */
	location: string | null;
	/** Short company description. e.g. `Social Media Company`. */
	description: string | null;
	/** Job title at the company. e.g. `Software Engineer`. */
	position: string | null;
	/** Company URL (RFC 3986). e.g. `http://facebook.example.com`. */
	url: string | null;
	/** Employment start date (ISO-8601). */
	startDate: Iso8601 | null;
	/** Employment end date (ISO-8601). Omit if current. */
	endDate: Iso8601 | null;
	/** Overview of responsibilities at the company. */
	summary: string | null;
	/** Notable accomplishments. e.g. `Increased profits by 20% from 2011-2012 through viral advertising`. */
	highlights: string[] | null;
	[key: string]: unknown;
};

/**
 * A volunteer experience entry.
 */
export type ResumeVolunteer = {
	/** Organization name. e.g. `Facebook`. */
	organization: string | null;
	/** Role within the organization. e.g. `Software Engineer`. */
	position: string | null;
	/** Organization URL (RFC 3986). */
	url: string | null;
	/** Start date (ISO-8601). */
	startDate: Iso8601 | null;
	/** End date (ISO-8601). Omit if current. */
	endDate: Iso8601 | null;
	/** Overview of responsibilities. */
	summary: string | null;
	/** Accomplishments and achievements. */
	highlights: string[] | null;
	[key: string]: unknown;
};

/**
 * An education entry.
 */
export type ResumeEducation = {
	/** Institution name. e.g. `Massachusetts Institute of Technology`. */
	institution: string | null;
	/** Institution URL (RFC 3986). */
	url: string | null;
	/** Field of study. e.g. `Arts`. */
	area: string | null;
	/** Type of degree. e.g. `Bachelor`. */
	studyType: string | null;
	/** Start date (ISO-8601). */
	startDate: Iso8601 | null;
	/** End date (ISO-8601). */
	endDate: Iso8601 | null;
	/** Grade point average. e.g. `3.67/4.0`. */
	score: string | null;
	/** Notable courses/subjects. e.g. `H1302 - Introduction to American history`. */
	courses: string[] | null;
	[key: string]: unknown;
};

/**
 * An award received throughout one's professional career.
 */
export type ResumeAward = {
	/** Award title. e.g. `One of the 100 greatest minds of the century`. */
	title: string | null;
	/** Date awarded (ISO-8601). */
	date: Iso8601 | null;
	/** Awarding body. e.g. `Time Magazine`. */
	awarder: string | null;
	/** Why the award was received. e.g. `Received for my work with Quantum Physics`. */
	summary: string | null;
	[key: string]: unknown;
};

/**
 * A certificate received throughout one's professional career.
 */
export type ResumeCertificate = {
	/** Certificate name. e.g. `Certified Kubernetes Administrator`. */
	name: string | null;
	/** Date earned (ISO-8601). */
	date: Iso8601 | null;
	/** Certificate URL (RFC 3986). */
	url: string | null;
	/** Issuing body. e.g. `CNCF`. */
	issuer: string | null;
	[key: string]: unknown;
};

/**
 * A publication entry.
 */
export type ResumePublication = {
	/** Publication name. e.g. `The World Wide Web`. */
	name: string | null;
	/** Publisher. e.g. `IEEE, Computer Magazine`. */
	publisher: string | null;
	/** Release date (ISO-8601). */
	releaseDate: Iso8601 | null;
	/** Publication URL (RFC 3986). */
	url: string | null;
	/** Short summary of the publication. e.g. `Discussion of the World Wide Web, HTTP, HTML.`. */
	summary: string | null;
	[key: string]: unknown;
};

/**
 * A professional skill entry.
 */
export type ResumeSkill = {
	/** Skill name. e.g. `Web Development`. */
	name: string | null;
	/** Proficiency level. e.g. `Master`. */
	level: string | null;
	/** Keywords pertaining to this skill. e.g. `HTML`. */
	keywords: string[] | null;
	[key: string]: unknown;
};

/**
 * A spoken/written language proficiency.
 */
export type ResumeLanguage = {
	/** Language name. e.g. `English`, `Spanish`. */
	language: string | null;
	/** Fluency level. e.g. `Fluent`, `Beginner`. */
	fluency: string | null;
	[key: string]: unknown;
};

/**
 * A personal interest.
 */
export type ResumeInterest = {
	/** Interest name. e.g. `Philosophy`. */
	name: string | null;
	/** Related keywords. e.g. `Friedrich Nietzsche`. */
	keywords: string[] | null;
	[key: string]: unknown;
};

/**
 * A professional reference.
 */
export type ResumeReference = {
	/** Referrer name. e.g. `Timothy Cook`. */
	name: string | null;
	/** The reference text itself. */
	reference: string | null;
	[key: string]: unknown;
};

/**
 * A career project entry.
 */
export type ResumeProject = {
	/** Project name. e.g. `The World Wide Web`. */
	name: string | null;
	/** Short summary of the project. e.g. `Collated works of 2017.`. */
	description: string | null;
	/** Notable features. e.g. `Directs you close but not quite there`. */
	highlights: string[] | null;
	/** Special elements involved. e.g. `AngularJS`. */
	keywords: string[] | null;
	/** Project start date (ISO-8601). */
	startDate: Iso8601 | null;
	/** Project end date (ISO-8601). */
	endDate: Iso8601 | null;
	/** Project URL (RFC 3986). */
	url: string | null;
	/** Roles on this project. e.g. `Team Lead`, `Speaker`, `Writer`. */
	roles: string[] | null;
	/** Relevant company/entity affiliation. e.g. `greenpeace`, `corporationXYZ`. */
	entity: string | null;
	/** Project type. e.g. `volunteering`, `presentation`, `talk`, `application`, `conference`. */
	type: string | null;
	[key: string]: unknown;
};

/**
 * Schema version and tooling configuration.
 */
export type ResumeMeta = {
	/** URL (RFC 3986) to the latest version of this document. */
	canonical: string | null;
	/** Version following semver. e.g. `v1.0.0`. */
	version: string | null;
	/** Last modified timestamp using ISO-8601 `YYYY-MM-DDThh:mm:ss`. */
	lastModified: string | null;
	[key: string]: unknown;
};

/**
 * A complete JSON Resume document.
 */
export type ResumeJson = {
	/** Link to the version of the schema that can validate this resume. */
	$schema: string | null;
	/** Personal information. */
	basics: ResumeBasics | null;
	/** Work/employment history. */
	work: ResumeWork[] | null;
	/** Volunteer experience. */
	volunteer: ResumeVolunteer[] | null;
	/** Education history. */
	education: ResumeEducation[] | null;
	/** Awards received throughout one's professional career. */
	awards: ResumeAward[] | null;
	/** Certificates received throughout one's professional career. */
	certificates: ResumeCertificate[] | null;
	/** Publications throughout one's career. */
	publications: ResumePublication[] | null;
	/** Professional skill-set. */
	skills: ResumeSkill[] | null;
	/** Other languages spoken. */
	languages: ResumeLanguage[] | null;
	/** Personal interests. */
	interests: ResumeInterest[] | null;
	/** References received. */
	references: ResumeReference[] | null;
	/** Career projects. */
	projects: ResumeProject[] | null;
	/** Schema version and tooling configuration. */
	meta: ResumeMeta | null;
	[key: string]: unknown;
};
