// npm imports
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type LinkedinPostMedia = 'image' | 'video' | 'article' | 'document';

export type LinkedinPost = {
	url: string | null;
	activityId: string | null;
	authorSlug: string | null;
	authorDisplayName: string | null;
	authorHeadline: string | null;
	timestamp: string | null;
	isEdited: boolean;
	text: string;
	isRepost: boolean;
	repostedBy: string | null;
	reactionCount: number | null;
	commentCount: number | null;
	repostCount: number | null;
	impressionCount: number | null;
	hasMedia: boolean;
	mediaTypes: LinkedinPostMedia[];
};

const TIMESTAMP_SHORT_REGEXP = /^(\d+[smhdw]|\d+\s+(?:second|minute|hour|day|week|month|year)s?)\s*•/i;
const TIMESTAMP_LONG_REGEXP = /^\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago\b/i;
const ACTIVITY_ID_REGEXP = /urn:li:activity:(\d+)/;
const COUNT_LEADING_REGEXP = /^(\d+(?:[.,]\d+)?)/;
const ANALYTICS_LINK_NAME_REGEXP = /^(\d+(?:[.,]\d+)?)\s+impressions/i;

const NOISE_LITERALS = new Set<string>([
	'·',
	'•',
	'Like',
	'Comment',
	'Repost',
	'Send',
	'Boost',
	'Follow',
	'hashtag',
	'Activate to view larger image,',
	'See content credentials',
	'…more',
	'…',
	'Show translation',
	'reposted this',
	'• You',
	'• 1st',
	'• 2nd',
	'• 3rd',
	'• 3rd+',
	'Verified',
	'Premium',
	'graphical user interface',
	'graphical user interface, application',
	'No alternative text description for this image',
]);

