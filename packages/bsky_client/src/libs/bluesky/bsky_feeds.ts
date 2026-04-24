// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { BlueskyPost, BlueskyFeedGenerator } from '../../types';
import { BskyParsers } from './bsky_parsers';

export class BskyFeeds {
	constructor(private agent: BskyAgent) {}

	async getTimeline(limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.getTimeline({
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
				`Failed to fetch timeline: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getCustomFeed(feedUri: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.app.bsky.feed.getFeed({
					feed: feedUri,
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
				`Failed to fetch feed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getFeedGeneratorInfo(feedUri: string): Promise<BlueskyFeedGenerator> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const response = await this.agent.app.bsky.feed.getFeedGenerator({
				feed: feedUri,
			});

			const generator = BskyParsers.parseFeedGenerator(response.data.view);
			if (generator === null) {
				throw new Error('Failed to parse feed generator');
			}

			return generator;
		} catch (error) {
			throw new Error(
				`Failed to fetch feed info: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getSuggestedFeeds(limit: number = 10, offset: number = 0): Promise<BlueskyFeedGenerator[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const totalNeeded = offset + limit;
			const allFeeds: BlueskyFeedGenerator[] = [];
			let cursor: string | undefined;

			while (allFeeds.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allFeeds.length, 100);
				const response = await this.agent.app.bsky.feed.getSuggestedFeeds({
					limit: pageSize,
					cursor,
				});

				const feeds = BskyParsers.parseFeedGenerators(response.data.feeds);
				allFeeds.push(...feeds);

				cursor = response.data.cursor;
				if (cursor === undefined) {
					break;
				}
			}

			return allFeeds.slice(offset, offset + limit);
		} catch (error) {
			throw new Error(
				`Failed to fetch suggested feeds: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getSavedFeeds(): Promise<BlueskyFeedGenerator[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const prefs = await this.agent.getPreferences();
			const savedFeeds = prefs.savedFeeds ?? [];
			const feedUris = savedFeeds
				.filter(f => f.type === 'feed')
				.map(f => f.value);

			if (feedUris.length === 0) {
				return [];
			}

			const response = await this.agent.app.bsky.feed.getFeedGenerators({ feeds: feedUris });
			return BskyParsers.parseFeedGenerators(response.data.feeds);
		} catch (error) {
			throw new Error(
				`Failed to fetch saved feeds: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getActorFeeds(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyFeedGenerator[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

			const totalNeeded = offset + limit;
			const allFeeds: BlueskyFeedGenerator[] = [];
			let cursor: string | undefined;

			while (allFeeds.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allFeeds.length, 100);
				const response = await this.agent.app.bsky.feed.getActorFeeds({
					actor: normalizedHandle,
					limit: pageSize,
					cursor,
				});

				const feeds = BskyParsers.parseFeedGenerators(response.data.feeds);
				allFeeds.push(...feeds);

				cursor = response.data.cursor;
				if (cursor === undefined) {
					break;
				}
			}

			return allFeeds.slice(offset, offset + limit);
		} catch (error) {
			throw new Error(
				`Failed to fetch feeds from ${handle}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
