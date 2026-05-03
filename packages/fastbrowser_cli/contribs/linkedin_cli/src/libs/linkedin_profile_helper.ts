// npm imports
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type LinkedinExperienceRole = {
	role: string | null;
	employmentType: string | null;
	duration: string | null;
	location: string | null;
	description: string | null;
};

export type LinkedinExperience = {
	company: string | null;
	totalDuration: string | null;
	roles: LinkedinExperienceRole[];
};

export type LinkedinEducation = {
	school: string | null;
	degree: string | null;
	dates: string | null;
};

export type LinkedinProfile = {
	slug: string;
	displayName: string | null;
	headline: string | null;
	location: string | null;
	connectionsCount: string | null;
	followersCount: string | null;
	about: string | null;
	website: string | null;
	currentCompany: string | null;
	currentEducation: string | null;
	openToWork: boolean;
	experience: LinkedinExperience[];
	education: LinkedinEducation[];
};

const HERO_BUTTON_BLACKLIST = new Set<string>([
	'Resources',
	'Open to',
	'Enhance profile',
	'More',
	'Message',
	'Profile photo',
	'Featured overflow menu',
	'Next',
	'Previous',
	'Add experience',
	'Add education',
]);

const DURATION_REGEXP = /\d{4}|Present|\byrs?\b|\bmos?\b/;