const NOISE_PREFIXES = [
	'Promote this post to reach people',
	'Activate to view larger image',
	'Verified •',
	'Premium •',
	'• ',
	'Visible to anyone',
	'Translated from ',
	'This post is not eligible',
	'Open control menu',
	'View ',
	'Loaded ',
];

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class LinkedinRecentPostsHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static parsePosts(rawSnapshot: string, viewingSlug: string): LinkedinPost[] {
		const treeText = LinkedinRecentPostsHelper.extractAxTreeText(rawSnapshot);
		if (treeText.length === 0) {
			return [];
		}
		const root = A11yTree.parse(treeText);
		const headings = A11yQuery.querySelectorAll(root, 'heading[level="2"]');
		const seen = new Set<string>();
		const posts: LinkedinPost[] = [];
		for (const heading of headings) {
			if (heading.name === undefined) {
				continue;
			}
			if (heading.name.startsWith('Feed post number ') === false) {
				continue;
			}
			const container = LinkedinRecentPostsHelper.walkUpToPostContainer(heading);
			if (container === undefined) {
				continue;
			}
			if (seen.has(container.uid) === true) {
				continue;
			}
			seen.add(container.uid);
			posts.push(LinkedinRecentPostsHelper.extractPost(container, heading, viewingSlug));
		}
		return posts;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static formatMarkdown(posts: LinkedinPost[]): string {
		if (posts.length === 0) {
			return '_no posts found_';
		}
		const sections: string[] = [];
		for (const post of posts) {
			sections.push(LinkedinRecentPostsHelper.formatPostMarkdown(post));
		}
		return sections.join('\n\n---\n\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Tree filtering / post container walk
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

	private static walkUpToPostContainer(heading: AxNode): AxNode | undefined {
		let cursor: AxNode | undefined = heading.parent;
		for (let depth = 0; depth < 16; depth++) {
			if (cursor === undefined) {
				break;
			}
			if (cursor.role === 'listitem') {
				return cursor;
			}
			cursor = cursor.parent;
		}
		return undefined;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Per-post extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractPost(container: AxNode, heading: AxNode, viewingSlug: string): LinkedinPost {
		const repost = LinkedinRecentPostsHelper.detectRepost(container);
		const author = LinkedinRecentPostsHelper.extractAuthor(container);
		const timestamp = LinkedinRecentPostsHelper.extractTimestamp(container);
		const activity = LinkedinRecentPostsHelper.extractActivity(container);
		const counts = LinkedinRecentPostsHelper.extractCounts(container);
		const mediaTypes = LinkedinRecentPostsHelper.extractMedia(container);
		const text = LinkedinRecentPostsHelper.extractBodyText(container, heading, {
			authorDisplayName: author.displayName,
			authorHeadline: author.headline,
		});
		return {
			url: activity !== null ? activity.url : null,
			activityId: activity !== null ? activity.activityId : null,
			authorSlug: author.slug,
			authorDisplayName: author.displayName,
			authorHeadline: author.headline,
			timestamp: timestamp.timestamp,
			isEdited: timestamp.isEdited,
			text,
			isRepost: repost.isRepost,
			repostedBy: repost.isRepost === true ? (repost.repostedBy ?? viewingSlug) : null,
			reactionCount: counts.reactionCount,
			commentCount: counts.commentCount,
			repostCount: counts.repostCount,
			impressionCount: counts.impressionCount,
			hasMedia: mediaTypes.length > 0,
			mediaTypes,
		};
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Repost detection
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static detectRepost(container: AxNode): { isRepost: boolean; repostedBy: string | null; } {
		const repostedNode = LinkedinRecentPostsHelper.findRepostedThis(container);
		if (repostedNode === undefined) {
			return { isRepost: false, repostedBy: null };
		}
		let repostedBy: string | null = null;
		let cursor: AxNode | undefined = repostedNode.parent;
		for (let depth = 0; depth < 4; depth++) {
			if (cursor === undefined) {
				break;
			}
			const link = A11yQuery.querySelector(cursor, 'link[url^="/in/"]');
			if (link !== undefined) {
				const url = link.attributes['url'];
				if (url !== undefined) {
					repostedBy = LinkedinRecentPostsHelper.slugFromInUrl(url);
				}
				break;
			}
			cursor = cursor.parent;
		}
		return { isRepost: true, repostedBy };
	}

	private static findRepostedThis(container: AxNode): AxNode | undefined {
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'StaticText') {
				continue;
			}
			if (node.name === undefined) {
				continue;
			}
			if (node.name.trim() === 'reposted this') {
				return node;
			}
		}
		return undefined;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Author extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractAuthor(container: AxNode): {
		slug: string | null;
		displayName: string | null;
		headline: string | null;
	} {
		const authorLink = LinkedinRecentPostsHelper.findAuthorLink(container);
		if (authorLink === undefined) {
			return { slug: null, displayName: null, headline: null };
		}
		const url = authorLink.attributes['url'];
		const slug = url !== undefined ? LinkedinRecentPostsHelper.slugFromMiniProfileUrl(url) : null;
		const headerScope = LinkedinRecentPostsHelper.findAuthorHeaderScope(authorLink);
		const values = LinkedinRecentPostsHelper.collectGenericValues(headerScope);
		const dedup = LinkedinRecentPostsHelper.dedupeAdjacent(values);
		const filtered = LinkedinRecentPostsHelper.filterAuthorValues(dedup);
		const displayName = filtered.length >= 1 ? filtered[0] : null;
		const headline = filtered.length >= 2 ? filtered[1] : null;
		return { slug, displayName, headline };
	}

	private static findAuthorLink(container: AxNode): AxNode | undefined {
		const links = A11yQuery.querySelectorAll(container, 'link[url*="miniProfileUrn"]');
		for (const link of links) {
			const name = link.name;
			if (name === undefined) {
				continue;
			}
			if (name.startsWith('View ') === true && name.endsWith('graphic link') === true) {
				return link;
			}
		}
		if (links.length > 0) {
			return links[0];
		}
		return undefined;
	}

	private static findAuthorHeaderScope(authorLink: AxNode): AxNode {
		// The author's display name, connection indicator, headline, and timestamp all
		// live in a sibling generic of the profile link. Walk up two levels — the
		// profile link is wrapped twice — to land on the generic that contains all of them.
		let cursor: AxNode | undefined = authorLink.parent;
		for (let depth = 0; depth < 3; depth++) {
			if (cursor === undefined) {
				break;
			}
			cursor = cursor.parent;
		}
		return cursor ?? authorLink;
	}

	private static collectGenericValues(node: AxNode): string[] {
		const out: string[] = [];
		for (const descendant of A11yTree.walk(node)) {
			if (descendant.role !== 'generic') {
				continue;
			}
			const value = descendant.attributes['value'];
			if (value === undefined) {
				continue;
			}
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				continue;
			}
			out.push(trimmed);
		}
		return out;
	}

	private static dedupeAdjacent(values: string[]): string[] {
		const out: string[] = [];
		for (const value of values) {
			if (out.length > 0 && out[out.length - 1] === value) {
				continue;
			}
			out.push(value);
		}
		return out;
	}

	private static filterAuthorValues(values: string[]): string[] {
		const out: string[] = [];
		for (const value of values) {
			if (LinkedinRecentPostsHelper.isAuthorNoiseValue(value) === true) {
				continue;
			}
			out.push(value);
		}
		return out;
	}

	private static isAuthorNoiseValue(value: string): boolean {
		if (value.startsWith('•') === true) {
			return true;
		}
		if (value.startsWith('Verified •') === true) {
			return true;
		}
		if (value.startsWith('Premium •') === true) {
			return true;
		}
		if (TIMESTAMP_SHORT_REGEXP.test(value) === true) {
			return true;
		}
		if (TIMESTAMP_LONG_REGEXP.test(value) === true) {
			return true;
		}
		if (value === 'Visit my website') {
			return true;
		}
		if (value === 'Follow') {
			return true;
		}
		if (value === 'You') {
			return true;
		}
		if (/^\d+\s+followers$/.test(value) === true) {
			return true;
		}
		// Connection-degree indicators: "1st", "2nd", "3rd", "3rd+".
		if (/^\d+(st|nd|rd|th)\+?$/.test(value) === true) {
			return true;
		}
		return false;
	}

	private static slugFromMiniProfileUrl(url: string): string | null {
		const match = url.match(/\/in\/([^/?#]+)/);
		if (match === null) {
			return null;
		}
		return match[1];
	}

	private static slugFromInUrl(url: string): string | null {
		const match = url.match(/^\/in\/([^/?#]+)/);
		if (match === null) {
			return null;
		}
		return match[1];
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Timestamp extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractTimestamp(container: AxNode): { timestamp: string | null; isEdited: boolean; } {
		// Prefer the short StaticText (e.g. "1d •" / "12h • Edited •"); fall back to
		// the long generic value (e.g. "1 day ago • Visible to anyone…").
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'StaticText') {
				continue;
			}
			if (node.name === undefined) {
				continue;
			}
			const trimmed = node.name.trim();
			if (TIMESTAMP_SHORT_REGEXP.test(trimmed) === false) {
				continue;
			}
			return LinkedinRecentPostsHelper.normalizeTimestamp(trimmed);
		}
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'generic') {
				continue;
			}
			const value = node.attributes['value'];
			if (value === undefined) {
				continue;
			}
			const trimmed = value.trim();
			if (TIMESTAMP_LONG_REGEXP.test(trimmed) === false) {
				continue;
			}
			return LinkedinRecentPostsHelper.normalizeTimestamp(trimmed);
		}
		return { timestamp: null, isEdited: false };
	}

	private static normalizeTimestamp(raw: string): { timestamp: string; isEdited: boolean; } {
		const isEdited = /\bEdited\b/.test(raw);
		// Drop the trailing " • Edited • Visible…" segment — keep just the time portion.
		const segments = raw.split('•').map((s) => s.trim()).filter((s) => s.length > 0);
		let timestamp = segments.length > 0 ? segments[0] : raw.trim();
		// If long form ("1 day ago"), keep as-is. If short form ("1d"), keep as-is.
		timestamp = timestamp.replace(/\s+/g, ' ').trim();
		return { timestamp, isEdited };
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Activity URL / id extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractActivity(container: AxNode): { activityId: string; url: string; } | null {
		const analyticsLink = A11yQuery.querySelector(
			container,
			'link[url^="/analytics/post-summary/urn:li:activity:"]',
		);
		if (analyticsLink !== undefined) {
			const result = LinkedinRecentPostsHelper.activityFromUrl(analyticsLink.attributes['url']);
			if (result !== null) {
				return result;
			}
		}
		const updateLinks = A11yQuery.querySelectorAll(container, 'link[url^="/feed/update/urn:li:activity:"]');
		for (const link of updateLinks) {
			const result = LinkedinRecentPostsHelper.activityFromUrl(link.attributes['url']);
			if (result !== null) {
				return result;
			}
		}
		return null;
	}

	private static activityFromUrl(url: string | undefined): { activityId: string; url: string; } | null {
		if (url === undefined) {
			return null;
		}
		const match = url.match(ACTIVITY_ID_REGEXP);
		if (match === null) {
			return null;
		}
		const activityId = match[1];
		return {
			activityId,
			url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
		};
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Counts
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractCounts(container: AxNode): {
		reactionCount: number | null;
		commentCount: number | null;
		repostCount: number | null;
		impressionCount: number | null;
	} {
		return {
			reactionCount: LinkedinRecentPostsHelper.extractReactionCount(container),
			commentCount: LinkedinRecentPostsHelper.extractCommentCount(container),
			repostCount: LinkedinRecentPostsHelper.extractRepostCount(container),
			impressionCount: LinkedinRecentPostsHelper.extractImpressionCount(container),
		};
	}

	private static extractReactionCount(container: AxNode): number | null {
		// The reactions list is `list > listitem > button` where the count lives in a
		// nested `generic[value]` matching /^\d+$/ (e.g. button > generic > generic[value="4"]).
		// Pick the first one. The button's name (e.g. "1 reaction" or "Julien and 3 others")
		// is also a fallback when the value isn't present.
		const buttons = A11yQuery.querySelectorAll(container, 'list > listitem > button');
		for (const button of buttons) {
			for (const descendant of A11yTree.walk(button)) {
				if (descendant.uid === button.uid) {
					continue;
				}
				if (descendant.role !== 'generic') {
					continue;
				}
				const value = descendant.attributes['value'];
				if (value === undefined) {
					continue;
				}
				const trimmed = value.trim();
				if (/^\d+$/.test(trimmed) === false) {
					continue;
				}
				const parsed = parseInt(trimmed, 10);
				if (Number.isNaN(parsed) === true) {
					continue;
				}
				return parsed;
			}
			if (button.name !== undefined) {
				const match = button.name.match(/^(\d+)\s+reactions?$/i);
				if (match !== null) {
					const parsed = parseInt(match[1], 10);
					if (Number.isNaN(parsed) === false) {
						return parsed;
					}
				}
			}
		}
		return null;
	}

	private static extractCommentCount(container: AxNode): number | null {
		return LinkedinRecentPostsHelper.findLeadingCount(container, /\bcomments?\s+on\b/i);
	}

	private static extractRepostCount(container: AxNode): number | null {
		return LinkedinRecentPostsHelper.findLeadingCount(container, /\breposts?\s+of\b/i);
	}

	private static findLeadingCount(container: AxNode, namePattern: RegExp): number | null {
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'button') {
				continue;
			}
			if (node.name === undefined) {
				continue;
			}
			if (namePattern.test(node.name) === false) {
				continue;
			}
			const match = node.name.match(COUNT_LEADING_REGEXP);
			if (match === null) {
				continue;
			}
			const cleaned = match[1].replace(/[.,]/g, '');
			const parsed = parseInt(cleaned, 10);
			if (Number.isNaN(parsed) === true) {
				continue;
			}
			return parsed;
		}
		return null;
	}

	private static extractImpressionCount(container: AxNode): number | null {
		const link = A11yQuery.querySelector(container, 'link[url^="/analytics/post-summary/urn:li:activity:"]');
		if (link === undefined) {
			return null;
		}
		if (link.name === undefined) {
			return null;
		}
		const match = link.name.match(ANALYTICS_LINK_NAME_REGEXP);
		if (match === null) {
			return null;
		}
		const cleaned = match[1].replace(/[.,]/g, '');
		const parsed = parseInt(cleaned, 10);
		if (Number.isNaN(parsed) === true) {
			return null;
		}
		return parsed;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Media detection
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractMedia(container: AxNode): LinkedinPostMedia[] {
		const media: LinkedinPostMedia[] = [];
		const hasImage = A11yQuery.querySelector(container, 'button[name^="Activate to view larger image"]') !== undefined;
		if (hasImage === true) {
			media.push('image');
		}
		const hasDocument = LinkedinRecentPostsHelper.detectDocumentCarousel(container);
		if (hasDocument === true) {
			media.push('document');
		}
		const hasVideo = LinkedinRecentPostsHelper.detectVideo(container);
		if (hasVideo === true) {
			media.push('video');
		}
		const hasArticle = LinkedinRecentPostsHelper.detectArticleShare(container);
		if (hasArticle === true) {
			media.push('article');
		}
		return media;
	}

	private static detectDocumentCarousel(container: AxNode): boolean {
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'iframe') {
				continue;
			}
			const progress = A11yQuery.querySelector(node, 'progressbar');
			if (progress !== undefined) {
				return true;
			}
		}
		return false;
	}

	private static detectVideo(container: AxNode): boolean {
		for (const node of A11yTree.walk(container)) {
			if (node.role !== 'button') {
				continue;
			}
			if (node.name === undefined) {
				continue;
			}
			if (/play\s+video/i.test(node.name) === true) {
				return true;
			}
		}
		return false;
	}

	private static detectArticleShare(container: AxNode): boolean {
		// LinkedIn renders article previews two ways:
		//   (a) a nested `article` element (long-form post / pulse article)
		//   (b) an outbound `link[url^="http"]` paired with a sibling `generic[value]`
		//       containing the publisher domain (newsletter / blog share)
		const outerArticle = A11yQuery.querySelector(container, 'article');
		const articles = A11yQuery.querySelectorAll(container, 'article');
		for (const article of articles) {
			if (outerArticle !== undefined && article.uid === outerArticle.uid) {
				continue;
			}
			return true;
		}
		const links = A11yQuery.querySelectorAll(container, 'link');
		for (const link of links) {
			const url = link.attributes['url'];
			if (url === undefined) {
				continue;
			}
			if (url.startsWith('http://') === false && url.startsWith('https://') === false) {
				continue;
			}
			if (LinkedinRecentPostsHelper.isInternalUrl(url) === true) {
				continue;
			}
			if (LinkedinRecentPostsHelper.linkLooksLikeShareCard(link) === true) {
				return true;
			}
		}
		return false;
	}

	private static isInternalUrl(url: string): boolean {
		if (url.startsWith('https://www.linkedin.com/') === true) {
			return true;
		}
		if (url.startsWith('https://lnkd.in/') === true) {
			return true;
		}
		return false;
	}

	private static linkLooksLikeShareCard(link: AxNode): boolean {
		for (const child of link.children) {
			if (child.role !== 'generic') {
				continue;
			}
			for (const grand of child.children) {
				if (grand.role !== 'generic') {
					continue;
				}
				const value = grand.attributes['value'];
				if (value === undefined) {
					continue;
				}
				if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value.trim()) === true) {
					return true;
				}
			}
		}
		return false;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Body text extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractBodyText(
		container: AxNode,
		heading: AxNode,
		header: { authorDisplayName: string | null; authorHeadline: string | null; },
	): string {
		const skipUids = LinkedinRecentPostsHelper.collectBodySkipUids(container, heading);
		const noise = new Set<string>(NOISE_LITERALS);
		if (header.authorDisplayName !== null) {
			noise.add(header.authorDisplayName);
		}
		if (header.authorHeadline !== null) {
			noise.add(header.authorHeadline);
		}
		const fragments: string[] = [];
		for (const node of A11yTree.walk(container)) {
			if (skipUids.has(node.uid) === true) {
				continue;
			}
			const fragment = LinkedinRecentPostsHelper.fragmentForNode(node);
			if (fragment === null) {
				continue;
			}
			if (noise.has(fragment) === true) {
				continue;
			}
			if (LinkedinRecentPostsHelper.matchesNoisePrefix(fragment) === true) {
				continue;
			}
			fragments.push(fragment);
		}
		const deduped = LinkedinRecentPostsHelper.dedupeAdjacent(fragments);
		return deduped.join(' ').replace(/\s+/g, ' ').trim();
	}

	private static collectBodySkipUids(container: AxNode, heading: AxNode): Set<string> {
		const skipRoots: AxNode[] = [];
		// Skip the heading subtree itself.
		skipRoots.push(heading);
		// Skip the author header block — it's the second child of the heading's parent.
		const headingParent = heading.parent;
		if (headingParent !== undefined) {
			const headingIdx = headingParent.children.indexOf(heading);
			if (headingIdx !== -1) {
				const next = headingParent.children[headingIdx + 1];
				if (next !== undefined && next.children.length > 0) {
					const headerBlock = next.children[0];
					skipRoots.push(headerBlock);
				}
			}
		}
		// Repost banner — the StaticText "reposted this" sits in a generic that
		// includes the page-owner's profile link. Skip the surrounding generic so the
		// link name doesn't leak into the body text.
		const repostedNode = LinkedinRecentPostsHelper.findRepostedThis(container);
		if (repostedNode !== undefined) {
			let cursor: AxNode | undefined = repostedNode.parent;
			for (let depth = 0; depth < 3; depth++) {
				if (cursor === undefined) {
					break;
				}
				const ownerLink = A11yQuery.querySelector(cursor, 'link[url^="/in/"]');
				const photoLink = A11yQuery.querySelector(cursor, 'link[url*="miniProfileUrn"]');
				if (ownerLink !== undefined && photoLink !== undefined) {
					skipRoots.push(cursor);
					break;
				}
				cursor = cursor.parent;
			}
		}
		// Skip subtrees rooted at any button, list, iframe, or nested article.
		const outerArticle = A11yQuery.querySelector(container, 'article');
		for (const node of A11yTree.walk(container)) {
			if (node.role === 'button') {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'list') {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'iframe') {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'alert') {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'article' && outerArticle !== undefined && node.uid !== outerArticle.uid) {
				skipRoots.push(node);
				continue;
			}
			// Profile graphic-link inside the post body (author header was already
			// skipped, but inline mentions like `link "Benoit Raphael" url="/in/.../"`
			// should be kept — so don't skip those).
			if (node.role === 'link' && node.attributes['url'] !== undefined) {
				const url = node.attributes['url'];
				if (url.startsWith('/analytics/post-summary/') === true) {
					skipRoots.push(node);
					continue;
				}
			}
		}
		const skipUids = new Set<string>();
		for (const root of skipRoots) {
			for (const descendant of A11yTree.walk(root)) {
				skipUids.add(descendant.uid);
			}
		}
		return skipUids;
	}

	private static fragmentForNode(node: AxNode): string | null {
		if (node.role === 'StaticText' && node.name !== undefined) {
			const trimmed = node.name.trim();
			if (trimmed.length === 0) {
				return null;
			}
			return trimmed;
		}
		const value = node.attributes['value'];
		if (value !== undefined) {
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				return null;
			}
			// Hashtag links wrap a generic value="hashtag" + generic value="#X" — keep
			// only the # variant.
			if (trimmed === 'hashtag') {
				return null;
			}
			return trimmed;
		}
		if (node.role === 'link' && node.name !== undefined) {
			const trimmed = node.name.trim();
			if (trimmed.length === 0) {
				return null;
			}
			// If the link wraps a hashtag (its first descendant is generic value="hashtag"),
			// rely on the inner generic value="#X" instead — return null here.
			if (LinkedinRecentPostsHelper.linkIsHashtag(node) === true) {
				return null;
			}
			// If the link has any text descendants (StaticText / generic[value]), they will
			// emit their own fragments — skip the link's own name to avoid duplicates.
			if (LinkedinRecentPostsHelper.linkHasTextDescendant(node) === true) {
				return null;
			}
			return trimmed;
		}
		return null;
	}

	private static linkIsHashtag(link: AxNode): boolean {
		for (const child of link.children) {
			if (child.role !== 'generic') {
				continue;
			}
			const value = child.attributes['value'];
			if (value === undefined) {
				continue;
			}
			if (value.trim() === 'hashtag') {
				return true;
			}
		}
		return false;
	}

	private static linkHasTextDescendant(link: AxNode): boolean {
		for (const descendant of A11yTree.walk(link)) {
			if (descendant.uid === link.uid) {
				continue;
			}
			if (descendant.role === 'StaticText' && descendant.name !== undefined && descendant.name.trim().length > 0) {
				return true;
			}
			const value = descendant.attributes['value'];
			if (value !== undefined && value.trim().length > 0) {
				return true;
			}
		}
		return false;
	}

	private static matchesNoisePrefix(fragment: string): boolean {
		for (const prefix of NOISE_PREFIXES) {
			if (fragment.startsWith(prefix) === true) {
				return true;
			}
		}
		return false;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Markdown rendering
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static formatPostMarkdown(post: LinkedinPost): string {
		const headerName = post.authorDisplayName !== null
			? post.authorDisplayName
			: (post.authorSlug !== null ? post.authorSlug : 'unknown');
		const slugSuffix = post.authorSlug !== null ? ` (${post.authorSlug})` : '';
		const headerParts: string[] = [`${headerName}${slugSuffix}`];
		if (post.timestamp !== null) {
			headerParts.push(post.timestamp);
		}
		if (post.isEdited === true) {
			headerParts.push('edited');
		}
		if (post.isRepost === true && post.repostedBy !== null) {
			headerParts.push(`reposted by ${post.repostedBy}`);
		}
		const lines: string[] = [];
		lines.push(`## ${headerParts.join(' · ')}`);
		if (post.authorHeadline !== null) {
			lines.push(`_${post.authorHeadline}_`);
		}
		lines.push('');
		if (post.text.length === 0) {
			lines.push('_(no text)_');
		} else {
			lines.push(post.text);
		}
		if (post.mediaTypes.length > 0) {
			lines.push('');
			lines.push(`media: ${post.mediaTypes.join(', ')}`);
		}
		const countParts: string[] = [];
		if (post.reactionCount !== null) {
			countParts.push(`reactions: ${post.reactionCount}`);
		}
		if (post.commentCount !== null) {
			countParts.push(`comments: ${post.commentCount}`);
		}
		if (post.repostCount !== null) {
			countParts.push(`reposts: ${post.repostCount}`);
		}
		if (post.impressionCount !== null) {
			countParts.push(`impressions: ${post.impressionCount}`);
		}
		if (countParts.length > 0) {
			lines.push('');
			lines.push(countParts.join(' · '));
		}
		if (post.url !== null) {
			lines.push('');
			lines.push(post.url);
		}
		return lines.join('\n');
	}
}
