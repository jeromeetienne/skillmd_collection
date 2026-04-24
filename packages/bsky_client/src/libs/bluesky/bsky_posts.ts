// npm imports
import { BskyAgent, RichText } from '@atproto/api';

// local imports
import type { BlueskyPost } from '../../types';
import { BskyParsers } from './bsky_parsers';
import { BskyLinkCard } from './bsky_link_card';

export class BskyPosts {
	constructor(private agent: BskyAgent) {}

	async getUserPosts(limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.app.bsky.feed.getAuthorFeed({
					actor: this.agent.session.did,
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
				`Failed to fetch user posts: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getAuthorPosts(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		try {
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

			const totalNeeded = offset + limit;
			const allPosts: BlueskyPost[] = [];
			let cursor: string | undefined;

			while (allPosts.length < totalNeeded) {
				const pageSize = Math.min(totalNeeded - allPosts.length, 100);
				const response = await this.agent.app.bsky.feed.getAuthorFeed({
					actor: normalizedHandle,
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
				`Failed to fetch posts from ${handle}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async getPost(uri: string): Promise<BlueskyPost | null> {
		try {
			const response = await this.agent.app.bsky.feed.getPostThread({ uri });

			if (response.data.thread === undefined || response.data.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
				return null;
			}

			const post = response.data.thread.post;
			return BskyParsers.parsePost(post);
		} catch (error) {
			throw new Error(
				`Failed to fetch post ${uri}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async createPost(text: string, replyTo?: { uri: string; cid: string }, stripLink: boolean = false): Promise<string> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}

			// Build link card embed if text contains a URL (before stripping)
			const linkCardEmbed = await BskyLinkCard.buildLinkCardEmbed(this.agent, text);

			// Strip the URL from post text if requested and a link card was built
			let postText = text;
			if (stripLink === true && linkCardEmbed !== null) {
				const url = BskyLinkCard.extractUrl(text);
				if (url !== null) {
					postText = postText.replace(url, '').replace(/\s{2,}/g, ' ').trim();
				}
			}

			const rt = new RichText({ text: postText });
			await rt.detectFacets(this.agent);

			const payload: any = {
				text: rt.text,
				facets: rt.facets,
				createdAt: new Date().toISOString(),
			};

			if (replyTo) {
				payload.reply = {
					root: { uri: replyTo.uri, cid: replyTo.cid },
					parent: { uri: replyTo.uri, cid: replyTo.cid },
				};
			}

			if (linkCardEmbed !== null) {
				payload.embed = linkCardEmbed;
			}

			const response = await this.agent.app.bsky.feed.post.create(
				{ repo: this.agent.session.did },
				payload
			);

			return response.uri;
		} catch (error) {
			throw new Error(
				`Failed to create post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async deletePost(uri: string): Promise<void> {
		try {
			if (this.agent.session?.did === undefined) {
				throw new Error('Not authenticated');
			}
			const rkey = uri.split('/').at(-1);
			if (rkey === undefined) {
				throw new Error('Invalid post URI');
			}
			await this.agent.app.bsky.feed.post.delete(
				{ repo: this.agent.session.did, rkey },
				{}
			);
		} catch (error) {
			throw new Error(
				`Failed to delete post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
