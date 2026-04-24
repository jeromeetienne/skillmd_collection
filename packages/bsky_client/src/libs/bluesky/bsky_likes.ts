// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { BlueskyPost } from '../../types';
import { BskyParsers } from './bsky_parsers';

export class BskyLikes {
	constructor(private agent: BskyAgent) {}

	async likePost(uri: string, cid: string): Promise<string> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}
			const response = await this.agent.like(uri, cid);
			return response.uri;
		} catch (error) {
			throw new Error(
				`Failed to like post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async unlikePost(uri: string): Promise<void> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}
			const response = await this.agent.app.bsky.feed.getPostThread({ uri });
			if (response.data.thread === undefined || response.data.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
				throw new Error('Post not found');
			}
			const likeUri = (response.data.thread.post as any)?.viewer?.like;
			if (likeUri === undefined) {
				throw new Error('Post is not liked');
			}
			await this.agent.deleteLike(likeUri);
		} catch (error) {
			throw new Error(
				`Failed to unlike post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getActorLikes(handle: string | undefined, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const actor = handle !== undefined
				? (handle.startsWith('@') ? handle.slice(1) : handle)
				: this.agent.session.did;

			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.app.bsky.feed.getActorLikes({
					actor,
					limit: pageSize,
					cursor,
				});

				const posts = BskyParsers.parsePosts(response.data.feed);
				allPosts.push(...posts);

				cursor = response.data.cursor;
				if (cursor === undefined) {
					break;
				}
			}

			return allPosts.slice(offset, offset + limit);
		} catch (error) {
			throw new Error(
				`Failed to fetch likes: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