const EMPLOYMENT_TYPES = new Set<string>([
	'Full-time',
	'Part-time',
	'Self-employed',
	'Contract',
	'Freelance',
	'Internship',
	'Apprenticeship',
	'Seasonal',
]);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class LinkedinProfileHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static parseProfile(rawSnapshot: string, slug: string): LinkedinProfile {
		const treeText = LinkedinProfileHelper.extractAxTreeText(rawSnapshot);
		const profile: LinkedinProfile = {
			slug,
			displayName: null,
			headline: null,
			location: null,
			connectionsCount: null,
			followersCount: null,
			about: null,
			website: null,
			currentCompany: null,
			currentEducation: null,
			openToWork: false,
			experience: [],
			education: [],
		};
		if (treeText.length === 0) {
			return profile;
		}
		const root = A11yTree.parse(treeText);
		const heroLink = LinkedinProfileHelper.findHeroProfileLink(root, slug);
		const heroCard = heroLink !== undefined ? LinkedinProfileHelper.findHeroCard(heroLink) : undefined;
		const contactInfoLink = A11yQuery.querySelector(root, 'link[name="Contact info"]');

		profile.displayName = LinkedinProfileHelper.extractDisplayName(heroLink);
		profile.location = LinkedinProfileHelper.extractLocation(contactInfoLink);
		profile.headline = LinkedinProfileHelper.extractHeadline(heroCard, profile.location);
		profile.connectionsCount = LinkedinProfileHelper.extractConnectionsCount(root);
		profile.followersCount = LinkedinProfileHelper.extractFollowersCount(root);
		profile.about = LinkedinProfileHelper.extractAbout(root);
		profile.openToWork = LinkedinProfileHelper.extractOpenToWork(root);

		const heroButtons = heroCard !== undefined ? LinkedinProfileHelper.collectHeroButtons(heroCard) : [];
		profile.website = LinkedinProfileHelper.extractWebsite(root);
		const companyAndSchool = LinkedinProfileHelper.extractCompanyAndSchool(heroButtons);
		profile.currentCompany = companyAndSchool.company;
		profile.currentEducation = companyAndSchool.school;

		profile.experience = LinkedinProfileHelper.extractExperience(root);
		profile.education = LinkedinProfileHelper.extractEducation(root);

		return profile;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static formatMarkdown(profile: LinkedinProfile): string {
		const headerName = profile.displayName !== null ? profile.displayName : profile.slug;
		const lines: string[] = [];
		lines.push(`# ${headerName} (${profile.slug})`);
		const fields: { label: string; value: string | null; }[] = [
			{ label: 'Headline', value: profile.headline },
			{ label: 'Location', value: profile.location },
			{ label: 'Connections', value: profile.connectionsCount },
			{ label: 'Followers', value: profile.followersCount },
			{ label: 'Current', value: profile.currentCompany },
			{ label: 'Education', value: profile.currentEducation },
			{ label: 'Website', value: profile.website },
		];
		for (const field of fields) {
			if (field.value === null) {
				continue;
			}
			lines.push(`- ${field.label}: ${field.value}`);
		}
		if (profile.openToWork === true) {
			lines.push('- Open to work: yes');
		}
		if (profile.about !== null) {
			lines.push('');
			lines.push('## About');
			lines.push(profile.about);
		}
		if (profile.experience.length > 0) {
			lines.push('');
			lines.push('## Experience');
			for (const exp of profile.experience) {
				const heading = exp.totalDuration !== null
					? `### ${exp.company ?? ''} — ${exp.totalDuration}`
					: `### ${exp.company ?? ''}`;
				lines.push(heading);
				for (const role of exp.roles) {
					lines.push(LinkedinProfileHelper.formatRoleLine(role));
					if (role.description !== null) {
						lines.push(`  ${role.description}`);
					}
				}
			}
		}
		if (profile.education.length > 0) {
			lines.push('');
			lines.push('## Education');
			for (const edu of profile.education) {
				lines.push(LinkedinProfileHelper.formatEducationLine(edu));
			}
		}
		return lines.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static resolveSafetyUrl(url: string): string {
		const prefix = 'https://www.linkedin.com/safety/go/?';
		if (url.startsWith(prefix) === false) {
			return url;
		}
		const queryString = url.slice(prefix.length);
		const params = new URLSearchParams(queryString);
		const target = params.get('url');
		if (target === null) {
			return url;
		}
		return target;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — common helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractAxTreeText(rawOutput: string): string {
		const lines: string[] = [];
		for (const line of rawOutput.split('\n')) {
			if (/^\s*uid=/.test(line) === true) {
				lines.push(line);
			}
		}
		return lines.join('\n');
	}

	private static cleanString(value: string | undefined): string | null {
		if (value === undefined) {
			return null;
		}
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return null;
		}
		return trimmed;
	}

	private static getValue(node: AxNode): string | null {
		return LinkedinProfileHelper.cleanString(node.attributes['value']);
	}

	private static collectParagraphValues(node: AxNode, options: { stopAtList: boolean; }): string[] {
		const values: string[] = [];
		LinkedinProfileHelper.collectParagraphValuesInner(node, options, values);
		return values;
	}

	private static collectParagraphValuesInner(node: AxNode, options: { stopAtList: boolean; }, out: string[]): void {
		for (const child of node.children) {
			if (options.stopAtList === true && child.role === 'list') {
				continue;
			}
			if (child.role === 'paragraph') {
				const value = LinkedinProfileHelper.getValue(child);
				if (value !== null) {
					out.push(value);
				}
			}
			LinkedinProfileHelper.collectParagraphValuesInner(child, options, out);
		}
	}

	private static collectSubtreeText(node: AxNode): string | null {
		const parts: string[] = [];
		for (const descendant of A11yTree.walk(node)) {
			if (descendant.role === 'StaticText' && descendant.name !== undefined) {
				const trimmed = descendant.name.trim();
				if (trimmed.length > 0) {
					parts.push(trimmed);
				}
			}
		}
		if (parts.length === 0) {
			return null;
		}
		return parts.join(' ').trim();
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — hero card identification
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static findHeroProfileLink(root: AxNode, slug: string): AxNode | undefined {
		const candidates = A11yQuery.querySelectorAll(root, `link[url="https://www.linkedin.com/in/${slug}/"]`);
		for (const candidate of candidates) {
			const heading = A11yQuery.querySelector(candidate, 'heading[level="2"]');
			if (heading !== undefined) {
				return candidate;
			}
		}
		return undefined;
	}

	private static findHeroCard(heroLink: AxNode): AxNode {
		// Walk up until we find an ancestor that also contains the contact info link,
		// then go up one more level so the hero card includes the sibling block where
		// LinkedIn renders the current company / school / website buttons.
		let cursor: AxNode | undefined = heroLink.parent;
		for (let depth = 0; depth < 8; depth++) {
			if (cursor === undefined) {
				break;
			}
			const contact = A11yQuery.querySelector(cursor, 'link[name="Contact info"]');
			if (contact !== undefined) {
				return cursor.parent ?? cursor;
			}
			cursor = cursor.parent;
		}
		return heroLink;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — header fields
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractDisplayName(heroLink: AxNode | undefined): string | null {
		if (heroLink === undefined) {
			return null;
		}
		const heading = A11yQuery.querySelector(heroLink, 'heading[level="2"]');
		if (heading === undefined) {
			return null;
		}
		return LinkedinProfileHelper.cleanString(heading.name);
	}

	private static extractLocation(contactInfoLink: AxNode | undefined): string | null {
		if (contactInfoLink === undefined) {
			return null;
		}
		const grandparent = contactInfoLink.parent?.parent;
		if (grandparent === undefined) {
			return null;
		}
		for (const child of grandparent.children) {
			if (child.role !== 'paragraph') {
				continue;
			}
			const value = LinkedinProfileHelper.getValue(child);
			if (value === null) {
				continue;
			}
			if (value === '·') {
				continue;
			}
			return value;
		}
		return null;
	}

	private static extractHeadline(heroCard: AxNode | undefined, location: string | null): string | null {
		if (heroCard === undefined) {
			return null;
		}
		for (const node of A11yTree.walk(heroCard)) {
			if (node.role !== 'paragraph') {
				continue;
			}
			const value = LinkedinProfileHelper.getValue(node);
			if (value === null) {
				continue;
			}
			if (value.startsWith('·') === true) {
				continue;
			}
			if (location !== null && value === location) {
				continue;
			}
			if (/^[\d,]+\+?\s+(followers|connections)$/.test(value) === true) {
				continue;
			}
			return value;
		}
		return null;
	}

	private static extractConnectionsCount(root: AxNode): string | null {
		for (const node of A11yTree.walk(root)) {
			if (node.role !== 'paragraph') {
				continue;
			}
			const value = LinkedinProfileHelper.getValue(node);
			if (value === null) {
				continue;
			}
			const match = /^([\d,]+\+?) connections$/.exec(value);
			if (match === null) {
				continue;
			}
			return match[1];
		}
		return null;
	}

	private static extractFollowersCount(root: AxNode): string | null {
		for (const node of A11yTree.walk(root)) {
			const candidates: (string | undefined)[] = [
				node.attributes['value'],
				node.name,
			];
			for (const candidate of candidates) {
				if (candidate === undefined) {
					continue;
				}
				const match = /^([\d,]+\+?) followers$/.exec(candidate.trim());
				if (match === null) {
					continue;
				}
				return match[1];
			}
		}
		return null;
	}

	private static extractAbout(root: AxNode): string | null {
		const heading = LinkedinProfileHelper.findSectionHeading(root, 'About');
		if (heading === undefined) {
			return null;
		}
		const section = LinkedinProfileHelper.findSectionBody(heading);
		if (section === undefined) {
			return null;
		}
		return LinkedinProfileHelper.collectSubtreeText(section);
	}

	private static extractOpenToWork(root: AxNode): boolean {
		for (const node of A11yTree.walk(root)) {
			if (node.attributes['value'] === 'Open to work') {
				return true;
			}
		}
		return false;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — hero buttons (current company / education / website)
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static collectHeroButtons(heroCard: AxNode): AxNode[] {
		const buttons: AxNode[] = [];
		for (const node of A11yTree.walk(heroCard)) {
			if (node.role !== 'button') {
				continue;
			}
			const name = LinkedinProfileHelper.cleanString(node.name);
			if (name === null) {
				continue;
			}
			if (HERO_BUTTON_BLACKLIST.has(name) === true) {
				continue;
			}
			if (/notification|Premium|verifications/i.test(name) === true) {
				continue;
			}
			buttons.push(node);
		}
		return buttons;
	}

	private static extractWebsite(root: AxNode): string | null {
		// Walk in document order. The website link sits between the displayName heading
		// and the first "content section" heading (Highlights / About / Analytics / etc.).
		// LinkedIn places it inside a `button` whose child link points to its safety/go redirector.
		const sectionBoundaryNames = new Set<string>([
			'Highlights',
			'About',
			'Analytics',
			'Featured',
			'Activity',
			'Services',
			'Experience',
			'Education',
		]);
		let inHeroRegion = false;
		for (const node of A11yTree.walk(root)) {
			if (node.role === 'heading' && node.attributes['level'] === '2') {
				const name = node.name;
				if (inHeroRegion === false) {
					if (name !== undefined && name !== '0 notifications' && name !== '0 notifications total') {
						inHeroRegion = true;
					}
					continue;
				}
				if (name !== undefined && sectionBoundaryNames.has(name) === true) {
					return null;
				}
				continue;
			}
			if (inHeroRegion === false) {
				continue;
			}
			if (node.role !== 'link') {
				continue;
			}
			const url = node.attributes['url'];
			if (url === undefined) {
				continue;
			}
			if (url.startsWith('https://www.linkedin.com/safety/go/') === false) {
				continue;
			}
			return LinkedinProfileHelper.resolveSafetyUrl(url);
		}
		return null;
	}

	private static extractCompanyAndSchool(heroButtons: AxNode[]): { company: string | null; school: string | null; } {
		const result: { company: string | null; school: string | null; } = { company: null, school: null };
		const remaining: AxNode[] = [];
		for (const button of heroButtons) {
			const link = A11yQuery.querySelector(button, 'link[url^="https://www.linkedin.com/safety/go/"]');
			if (link !== undefined) {
				continue;
			}
			remaining.push(button);
		}
		if (remaining.length >= 1) {
			result.company = LinkedinProfileHelper.cleanString(remaining[0].name);
		}
		if (remaining.length >= 2) {
			result.school = LinkedinProfileHelper.cleanString(remaining[1].name);
		}
		return result;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — section helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static findSectionHeading(root: AxNode, name: string): AxNode | undefined {
		for (const node of A11yQuery.querySelectorAll(root, 'heading[level="2"]')) {
			if (node.name === name) {
				return node;
			}
			if (node.name !== undefined && node.name.startsWith(`${name} (`) === true) {
				return node;
			}
		}
		return undefined;
	}

	private static findSectionBody(heading: AxNode): AxNode | undefined {
		// Find the first sibling (or sibling-of-ancestor) after the heading that holds
		// real content. Skip over wrappers that only contain action buttons / links
		// (LinkedIn renders Add / Edit controls between the heading and the body on
		// the user's own profile).
		let cursor: AxNode | undefined = heading;
		for (let depth = 0; depth < 4; depth++) {
			if (cursor === undefined) {
				break;
			}
			const parent: AxNode | undefined = cursor.parent;
			if (parent === undefined) {
				break;
			}
			const idx = parent.children.indexOf(cursor);
			for (let i = idx + 1; i < parent.children.length; i++) {
				const sibling = parent.children[i];
				if (sibling.role !== 'generic' && sibling.role !== 'paragraph' && sibling.role !== 'list') {
					continue;
				}
				if (LinkedinProfileHelper.isControlContainer(sibling) === true) {
					continue;
				}
				return sibling;
			}
			cursor = parent;
		}
		return undefined;
	}

	private static isControlContainer(node: AxNode): boolean {
		if (node.role !== 'generic') {
			return false;
		}
		if (node.children.length === 0) {
			return false;
		}
		for (const child of node.children) {
			if (child.role !== 'button' && child.role !== 'link') {
				return false;
			}
		}
		return true;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — experience
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractExperience(root: AxNode): LinkedinExperience[] {
		const heading = LinkedinProfileHelper.findSectionHeading(root, 'Experience');
		if (heading === undefined) {
			return [];
		}
		const body = LinkedinProfileHelper.findSectionBody(heading);
		if (body === undefined) {
			return [];
		}
		const entries: LinkedinExperience[] = [];
		for (const child of body.children) {
			if (child.role !== 'generic') {
				continue;
			}
			const entry = LinkedinProfileHelper.parseExperienceEntry(child);
			if (entry === null) {
				continue;
			}
			entries.push(entry);
		}
		return entries;
	}

	private static parseExperienceEntry(entry: AxNode): LinkedinExperience | null {
		const logoName = LinkedinProfileHelper.findLogoName(entry);
		const directList = LinkedinProfileHelper.findDirectChildList(entry);
		if (directList !== undefined) {
			return LinkedinProfileHelper.parseMultiRoleExperience(entry, directList, logoName);
		}
		return LinkedinProfileHelper.parseSingleRoleExperience(entry, logoName);
	}

	private static buildSkipValues(values: (string | null)[]): Set<string> {
		const skip = new Set<string>();
		for (const value of values) {
			if (value === null) {
				continue;
			}
			skip.add(value);
		}
		return skip;
	}

	private static findLogoName(entry: AxNode): string | null {
		for (const node of A11yTree.walk(entry)) {
			if (node.role !== 'img') {
				continue;
			}
			const name = LinkedinProfileHelper.cleanString(node.name);
			if (name === null) {
				continue;
			}
			if (name.endsWith(' logo') === true) {
				return name.slice(0, name.length - ' logo'.length).trim();
			}
		}
		return null;
	}

	private static findDirectChildList(entry: AxNode): AxNode | undefined {
		const stack: AxNode[] = [...entry.children];
		while (stack.length > 0) {
			const node = stack.shift();
			if (node === undefined) {
				continue;
			}
			if (node.role === 'list') {
				return node;
			}
			if (node.role === 'listitem' || node.role === 'list') {
				continue;
			}
			// Only descend through wrappers that are likely to be siblings of a list,
			// not into actual list contents.
			if (node.role === 'generic') {
				stack.push(...node.children);
			}
		}
		return undefined;
	}

	private static parseMultiRoleExperience(entry: AxNode, list: AxNode, logoName: string | null): LinkedinExperience {
		const headerValues = LinkedinProfileHelper.collectParagraphValues(entry, { stopAtList: true });
		const company = headerValues.length > 0 ? headerValues[0] : logoName;
		const totalDuration = headerValues.length > 1 ? headerValues[1] : null;
		const skip = LinkedinProfileHelper.buildSkipValues([company, totalDuration]);
		const roles: LinkedinExperienceRole[] = [];
		for (const item of list.children) {
			if (item.role !== 'listitem') {
				continue;
			}
			roles.push(LinkedinProfileHelper.parseRoleEntry(item, skip));
		}
		return {
			company,
			totalDuration,
			roles,
		};
	}

	private static parseSingleRoleExperience(entry: AxNode, logoName: string | null): LinkedinExperience {
		const skip = LinkedinProfileHelper.buildSkipValues([logoName]);
		const role = LinkedinProfileHelper.parseRoleEntry(entry, skip);
		let company: string | null = logoName;
		const values = LinkedinProfileHelper.collectParagraphValues(entry, { stopAtList: false });
		// The company name is generally one of the paragraphs near the top.
		// We trust the logo name first, but fall back to a paragraph that looks like a company.
		if (company === null) {
			for (const value of values) {
				if (DURATION_REGEXP.test(value) === true) {
					continue;
				}
				if (value === role.role) {
					continue;
				}
				company = value;
				break;
			}
		}
		return {
			company,
			totalDuration: null,
			roles: [role],
		};
	}

	private static parseRoleEntry(entry: AxNode, skipValues: Set<string>): LinkedinExperienceRole {
		const values = LinkedinProfileHelper.collectParagraphValues(entry, { stopAtList: true });
		const role: LinkedinExperienceRole = {
			role: null,
			employmentType: null,
			duration: null,
			location: null,
			description: null,
		};
		const consumed = new Set<number>();
		// First non-empty value is the role title.
		for (let i = 0; i < values.length; i++) {
			const value = values[i];
			role.role = value;
			consumed.add(i);
			break;
		}
		// Find duration (matches a date-like pattern).
		for (let i = 0; i < values.length; i++) {
			if (consumed.has(i) === true) {
				continue;
			}
			if (DURATION_REGEXP.test(values[i]) === true) {
				role.duration = values[i];
				consumed.add(i);
				break;
			}
		}
		// Detect employment type, possibly embedded in "Company · Type".
		for (let i = 0; i < values.length; i++) {
			if (consumed.has(i) === true) {
				continue;
			}
			const value = values[i];
			const type = LinkedinProfileHelper.extractEmploymentType(value);
			if (type !== null) {
				role.employmentType = type;
				consumed.add(i);
				break;
			}
		}
		// Remaining unconsumed values: pick the first one that's not a URL and
		// not a known company / total-duration value already consumed by the caller.
		for (let i = 0; i < values.length; i++) {
			if (consumed.has(i) === true) {
				continue;
			}
			const value = values[i];
			if (value.startsWith('http://') === true || value.startsWith('https://') === true) {
				continue;
			}
			if (skipValues.has(value) === true) {
				continue;
			}
			role.location = value;
			consumed.add(i);
			break;
		}
		role.description = LinkedinProfileHelper.findRoleDescription(entry);
		return role;
	}

	private static extractEmploymentType(value: string): string | null {
		if (EMPLOYMENT_TYPES.has(value) === true) {
			return value;
		}
		const parts = value.split('·').map((s) => s.trim());
		for (const part of parts) {
			if (EMPLOYMENT_TYPES.has(part) === true) {
				return part;
			}
		}
		return null;
	}

	private static findRoleDescription(entry: AxNode): string | null {
		// Description lives in a StaticText with substantial length, before any "skill chips" link.
		let bestText: string | null = null;
		let bestLength = 0;
		for (const node of A11yTree.walk(entry)) {
			if (node.role !== 'StaticText') {
				continue;
			}
			const text = LinkedinProfileHelper.cleanString(node.name);
			if (text === null) {
				continue;
			}
			if (text.length < 20) {
				continue;
			}
			if (text.length > bestLength) {
				bestText = text;
				bestLength = text.length;
			}
		}
		// Some descriptions live in `paragraph > generic[value]` instead of StaticText.
		if (bestText === null) {
			for (const node of A11yTree.walk(entry)) {
				if (node.role !== 'generic') {
					continue;
				}
				const value = LinkedinProfileHelper.getValue(node);
				if (value === null) {
					continue;
				}
				if (value.length < 20) {
					continue;
				}
				if (value.length > bestLength) {
					bestText = value;
					bestLength = value.length;
				}
			}
		}
		return bestText;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — education
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractEducation(root: AxNode): LinkedinEducation[] {
		const heading = LinkedinProfileHelper.findSectionHeading(root, 'Education');
		if (heading === undefined) {
			return [];
		}
		const body = LinkedinProfileHelper.findSectionBody(heading);
		if (body === undefined) {
			return [];
		}
		const entries: LinkedinEducation[] = [];
		for (const child of body.children) {
			if (child.role !== 'generic') {
				continue;
			}
			const entry = LinkedinProfileHelper.parseEducationEntry(child);
			if (entry === null) {
				continue;
			}
			entries.push(entry);
		}
		return entries;
	}

	private static parseEducationEntry(entry: AxNode): LinkedinEducation | null {
		const logoName = LinkedinProfileHelper.findLogoName(entry);
		const values = LinkedinProfileHelper.collectParagraphValues(entry, { stopAtList: false });
		if (values.length === 0 && logoName === null) {
			return null;
		}
		const result: LinkedinEducation = {
			school: null,
			degree: null,
			dates: null,
		};
		const consumed = new Set<number>();
		// Prefer the logo name as school when available, otherwise take the first paragraph.
		if (logoName !== null) {
			result.school = logoName;
			for (let i = 0; i < values.length; i++) {
				if (values[i] === logoName) {
					consumed.add(i);
					break;
				}
			}
		} else if (values.length > 0) {
			result.school = values[0];
			consumed.add(0);
		}
		// Find dates (e.g. "1984 – 1988").
		for (let i = 0; i < values.length; i++) {
			if (consumed.has(i) === true) {
				continue;
			}
			if (DURATION_REGEXP.test(values[i]) === true) {
				result.dates = values[i];
				consumed.add(i);
				break;
			}
		}
		// Degree is the next remaining paragraph.
		for (let i = 0; i < values.length; i++) {
			if (consumed.has(i) === true) {
				continue;
			}
			result.degree = values[i];
			consumed.add(i);
			break;
		}
		return result;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private — markdown formatting
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static formatRoleLine(role: LinkedinExperienceRole): string {
		const parts: string[] = [];
		const titleParts: string[] = [];
		if (role.role !== null) {
			titleParts.push(role.role);
		}
		if (role.employmentType !== null) {
			titleParts.push(role.employmentType);
		}
		if (titleParts.length > 0) {
			parts.push(titleParts.join(' · '));
		}
		if (role.duration !== null) {
			parts.push(role.duration);
		}
		if (role.location !== null) {
			parts.push(role.location);
		}
		const body = parts.length > 0 ? parts.join(' — ') : '(role)';
		return `- ${body}`;
	}

	private static formatEducationLine(edu: LinkedinEducation): string {
		const parts: string[] = [];
		if (edu.school !== null) {
			parts.push(edu.school);
		}
		if (edu.degree !== null) {
			parts.push(edu.degree);
		}
		if (edu.dates !== null) {
			parts.push(edu.dates);
		}
		const body = parts.length > 0 ? parts.join(' — ') : '(education)';
		return `- ${body}`;
	}
}
