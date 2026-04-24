// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { BlueskyPost, BlueskyProfile } from '../../types';
import { BskyParsers } from './bsky_parsers';

export class BskySearch {
	constructor(private agent: BskyAgent) {}

	async searchPosts(query: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.app.bsky.feed.searchPosts({
					q: query,
					limit: pageSize,
					sort: 'latest',
					cursor,
				});

				if (response.data.posts === undefined) {
					break;
				}

				const posts = BskyParsers.parsePosts(response.data.posts);
				allPosts.push(...posts);

				cursor = response.data.cursor;
				if (cursor === undefined) {
					break;
				}
			}

			return allPosts.slice(offset, offset + limit);
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				throw new Error(
					'Search API not yet available on Bluesky. Try browsing posts directly with "posts list" or "posts from"'
				);
			}
			throw new Error(
				`Failed to search posts: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		try {
			const totalNeeded = offset + limit;
			const allUsers: BlueskyProfile[] = [];
			let cursor: string | undefined;

			while (allUsers.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allUsers.length, 100);
				const response = await this.agent.app.bsky.actor.searchActors({
					q: query,
					limit: pageSize,
					cursor,
				});

				const dids = response.data.actors.map((actor: any) => actor.did as string);
				const detailed = await this._getDetailedProfiles(dids);

				const users = response.data.actors.map((actor: any) => {
					const detail = detailed.get(actor.did);
					return {
						did: actor.did,
						handle: actor.handle,
						displayName: actor.displayName || detail?.displayName,
						description: actor.description || detail?.description,
						avatar: actor.avatar || detail?.avatar,
						banner: detail?.banner,
						followsCount: detail?.followsCount ?? 0,
						followersCount: detail?.followersCount ?? 0,
						postsCount: detail?.postsCount ?? 0,
						viewer: actor.viewer ? {
							muted: actor.viewer.muted ?? false,
							blockedBy: actor.viewer.blockedBy ?? false,
							blocking: actor.viewer.blocking !== undefined,
							following: actor.viewer.following !== undefined,
							followedBy: actor.viewer.followedBy !== undefined,
						} : undefined,
					};
				});
				allUsers.push(...users);

				cursor = response.data.cursor;
				if (cursor === undefined) {
					break;
				}
			}

			return allUsers.slice(offset, offset + limit);
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				throw new Error(
					'User search API not yet fully available. Try browsing users directly.'
				);
			}
			throw new Error(
				`Failed to search users: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	private async _getDetailedProfiles(dids: string[]): Promise<Map<string, any>> {
		const result = new Map<string, any>();
		for (let i = 0; i < dids.length; i += 25) {
			const batch = dids.slice(i, i + 25);
			const response = await this.agent.app.bsky.actor.getProfiles({ actors: batch });
			for (const profile of response.data.profiles) {
				result.set(profile.did, profile);
			}
		}
		return result;
	}
}
