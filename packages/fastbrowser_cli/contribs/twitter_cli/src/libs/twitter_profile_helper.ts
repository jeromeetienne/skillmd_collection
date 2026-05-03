// npm imports
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type TwitterProfile = {
	handle: string;
	displayName: string | null;
	bio: string | null;
	location: string | null;
	website: string | null;
	joinedDate: string | null;
	postsCount: string | null;
	followingCount: string | null;
	followersCount: string | null;
};

export class TwitterProfileHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static parseProfile(rawSnapshot: string, handle: string): TwitterProfile {
		const treeText = TwitterProfileHelper.extractAxTreeText(rawSnapshot);
		const profile: TwitterProfile = {
			handle,
			displayName: null,
			bio: null,
			location: null,
			website: null,
			joinedDate: null,
			postsCount: null,
			followingCount: null,
			followersCount: null,
		};
		if (treeText.length === 0) {
			return profile;
		}
		const root = A11yTree.parse(treeText);
		const escaped = handle.replace(/"/g, '\\"');

		profile.displayName = TwitterProfileHelper.extractDisplayName(root, escaped);
		profile.postsCount = TwitterProfileHelper.stripSuffix(
			TwitterProfileHelper.extractValue(root, 'button[name="Back"] + generic > generic[value]'),
			' posts',
		);
		profile.location = TwitterProfileHelper.extractLocation(root, escaped);
		profile.website = TwitterProfileHelper.extractAttribute(
			root,
			'link[url^="https://t.co/"]',
			'url',
		);
		profile.joinedDate = TwitterProfileHelper.stripPrefix(
			TwitterProfileHelper.extractName(root, `link[url$="/${escaped}/about"]`),
			'Joined ',
		);
		profile.followingCount = TwitterProfileHelper.stripSuffix(
			TwitterProfileHelper.extractName(root, 'link[url$="/following"]'),
			' Following',
		);
		profile.followersCount = TwitterProfileHelper.stripSuffix(
			TwitterProfileHelper.extractName(root, 'link[url$="/verified_followers"]'),
			' Followers',
		);
		profile.bio = TwitterProfileHelper.extractBio(root, escaped);

		return profile;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static formatMarkdown(profile: TwitterProfile): string {
		const headerName = profile.displayName !== null ? profile.displayName : profile.handle;
		const lines: string[] = [];
		lines.push(`${headerName} (@${profile.handle})`);
		lines.push('');
		const fields: { label: string; value: string | null; }[] = [
			{ label: 'Bio', value: profile.bio },
			{ label: 'Location', value: profile.location },
			{ label: 'Website', value: profile.website },
			{ label: 'Joined', value: profile.joinedDate },
			{ label: 'Posts', value: profile.postsCount },
			{ label: 'Following', value: profile.followingCount },
			{ label: 'Followers', value: profile.followersCount },
		];
		for (const field of fields) {
			if (field.value === null) {
				continue;
			}
			lines.push(`  - ${field.label}: ${field.value}`);
		}
		return lines.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
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

	private static extractValue(root: AxNode, selector: string): string | null {
		const node = A11yQuery.querySelector(root, selector);
		if (node === undefined) {
			return null;
		}
		const value = node.attributes['value'];
		if (value === undefined) {
			return null;
		}
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return null;
		}
		return trimmed;
	}

	private static extractName(root: AxNode, selector: string): string | null {
		const node = A11yQuery.querySelector(root, selector);
		if (node === undefined) {
			return null;
		}
		if (node.name === undefined) {
			return null;
		}
		const trimmed = node.name.trim();
		if (trimmed.length === 0) {
			return null;
		}
		return trimmed;
	}

	private static extractDisplayName(root: AxNode, escapedHandle: string): string | null {
		const handleNode = A11yQuery.querySelector(root, `generic[value="@${escapedHandle}"]`);
		if (handleNode === undefined) {
			return null;
		}
		const prev = A11yTree.previousSibling(handleNode);
		if (prev === undefined) {
			return null;
		}
		const value = prev.attributes['value'];
		if (value === undefined) {
			return null;
		}
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return null;
		}
		return trimmed;
	}

	private static extractLocation(root: AxNode, escapedHandle: string): string | null {
		const aboutLink = A11yQuery.querySelector(root, `link[url$="/${escapedHandle}/about"]`);
		if (aboutLink === undefined) {
			return null;
		}
		const parent = aboutLink.parent;
		if (parent === undefined) {
			return null;
		}
		for (const child of parent.children) {
			if (child.role !== 'generic') {
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

	private static extractAttribute(root: AxNode, selector: string, attribute: string): string | null {
		const node = A11yQuery.querySelector(root, selector);
		if (node === undefined) {
			return null;
		}
		const value = node.attributes[attribute];
		if (value === undefined) {
			return null;
		}
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return null;
		}
		return trimmed;
	}

	private static stripPrefix(value: string | null, prefix: string): string | null {
		if (value === null) {
			return null;
		}
		if (value.startsWith(prefix) === true) {
			return value.slice(prefix.length).trim();
		}
		return value;
	}

	private static stripSuffix(value: string | null, suffix: string): string | null {
		if (value === null) {
			return null;
		}
		if (value.endsWith(suffix) === true) {
			return value.slice(0, value.length - suffix.length).trim();
		}
		return value;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Bio extraction — walks up from the about link and scans previous siblings
	//	for the closest text-rich subtree, since the bio has no stable selector.
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractBio(root: AxNode, escapedHandle: string): string | null {
		const aboutLink = A11yQuery.querySelector(root, `link[url$="/${escapedHandle}/about"]`);
		if (aboutLink === undefined) {
			return null;
		}
		let cursor: AxNode | undefined = aboutLink.parent;
		for (let depth = 0; depth < 6; depth++) {
			if (cursor === undefined) {
				break;
			}
			let sibling = A11yTree.previousSibling(cursor);
			while (sibling !== undefined) {
				const text = TwitterProfileHelper.collectSubtreeText(sibling);
				if (text !== null && text.length >= 8) {
					return text;
				}
				sibling = A11yTree.previousSibling(sibling);
			}
			cursor = cursor.parent;
		}
		return null;
	}

	private static collectSubtreeText(node: AxNode): string | null {
		const parts: string[] = [];
		for (const descendant of A11yTree.walk(node)) {
			const value = descendant.attributes['value'];
			if (value !== undefined) {
				const trimmed = value.trim();
				if (trimmed.length > 0) {
					parts.push(trimmed);
					continue;
				}
			}
			if (descendant.name !== undefined) {
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
}
