// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { BlueskyProfile } from '../../types';

export class BskyProfiles {
	constructor(private agent: BskyAgent) {}

	async getProfile(): Promise<BlueskyProfile> {
		try {
			const response = await this.agent.app.bsky.actor.getProfile({
				actor: this.agent.session?.did ?? 'unknown',
			});

			return {
				did: response.data.did,
				handle: response.data.handle,
				displayName: response.data.displayName,
				description: response.data.description,
				avatar: response.data.avatar,
				banner: response.data.banner,
				followsCount: response.data.followsCount ?? 0,
				followersCount: response.data.followersCount ?? 0,
				postsCount: response.data.postsCount ?? 0,
			};
		} catch (error) {
			throw new Error(
				`Failed to fetch profile: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getUserProfile(handle: string): Promise<BlueskyProfile> {
		try {
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

			const response = await this.agent.app.bsky.actor.getProfile({
				actor: normalizedHandle,
			});

			return {
				did: response.data.did,
				handle: response.data.handle,
				displayName: response.data.displayName,
				description: response.data.description,
				avatar: response.data.avatar,
				banner: response.data.banner,
				followsCount: response.data.followsCount ?? 0,
				followersCount: response.data.followersCount ?? 0,
				postsCount: response.data.postsCount ?? 0,
				viewer: response.data.viewer ? {
					muted: response.data.viewer.muted ?? false,
					blockedBy: response.data.viewer.blockedBy ?? false,
					blocking: response.data.viewer.blocking !== undefined,
					following: response.data.viewer.following !== undefined,
					followedBy: response.data.viewer.followedBy !== undefined,
				} : undefined,
			};
		} catch (error) {
			throw new Error(
				`Failed to fetch profile for ${handle}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
