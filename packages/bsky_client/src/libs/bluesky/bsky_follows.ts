// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { BlueskyProfile } from '../../types';

export class BskyFollows {
	constructor(private agent: BskyAgent) {}

	async followUser(did: string): Promise<string> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}
			const response = await this.agent.follow(did);
			return response.uri;
		} catch (error) {
			throw new Error(
				`Failed to follow user: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async unfollowUser(handle: string): Promise<void> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
			const response = await this.agent.app.bsky.actor.getProfile({ actor: normalizedHandle });
			const followUri = response.data.viewer?.following;
			if (followUri === undefined) {
				throw new Error('Not following this user');
			}
			await this.agent.deleteFollow(followUri);
		} catch (error) {
			throw new Error(
				`Failed to unfollow user: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getFollowers(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		try {
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
			const totalNeeded = offset + limit;
			const allUsers: BlueskyProfile[] = [];
			let cursor: string | undefined;

			while (allUsers.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allUsers.length, 100);
				const response = await this.agent.app.bsky.graph.getFollowers({
					actor: normalizedHandle,
					limit: pageSize,
					cursor,
				});

				const dids = response.data.followers.map((actor: any) => actor.did as string);
				const detailed = await this._getDetailedProfiles(dids);

				const users = response.data.followers.map((actor: any) => {
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
			throw new Error(
				`Failed to get followers: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getFollows(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		try {
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
			const totalNeeded = offset + limit;
			const allUsers: BlueskyProfile[] = [];
			let cursor: string | undefined;

			while (allUsers.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allUsers.length, 100);
				const response = await this.agent.app.bsky.graph.getFollows({
					actor: normalizedHandle,
					limit: pageSize,
					cursor,
				});

				const dids = response.data.follows.map((actor: any) => actor.did as string);
				const detailed = await this._getDetailedProfiles(dids);

				const users = response.data.follows.map((actor: any) => {
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
			throw new Error(
				`Failed to get following: ${error instanceof Error ? error.message : String(error)}`
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
