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
	address?: string;
	/** Postal/ZIP code. */
	postalCode?: string;
	/** City name. */
	city?: string;
	/** Country code as per ISO-3166-1 ALPHA-2. e.g. `US`, `AU`, `IN`. */
	countryCode?: string;
	/** General region — a US state, province, etc. */
	region?: string;
	[key: string]: unknown;
};

/**
 * A social network profile (Twitter, GitHub, LinkedIn, etc.).
 */
export type ResumeProfile = {
	/** Network name. e.g. `Facebook` or `Twitter`. */
	network?: string;
	/** Username on that network. e.g. `neutralthoughts`. */
	username?: string;
	/** Profile URL (RFC 3986). e.g. `http://twitter.example.com/neutralthoughts`. */
	url?: string;
	[key: string]: unknown;
};

/**
 * Top-level personal information block.
 */
export type ResumeBasics = {
	/** Full name. */
	name?: string;
	/** Job title or headline. e.g. `Web Developer`. */
	label?: string;
	/** URL (RFC 3986) to a profile image in JPEG or PNG format. */
	image?: string;
	/** Email address. e.g. `thomas@gmail.com`. */
	email?: string;
	/** Phone number. Stored as a string, any format. e.g. `712-117-2923`. */
	phone?: string;
	/** Personal website URL (RFC 3986). */
	url?: string;
	/** Short 2–3 sentence biography. */
	summary?: string;
	/** Postal address and region. */
	location?: ResumeLocation;
	/** Social network profiles. */
	profiles?: ResumeProfile[];
	[key: string]: unknown;
};

/**
 * A work/employment entry.
 */
export type ResumeWork = {
	/** Company name. e.g. `Facebook`. */
	name?: string;
	/** Office location. e.g. `Menlo Park, CA`. */
	location?: string;
	/** Short company description. e.g. `Social Media Company`. */
	description?: string;
	/** Job title at the company. e.g. `Software Engineer`. */
	position?: string;
	/** Company URL (RFC 3986). e.g. `http://facebook.example.com`. */
	url?: string;
	/** Employment start date (ISO-8601). */
	startDate?: Iso8601;
	/** Employment end date (ISO-8601). Omit if current. */
	endDate?: Iso8601;
	/** Overview of responsibilities at the company. */
	summary?: string;
	/** Notable accomplishments. e.g. `Increased profits by 20% from 2011-2012 through viral advertising`. */
	highlights?: string[];
	[key: string]: unknown;
};

/**
 * A volunteer experience entry.
 */
export type ResumeVolunteer = {
	/** Organization name. e.g. `Facebook`. */
	organization?: string;
	/** Role within the organization. e.g. `Software Engineer`. */
	position?: string;
	/** Organization URL (RFC 3986). */
	url?: string;
	/** Start date (ISO-8601). */
	startDate?: Iso8601;
	/** End date (ISO-8601). Omit if current. */
	endDate?: Iso8601;
	/** Overview of responsibilities. */
	summary?: string;
	/** Accomplishments and achievements. */
	highlights?: string[];
	[key: string]: unknown;
};

/**
 * An education entry.
 */
export type ResumeEducation = {
	/** Institution name. e.g. `Massachusetts Institute of Technology`. */
	institution?: string;
	/** Institution URL (RFC 3986). */
	url?: string;
	/** Field of study. e.g. `Arts`. */
	area?: string;
	/** Type of degree. e.g. `Bachelor`. */
	studyType?: string;
	/** Start date (ISO-8601). */
	startDate?: Iso8601;
	/** End date (ISO-8601). */
	endDate?: Iso8601;
	/** Grade point average. e.g. `3.67/4.0`. */
	score?: string;
	/** Notable courses/subjects. e.g. `H1302 - Introduction to American history`. */
	courses?: string[];
	[key: string]: unknown;
};

/**
 * An award received throughout one's professional career.
 */
export type ResumeAward = {
	/** Award title. e.g. `One of the 100 greatest minds of the century`. */
	title?: string;
	/** Date awarded (ISO-8601). */
	date?: Iso8601;
	/** Awarding body. e.g. `Time Magazine`. */
	awarder?: string;
	/** Why the award was received. e.g. `Received for my work with Quantum Physics`. */
	summary?: string;
	[key: string]: unknown;
};

/**
 * A certificate received throughout one's professional career.
 */
