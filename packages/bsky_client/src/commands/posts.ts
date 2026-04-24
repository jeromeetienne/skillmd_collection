// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Posts Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

interface PostsOptions {
	limit: string;
	offset?: string;
}

class PostsCommandHandler {
	/**
	 * List authenticated user's posts
	 * @param options - Command options
	 * @param sessionManager - Session manager instance
	 * @param out - Output helper
	 */
	async list(options: PostsOptions, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
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

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Fetch posts from Bluesky API
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress(`Fetching ${limit} posts (offset ${offset})...`);

			const posts = await client.getUserPosts(limit, offset);

			if (out.isJson) {
				out.result({ posts });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No posts found'));
				return;
			}

			// Display posts
			for (const post of posts) {
				console.log(Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`));
				if (post.author.displayName) {
					console.log(Chalk.bold(`${post.author.displayName}`));
				}
				console.log(post.record.text);
				console.log(
					Chalk.dim(
						`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`
					)
				);
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${posts.length} posts`));
		} catch (error) {
			throw new Error(
				`Failed to list posts: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Get posts from a specific user
	 * @param handle - Bluesky user handle
	 * @param options - Command options
	 * @param out - Output helper
	 */
	async from(
		handle: string,
		options: PostsOptions,
		out: OutputHelper
	): Promise<void> {
		try {
			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');

			// Normalize handle
			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Fetch posts from Bluesky API
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const client = new BlueskyClient();

			out.progress(`Fetching ${limit} posts from @${normalizedHandle} (offset ${offset})...`);

			const posts = await client.getAuthorPosts(normalizedHandle, limit, offset);

			if (out.isJson) {
				out.result({ posts });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No posts found'));
				return;
			}

			// Display posts
			for (const post of posts) {
				console.log(
					Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`)
				);
				if (post.author.displayName) {
					console.log(Chalk.bold(`${post.author.displayName}`));
				}
				console.log(post.record.text);
				console.log(
					Chalk.dim(
						`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`
					)
				);
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${posts.length} posts`));
		} catch (error) {
			throw new Error(
				`Failed to get posts from ${handle}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * View a specific post
	 * @param uri - Post URI
	 * @param out - Output helper
	 */
	async view(uri: string, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			if (uri === undefined || uri === '') {
				throw new Error('Post URI is required');
			}

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Fetch post from Bluesky API
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const client = new BlueskyClient();

			const session = await sessionManager.load();
			if (session) {
				await client.restoreSession(session);
			}

			out.progress('Fetching post...');

			const post = await client.getPost(uri);

			if (post === null) {
				throw new Error('Post not found');
			}

			if (out.isJson) {
				out.result({ post });
				return;
			}

			// Display post
			console.log(Chalk.cyan(`@${post.author.handle} ${Chalk.dim('·')} ${post.record.createdAt}`));
			if (post.author.displayName) {
				console.log(Chalk.bold(`${post.author.displayName}`));
			}
			console.log('');
			console.log(post.record.text);
			console.log('');
			console.log(
				Chalk.dim(
					`❤️  ${post.likeCount} · 💬 ${post.replyCount} · 🔄 ${post.repostCount}`
				)
			);
			console.log(Chalk.dim(`URI: ${uri}`));
		} catch (error) {
			throw new Error(
				`Failed to view post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Create a new post
	 * @param text - Post text (max 300 chars)
	 * @param sessionManager - Session manager instance
	 * @param out - Output helper
	 */
	async create(text: string, sessionManager: SessionManager, out: OutputHelper, options?: { stripLink?: boolean }): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			if (text === undefined || text.trim().length === 0) {
				throw new Error('Post text cannot be empty');
			}

			const stripLink = options?.stripLink ?? true;
			const url = stripLink === true ? text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i)?.[0]?.replace(/[.,;:!?)]+$/, '') ?? null : null;
			const effectiveText = url !== null ? text.replace(url, '').replace(/\s{2,}/g, ' ').trim() : text;
			if (effectiveText.length > 300) {
				throw new Error('Post text must be 300 characters or less');
			}

			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress('Posting...');

			const uri = await client.createPost(text, undefined, stripLink);

			if (out.isJson) {
				out.result({ success: true, uri });
			} else {
				console.log(Chalk.green('✓ Post created'));
				console.log(Chalk.dim(`URI: ${uri}`));
			}
		} catch (error) {
			throw new Error(
				`Failed to create post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Delete a post
	 * @param uri - Post URI
	 * @param sessionManager - Session manager instance
	 * @param out - Output helper
	 */
	async delete(uri: string, sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			if (uri === undefined || uri === '') {
				throw new Error('Post URI is required');
			}

			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			out.progress('Deleting post...');

			await client.deletePost(uri);

			if (out.isJson) {
				out.result({ success: true });
			} else {
				console.log(Chalk.green('✓ Post deleted'));
			}
		} catch (error) {
			throw new Error(
				`Failed to delete post: ${error instanceof Error ? error.message : String(error)}`
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
		return Math.min(limit, 100); // Cap at 100
	}

	private _parseOffset(offsetStr: string): number {
		const offset = parseInt(offsetStr, 10);
		if (isNaN(offset) || offset < 0) {
			throw new Error('Offset must be a non-negative number');
		}
		return offset;
	}
}

export const postsCommand = new PostsCommandHandler();
