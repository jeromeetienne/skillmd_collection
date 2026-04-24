// local imports
import type { BlueskyPost, BlueskyFeedGenerator } from '../../types';

export class BskyParsers {
	static parseFeedGenerators(generators: any[]): BlueskyFeedGenerator[] {
		return generators
			.map(generator => BskyParsers.parseFeedGenerator(generator))
			.filter((feed): feed is BlueskyFeedGenerator => feed !== null);
	}

	static parseFeedGenerator(generator: any): BlueskyFeedGenerator | null {
		try {
			return {
				uri: generator.uri,
				cid: generator.cid,
				did: generator.did,
				creator: {
					did: generator.creator.did,
					handle: generator.creator.handle,
					displayName: generator.creator.displayName,
				},
				displayName: generator.displayName ?? '',
				description: generator.description,
				likeCount: generator.likeCount ?? 0,
				indexedAt: generator.indexedAt,
			};
		} catch (error) {
			console.warn(`Failed to parse feed generator: ${error}`);
			return null;
		}
	}

	static parsePosts(feed: any[]): BlueskyPost[] {
		return feed
			.filter(item => item.post)
			.map(item => BskyParsers.parsePost(item.post))
			.filter((post): post is BlueskyPost => post !== null);
	}

	static parsePost(post: any): BlueskyPost | null {
		try {
			return {
				uri: post.uri,
				cid: post.cid,
				author: {
					did: post.author.did,
					handle: post.author.handle,
					displayName: post.author.displayName,
					avatar: post.author.avatar,
				},
				record: {
					text: post.record.text ?? '',
					createdAt: post.record.createdAt ?? '',
					reply: post.record.reply ? {
						root: post.record.reply.root,
						parent: post.record.reply.parent,
					} : undefined,
				},
				indexedAt: post.indexedAt,
				likeCount: post.likeCount ?? 0,
				replyCount: post.replyCount ?? 0,
				repostCount: post.repostCount ?? 0,
			};
		} catch (error) {
			console.warn(`Failed to parse post: ${error}`);
			return null;
		}
	}
}
