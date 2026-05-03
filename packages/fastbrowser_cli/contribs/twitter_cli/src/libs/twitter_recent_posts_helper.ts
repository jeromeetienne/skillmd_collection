// npm imports
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type TwitterPostMedia = 'image' | 'video';

export type TwitterPost = {
	url: string | null;
	statusId: string | null;
	authorHandle: string | null;
	authorDisplayName: string | null;
	timestamp: string | null;
	text: string;
	isPinned: boolean;
	isRepost: boolean;
	repostedBy: string | null;
	replyCount: number | null;
	repostCount: number | null;
	likeCount: number | null;
	bookmarkCount: number | null;
	viewCount: number | null;
	hasMedia: boolean;
	mediaTypes: TwitterPostMedia[];
	translatedFrom: string | null;
};

const NOISE_LITERALS = new Set<string>([
	'·',
	'Pinned',
	'Show more',
	'Show original',
	'Made with AI',
	'Verified account',
	'Embedded video',
	'Image',
	'Play Video',
	'reposted',
	'Quote',
	'Translation',
]);

const TIME_LINK_SELECTOR = 'link[url*="/status/"]:has(> time[value])';

export class TwitterRecentPostsHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static parsePosts(rawSnapshot: string, handle: string): TwitterPost[] {
		const treeText = TwitterRecentPostsHelper.extractAxTreeText(rawSnapshot);
		if (treeText.length === 0) {
			return [];
		}
		const root = A11yTree.parse(treeText);
		const timeLinks = A11yQuery.querySelectorAll(root, TIME_LINK_SELECTOR);
		const seen = new Set<string>();
		const posts: TwitterPost[] = [];
		for (const timeLink of timeLinks) {
			const url = timeLink.attributes['url'];
			if (url === undefined) {
				continue;
			}
			if (seen.has(url) === true) {
				continue;
			}
			const container = TwitterRecentPostsHelper.walkUpToPostContainer(timeLink);
			if (container === undefined) {
				continue;
			}
			seen.add(url);
			posts.push(TwitterRecentPostsHelper.extractPost(container, timeLink, handle));
		}
		return posts;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static formatMarkdown(posts: TwitterPost[]): string {
		if (posts.length === 0) {
			return '_no posts found_';
		}
		const sections: string[] = [];
		for (const post of posts) {
			sections.push(TwitterRecentPostsHelper.formatPostMarkdown(post));
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

	private static walkUpToPostContainer(timeLink: AxNode): AxNode | undefined {
		let cursor: AxNode | undefined = timeLink.parent;
		let lastValid: AxNode | undefined = undefined;
		let foundGroup = false;
		for (let depth = 0; depth < 16; depth++) {
			if (cursor === undefined) {
				break;
			}
			const timeLinks = A11yQuery.querySelectorAll(cursor, TIME_LINK_SELECTOR);
			if (timeLinks.length !== 1) {
				break;
			}
			if (foundGroup === false) {
				const groups = A11yQuery.querySelectorAll(cursor, 'group[name]');
				if (groups.length >= 1) {
					foundGroup = true;
				}
			}
			if (foundGroup === true) {
				lastValid = cursor;
			}
			cursor = cursor.parent;
		}
		return lastValid;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Per-post extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractPost(container: AxNode, timeLink: AxNode, viewingHandle: string): TwitterPost {
		const url = timeLink.attributes['url'];
		const parsedUrl = TwitterRecentPostsHelper.parseStatusUrl(url);
		const timestamp = TwitterRecentPostsHelper.extractTimestamp(timeLink);
		const isRepost = A11yQuery.querySelector(container, 'link[name$=" reposted"]') !== undefined;
		const isPinned = A11yQuery.querySelector(container, 'generic[value="Pinned"]') !== undefined;
		const authorHandle = parsedUrl !== null ? parsedUrl.authorHandle : null;
		const authorDisplayName = TwitterRecentPostsHelper.extractAuthorDisplayName(container, authorHandle);
		const translatedFrom = TwitterRecentPostsHelper.extractTranslatedFrom(container);
		const counts = TwitterRecentPostsHelper.extractCounts(container);
		const media = TwitterRecentPostsHelper.extractMedia(container);
		const text = TwitterRecentPostsHelper.extractBodyText(container, {
			authorHandle,
			authorDisplayName,
			timestamp,
		});
		return {
			url: parsedUrl !== null ? parsedUrl.absoluteUrl : null,
			statusId: parsedUrl !== null ? parsedUrl.statusId : null,
			authorHandle,
			authorDisplayName,
			timestamp,
			text,
			isPinned,
			isRepost,
			repostedBy: isRepost === true ? viewingHandle : null,
			replyCount: counts.replyCount,
			repostCount: counts.repostCount,
			likeCount: counts.likeCount,
			bookmarkCount: counts.bookmarkCount,
			viewCount: counts.viewCount,
			hasMedia: media.length > 0,
			mediaTypes: media,
			translatedFrom,
		};
	}

	private static parseStatusUrl(url: string | undefined): {
		absoluteUrl: string;
		authorHandle: string;
		statusId: string;
	} | null {
		if (url === undefined) {
			return null;
		}
		const match = url.match(/^\/([^/]+)\/status\/(\d+)/);
		if (match === null) {
			return null;
		}
		const authorHandle = match[1];
		const statusId = match[2];
		return {
			absoluteUrl: `https://x.com/${authorHandle}/status/${statusId}`,
			authorHandle,
			statusId,
		};
	}

	private static extractTimestamp(timeLink: AxNode): string | null {
		for (const child of timeLink.children) {
			if (child.role !== 'time') {
				continue;
			}
			const value = child.attributes['value'];
			if (value === undefined) {
				continue;
			}
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				continue;
			}
			return trimmed;
		}
		return null;
	}

	private static extractAuthorDisplayName(container: AxNode, authorHandle: string | null): string | null {
		if (authorHandle === null) {
			return null;
		}
		const escaped = authorHandle.replace(/"/g, '\\"');
		const handleNode = A11yQuery.querySelector(container, `generic[value="@${escaped}"]`);
		if (handleNode === undefined) {
			return null;
		}
		const handleValue = `@${authorHandle}`;
		let cursor: AxNode | undefined = handleNode;
		for (let depth = 0; depth < 6; depth++) {
			if (cursor === undefined) {
				break;
			}
			const prev = A11yTree.previousSibling(cursor);
			if (prev !== undefined) {
				const found = TwitterRecentPostsHelper.findFirstValue(prev, handleValue);
				if (found !== null) {
					return found;
				}
			}
			cursor = cursor.parent;
		}
		return null;
	}

	private static findFirstValue(node: AxNode, exclude: string): string | null {
		for (const descendant of A11yTree.walk(node)) {
			const value = descendant.attributes['value'];
			if (value !== undefined) {
				const trimmed = value.trim();
				if (trimmed.length > 0 && trimmed !== exclude && trimmed !== 'Verified account') {
					return trimmed;
				}
			}
			if (descendant.role === 'StaticText' && descendant.name !== undefined) {
				const trimmed = descendant.name.trim();
				if (trimmed.length > 0 && trimmed !== exclude && trimmed !== 'Verified account') {
					return trimmed;
				}
			}
		}
		return null;
	}

	private static extractTranslatedFrom(container: AxNode): string | null {
		const node = A11yQuery.querySelector(container, 'generic[value^="Translated from "]');
		if (node === undefined) {
			return null;
		}
		const value = node.attributes['value'];
		if (value === undefined) {
			return null;
		}
		return value.slice('Translated from '.length).trim();
	}

	private static extractMedia(container: AxNode): TwitterPostMedia[] {
		const media: TwitterPostMedia[] = [];
		const hasImage = A11yQuery.querySelector(container, 'link[url*="/photo/"]') !== undefined
			|| A11yQuery.querySelector(container, 'generic[name="Image"]') !== undefined;
		if (hasImage === true) {
			media.push('image');
		}
		const hasVideo = A11yQuery.querySelector(container, 'generic[name="Embedded video"]') !== undefined
			|| A11yQuery.querySelector(container, 'button[name="Play Video"]') !== undefined;
		if (hasVideo === true) {
			media.push('video');
		}
		return media;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Counts
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractCounts(container: AxNode): {
		replyCount: number | null;
		repostCount: number | null;
		likeCount: number | null;
		bookmarkCount: number | null;
		viewCount: number | null;
	} {
		const counts: {
			replyCount: number | null;
			repostCount: number | null;
			likeCount: number | null;
			bookmarkCount: number | null;
			viewCount: number | null;
		} = {
			replyCount: null,
			repostCount: null,
			likeCount: null,
			bookmarkCount: null,
			viewCount: null,
		};
		const group = A11yQuery.querySelector(container, 'group[name]');
		if (group !== undefined && group.name !== undefined) {
			const summary = group.name;
			counts.replyCount = TwitterRecentPostsHelper.matchCount(summary, /(\d+(?:[.,]\d+)?)\s+repl(?:y|ies)/i);
			counts.repostCount = TwitterRecentPostsHelper.matchCount(summary, /(\d+(?:[.,]\d+)?)\s+repost/i);
			counts.likeCount = TwitterRecentPostsHelper.matchCount(summary, /(\d+(?:[.,]\d+)?)\s+like/i);
			counts.bookmarkCount = TwitterRecentPostsHelper.matchCount(summary, /(\d+(?:[.,]\d+)?)\s+bookmark/i);
			counts.viewCount = TwitterRecentPostsHelper.matchCount(summary, /(\d+(?:[.,]\d+)?)\s+view/i);
		}
		if (counts.replyCount === null) {
			counts.replyCount = TwitterRecentPostsHelper.fallbackCount(
				container,
				'button:has(> generic[value]):is([name$="Replies. Reply"], [name$="Reply. Reply"])',
			);
		}
		if (counts.repostCount === null) {
			counts.repostCount = TwitterRecentPostsHelper.fallbackCount(
				container,
				'button:has(> generic[value]):is([name$=" reposts. Repost"], [name$=" reposts. Reposted"], [name$=" repost. Repost"], [name$=" repost. Reposted"])',
			);
		}
		if (counts.likeCount === null) {
			counts.likeCount = TwitterRecentPostsHelper.fallbackCount(
				container,
				'button:has(> generic[value]):is([name$=" Likes. Like"], [name$=" Likes. Liked"], [name$=" Like. Like"], [name$=" Like. Liked"])',
			);
		}
		if (counts.viewCount === null) {
			counts.viewCount = TwitterRecentPostsHelper.fallbackCount(
				container,
				'link:has(> generic[value])[name$="View post analytics"]',
			);
		}
		return counts;
	}

	private static matchCount(summary: string, regex: RegExp): number | null {
		const match = summary.match(regex);
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

	private static fallbackCount(container: AxNode, selector: string): number | null {
		const button = A11yQuery.querySelector(container, selector);
		if (button === undefined) {
			return null;
		}
		const valueNode = A11yQuery.querySelector(button, 'generic[value]');
		if (valueNode === undefined) {
			return null;
		}
		const raw = valueNode.attributes['value'];
		if (raw === undefined) {
			return null;
		}
		return TwitterRecentPostsHelper.parseShortNumber(raw);
	}

	private static parseShortNumber(s: string): number | null {
		const trimmed = s.trim();
		if (trimmed.length === 0) {
			return null;
		}
		const match = trimmed.match(/^(\d+(?:[.,]\d+)?)([KMB])?$/i);
		if (match === null) {
			return null;
		}
		const base = parseFloat(match[1].replace(',', '.'));
		if (Number.isNaN(base) === true) {
			return null;
		}
		if (match[2] === undefined) {
			return Math.round(base);
		}
		const suffix = match[2].toUpperCase();
		if (suffix === 'K') {
			return Math.round(base * 1_000);
		}
		if (suffix === 'M') {
			return Math.round(base * 1_000_000);
		}
		if (suffix === 'B') {
			return Math.round(base * 1_000_000_000);
		}
		return null;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Body text extraction
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractBodyText(container: AxNode, header: {
		authorHandle: string | null;
		authorDisplayName: string | null;
		timestamp: string | null;
	}): string {
		const skipUids = TwitterRecentPostsHelper.collectSkipUids(container);
		const noise = new Set<string>(NOISE_LITERALS);
		if (header.authorHandle !== null) {
			noise.add(`@${header.authorHandle}`);
		}
		if (header.authorDisplayName !== null) {
			noise.add(header.authorDisplayName);
		}
		if (header.timestamp !== null) {
			noise.add(header.timestamp);
		}
		const fragments: string[] = [];
		for (const node of A11yTree.walk(container)) {
			if (skipUids.has(node.uid) === true) {
				continue;
			}
			const fragment = TwitterRecentPostsHelper.fragmentForNode(node);
			if (fragment === null) {
				continue;
			}
			if (noise.has(fragment) === true) {
				continue;
			}
			if (fragment.startsWith('Translated from ') === true) {
				continue;
			}
			fragments.push(fragment);
		}
		const deduped: string[] = [];
		for (const fragment of fragments) {
			if (deduped.length > 0 && deduped[deduped.length - 1] === fragment) {
				continue;
			}
			deduped.push(fragment);
		}
		const joined = deduped.join(' ').replace(/\s+/g, ' ').trim();
		return joined;
	}

	private static collectSkipUids(container: AxNode): Set<string> {
		const skipRoots: AxNode[] = [];
		for (const node of A11yTree.walk(container)) {
			if (node.role === 'button') {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'group' && node.name !== undefined) {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'link' && node.name !== undefined && node.name.endsWith(' reposted') === true) {
				skipRoots.push(node);
				continue;
			}
			if (node.role === 'generic' && node.attributes['value'] === 'Quote' && node.parent !== undefined) {
				skipRoots.push(node.parent);
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
			return trimmed;
		}
		if (node.role === 'link' && node.name !== undefined) {
			const trimmed = node.name.trim();
			if (trimmed.length === 0) {
				return null;
			}
			if (TwitterRecentPostsHelper.linkHasTextChild(node) === true) {
				return null;
			}
			const url = node.attributes['url'];
			if (trimmed.startsWith('@') === true || trimmed.startsWith('#') === true) {
				return trimmed;
			}
			if (url !== undefined && (url.startsWith('https://t.co/') === true || url.startsWith('http://') === true || url.startsWith('https://') === true)) {
				return trimmed;
			}
		}
		return null;
	}

	private static linkHasTextChild(linkNode: AxNode): boolean {
		for (const descendant of A11yTree.walk(linkNode)) {
			if (descendant.uid === linkNode.uid) {
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

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Markdown rendering
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static formatPostMarkdown(post: TwitterPost): string {
		const headerName = post.authorDisplayName !== null ? post.authorDisplayName : (post.authorHandle !== null ? post.authorHandle : 'unknown');
		const handleSuffix = post.authorHandle !== null ? ` (@${post.authorHandle})` : '';
		const headerParts: string[] = [`${headerName}${handleSuffix}`];
		if (post.timestamp !== null) {
			headerParts.push(post.timestamp);
		}
		if (post.isPinned === true) {
			headerParts.push('pinned');
		}
		if (post.isRepost === true && post.repostedBy !== null) {
			headerParts.push(`reposted by @${post.repostedBy}`);
		}
		if (post.translatedFrom !== null) {
			headerParts.push(`translated from ${post.translatedFrom}`);
		}
		const lines: string[] = [];
		lines.push(`## ${headerParts.join(' · ')}`);
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
		if (post.replyCount !== null) {
			countParts.push(`replies: ${post.replyCount}`);
		}
		if (post.repostCount !== null) {
			countParts.push(`reposts: ${post.repostCount}`);
		}
		if (post.likeCount !== null) {
			countParts.push(`likes: ${post.likeCount}`);
		}
		if (post.bookmarkCount !== null) {
			countParts.push(`bookmarks: ${post.bookmarkCount}`);
		}
		if (post.viewCount !== null) {
			countParts.push(`views: ${post.viewCount}`);
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