export type ResumeCertificate = {
	/** Certificate name. e.g. `Certified Kubernetes Administrator`. */
	name?: string;
	/** Date earned (ISO-8601). */
	date?: Iso8601;
	/** Certificate URL (RFC 3986). */
	url?: string;
	/** Issuing body. e.g. `CNCF`. */
	issuer?: string;
	[key: string]: unknown;
};

/**
 * A publication entry.
 */
export type ResumePublication = {
	/** Publication name. e.g. `The World Wide Web`. */
	name?: string;
	/** Publisher. e.g. `IEEE, Computer Magazine`. */
	publisher?: string;
	/** Release date (ISO-8601). */
	releaseDate?: Iso8601;
	/** Publication URL (RFC 3986). */
	url?: string;
	/** Short summary of the publication. e.g. `Discussion of the World Wide Web, HTTP, HTML.`. */
	summary?: string;
	[key: string]: unknown;
};

/**
 * A professional skill entry.
 */
export type ResumeSkill = {
	/** Skill name. e.g. `Web Development`. */
	name?: string;
	/** Proficiency level. e.g. `Master`. */
	level?: string;
	/** Keywords pertaining to this skill. e.g. `HTML`. */
	keywords?: string[];
	[key: string]: unknown;
};

/**
 * A spoken/written language proficiency.
 */
export type ResumeLanguage = {
	/** Language name. e.g. `English`, `Spanish`. */
	language?: string;
	/** Fluency level. e.g. `Fluent`, `Beginner`. */
	fluency?: string;
	[key: string]: unknown;
};

/**
 * A personal interest.
 */
export type ResumeInterest = {
	/** Interest name. e.g. `Philosophy`. */
	name?: string;
	/** Related keywords. e.g. `Friedrich Nietzsche`. */
	keywords?: string[];
	[key: string]: unknown;
};

/**
 * A professional reference.
 */
export type ResumeReference = {
	/** Referrer name. e.g. `Timothy Cook`. */
	name?: string;
	/** The reference text itself. */
	reference?: string;
	[key: string]: unknown;
};

/**
 * A career project entry.
 */
export type ResumeProject = {
	/** Project name. e.g. `The World Wide Web`. */
	name?: string;
	/** Short summary of the project. e.g. `Collated works of 2017.`. */
	description?: string;
	/** Notable features. e.g. `Directs you close but not quite there`. */
	highlights?: string[];
	/** Special elements involved. e.g. `AngularJS`. */
	keywords?: string[];
	/** Project start date (ISO-8601). */
	startDate?: Iso8601;
	/** Project end date (ISO-8601). */
	endDate?: Iso8601;
	/** Project URL (RFC 3986). */
	url?: string;
	/** Roles on this project. e.g. `Team Lead`, `Speaker`, `Writer`. */
	roles?: string[];
	/** Relevant company/entity affiliation. e.g. `greenpeace`, `corporationXYZ`. */
	entity?: string;
	/** Project type. e.g. `volunteering`, `presentation`, `talk`, `application`, `conference`. */
	type?: string;
	[key: string]: unknown;
};

/**
 * Schema version and tooling configuration.
 */
export type ResumeMeta = {
	/** URL (RFC 3986) to the latest version of this document. */
	canonical?: string;
	/** Version following semver. e.g. `v1.0.0`. */
	version?: string;
	/** Last modified timestamp using ISO-8601 `YYYY-MM-DDThh:mm:ss`. */
	lastModified?: string;
	[key: string]: unknown;
};

/**
 * A complete JSON Resume document.
 */
export type Resume = {
	/** Link to the version of the schema that can validate this resume. */
	$schema?: string;
	/** Personal information. */
	basics?: ResumeBasics;
	/** Work/employment history. */
	work?: ResumeWork[];
	/** Volunteer experience. */
	volunteer?: ResumeVolunteer[];
	/** Education history. */
	education?: ResumeEducation[];
	/** Awards received throughout one's professional career. */
	awards?: ResumeAward[];
	/** Certificates received throughout one's professional career. */
	certificates?: ResumeCertificate[];
	/** Publications throughout one's career. */
	publications?: ResumePublication[];
	/** Professional skill-set. */
	skills?: ResumeSkill[];
	/** Other languages spoken. */
	languages?: ResumeLanguage[];
	/** Personal interests. */
	interests?: ResumeInterest[];
	/** References received. */
	references?: ResumeReference[];
	/** Career projects. */
	projects?: ResumeProject[];
	/** Schema version and tooling configuration. */
	meta?: ResumeMeta;
	[key: string]: unknown;
};
