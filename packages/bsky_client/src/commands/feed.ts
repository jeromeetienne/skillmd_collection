// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Feed Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

interface FeedOptions {
	limit: string;
	offset?: string;
}

class FeedCommandHandler {
	/**
	 * View home timeline (posts from people you follow)
	 */
	async timeline(options: FeedOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress(`Fetching ${limit} posts from timeline (offset ${offset})...`);

			const posts = await client.getTimeline(limit, offset);

			if (out.isJson) {
				out.result({ posts });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No posts found'));
				return;
			}

			for (const post of posts) {
				console.log(Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`));
				if (post.author.displayName !== undefined) {
					console.log(Chalk.bold(`${post.author.displayName}`));
				}
				console.log(post.record.text);
				console.log(Chalk.dim(`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${posts.length} posts`));
		} catch (error) {
			throw new Error(
				`Failed to fetch timeline: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * View posts from a custom/algorithmic feed
	 */
	async view(feedUri: string, options: FeedOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress('Fetching feed...');

			const [feedInfo, posts] = await Promise.all([
				client.getFeedGeneratorInfo(feedUri),
				client.getCustomFeed(feedUri, limit, offset),
			]);

			if (out.isJson) {
				out.result({ feed: feedInfo, posts });
				return;
			}

			console.log(Chalk.bold(feedInfo.displayName));
			console.log(Chalk.dim(`by @${feedInfo.creator.handle}`));
			console.log('');

			if (posts.length === 0) {
				console.log(Chalk.yellow('No posts found'));
				return;
			}

			for (const post of posts) {
				console.log(Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`));
				if (post.author.displayName !== undefined) {
					console.log(Chalk.bold(`${post.author.displayName}`));
				}
				console.log(post.record.text);
				console.log(Chalk.dim(`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${posts.length} posts`));
		} catch (error) {
			throw new Error(
				`Failed to view feed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Get metadata about a feed generator
	 */
	async info(feedUri: string, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress('Fetching feed info...');

			const feed = await client.getFeedGeneratorInfo(feedUri);

			if (out.isJson) {
				out.result({ feed });
				return;
			}

			console.log(Chalk.bold(feed.displayName));
			if (feed.description !== undefined) {
				console.log(feed.description);
			}
			console.log('');
			console.log(Chalk.dim(`Creator:  @${feed.creator.handle}`));
			console.log(Chalk.dim(`Likes:    ${feed.likeCount}`));
			console.log(Chalk.dim(`URI:      ${feed.uri}`));
		} catch (error) {
			throw new Error(
				`Failed to fetch feed info: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Browse suggested/popular feeds
	 */
	async discover(options: FeedOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress(`Fetching ${limit} suggested feeds (offset ${offset})...`);

			const feeds = await client.getSuggestedFeeds(limit, offset);

			if (out.isJson) {
				out.result({ feeds });
				return;
			}

			if (feeds.length === 0) {
				console.log(Chalk.yellow('No feeds found'));
				return;
			}

			for (const feed of feeds) {
				console.log(Chalk.bold(feed.displayName));
				console.log(Chalk.dim(`by @${feed.creator.handle} · ❤️  ${feed.likeCount}`));
				if (feed.description !== undefined) {
					const snippet = feed.description.length > 100 ? `${feed.description.slice(0, 100)}…` : feed.description;
					console.log(snippet);
				}
				console.log(Chalk.dim(feed.uri));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${feeds.length} feeds`));
		} catch (error) {
			throw new Error(
				`Failed to discover feeds: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * List feeds published by a user
	 */
	async from(handle: string, options: FeedOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

			out.progress(`Fetching feeds from @${normalizedHandle}...`);

			const feeds = await client.getActorFeeds(normalizedHandle, limit, offset);

			if (out.isJson) {
				out.result({ feeds, handle: normalizedHandle });
				return;
			}

			if (feeds.length === 0) {
				console.log(Chalk.yellow('No feeds found'));
				return;
			}

			for (const feed of feeds) {
				console.log(Chalk.bold(feed.displayName));
				console.log(Chalk.dim(`❤️  ${feed.likeCount}`));
				if (feed.description !== undefined) {
					const snippet = feed.description.length > 100 ? `${feed.description.slice(0, 100)}…` : feed.description;
					console.log(snippet);
				}
				console.log(Chalk.dim(feed.uri));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${feeds.length} feeds`));
		} catch (error) {
			throw new Error(
				`Failed to fetch feeds from ${handle}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * List the authenticated user's saved feeds
	 */
	async saved(sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress('Fetching saved feeds...');

			const feeds = await client.getSavedFeeds();

			if (out.isJson) {
				out.result({ feeds });
				return;
			}

			if (feeds.length === 0) {
				console.log(Chalk.yellow('No saved feeds found'));
				return;
			}

			for (const feed of feeds) {
				console.log(Chalk.bold(feed.displayName));
				console.log(Chalk.dim(`by @${feed.creator.handle} · ❤️  ${feed.likeCount}`));
				if (feed.description !== undefined) {
					const snippet = feed.description.length > 100 ? `${feed.description.slice(0, 100)}…` : feed.description;
					console.log(snippet);
				}
				console.log(Chalk.dim(feed.uri));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${feeds.length} feeds`));
		} catch (error) {
			throw new Error(
				`Failed to fetch saved feeds: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * View a user's liked posts
	 */
	async likes(handle: string | undefined, options: FeedOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const session = await sessionManager.load();

			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const label = handle !== undefined ? `@${handle.startsWith('@') ? handle.slice(1) : handle}` : 'you';
			out.progress(`Fetching ${limit} liked posts for ${label} (offset ${offset})...`);

			const posts = await client.getActorLikes(handle, limit, offset);

			if (out.isJson) {
				out.result({ posts });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No liked posts found'));
				return;
			}

			for (const post of posts) {
				console.log(Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`));
				if (post.author.displayName !== undefined) {
					console.log(Chalk.bold(`${post.author.displayName}`));
				}
				console.log(post.record.text);
				console.log(Chalk.dim(`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`));
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${posts.length} posts`));
		} catch (error) {
			throw new Error(
				`Failed to fetch likes: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private Helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private _parseLimit(limitStr: string): number {
		const limit = parseInt(limitStr, 10);
		if (isNaN(limit) || limit < 1) {
			throw new Error('Limit must be a positive number');
		}
		return Math.min(limit, 100);
	}

	private _parseOffset(offsetStr: string): number {
		const offset = parseInt(offsetStr, 10);
		if (isNaN(offset) || offset < 0) {
			throw new Error('Offset must be a non-negative number');
		}
		return offset;
	}
}

export const feedCommand = new FeedCommandHandler();
