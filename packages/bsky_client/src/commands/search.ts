// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { BlueskyPost, SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Search Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

interface SearchOptions {
	limit: string;
	offset?: string;
	sort?: string;
}

class SearchCommandHandler {
	/**
	 * Search for posts by query text
	 * @param query - Search query text
	 * @param options - Search options (limit, sort, etc.)
	 * @param sessionManager - Session manager for authentication
	 */
	async posts(
		query: string,
		options: SearchOptions,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			if (query === undefined || query.trim().length === 0) {
				throw new Error('Search query cannot be empty');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');
			const sortBy = options.sort || 'latest';

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Search for posts
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			out.progress(`Searching for "${query}" (sort: ${sortBy}, offset: ${offset})...`);

			// Load session and authenticate
			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const posts = await client.searchPosts(query, limit, offset);

			if (out.isJson) {
				out.result({ posts, query, total: posts.length });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No posts found'));
				return;
			}

			// Display results
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

			console.log(Chalk.dim(`Total: ${posts.length} results`));
		} catch (error) {
			throw new Error(
				`Search failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Search for users by handle or display name
	 * @param query - User search query (handle or name)
	 * @param options - Search options
	 * @param sessionManager - Session manager for authentication
	 */
	async users(
		query: string,
		options: SearchOptions,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			if (query === undefined || query.trim().length === 0) {
				throw new Error('Search query cannot be empty');
			}

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Search for users
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			out.progress(`Searching for users matching "${query}" (offset: ${offset})...`);

			// Load session and authenticate
			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const users = await client.searchUsers(query, limit, offset);

			if (out.isJson) {
				out.result({ users, query, total: users.length });
				return;
			}

			if (users.length === 0) {
				console.log(Chalk.yellow('No users found'));
				return;
			}

			// Display results
			for (const user of users) {
				console.log(Chalk.cyan(`@${user.handle}`));
				if (user.displayName) {
					console.log(Chalk.bold(`${user.displayName}`));
				}
				if (user.description) {
					console.log(Chalk.dim(user.description));
				}
				console.log(
					Chalk.dim(
						`👥 ${user.followersCount} followers · 📝 ${user.postsCount} posts`
					)
				);
				console.log('');
			}

			console.log(Chalk.dim(`Total: ${users.length} results`));
		} catch (error) {
			throw new Error(
				`User search failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Search with advanced options and filters
	 * @param query - Search query
	 * @param options - Advanced search options
	 * @param sessionManager - Session manager for authentication
	 */
	async advanced(
		query: string,
		options: Record<string, unknown>,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			if (query === undefined || query.trim().length === 0) {
				throw new Error('Search query cannot be empty');
			}

			const limitStr = typeof options.limit === 'string' ? options.limit : '10';
			const limit = this._parseLimit(limitStr);
			const offsetStr = typeof options.offset === 'string' ? options.offset : '0';
			const offset = this._parseOffset(offsetStr);

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Build search filters
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const filters = this._buildSearchFilters(options);

			out.progress(`Advanced search: "${query}" (limit: ${limit}, offset: ${offset})`);

			if (!out.isJson) {
				console.log(Chalk.dim('Advanced Search\n'));
				console.log(Chalk.cyan(`Query: "${query}"`));

				if (Object.keys(filters).length > 0) {
					console.log(Chalk.dim('\nFilters:'));
					for (const [key, value] of Object.entries(filters)) {
						console.log(Chalk.dim(`  ${key}: ${value}`));
					}
				}

				console.log(Chalk.dim(`\nLimit: ${limit}\n`));
			}

			// Load session and authenticate
			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			// Perform the search
			const posts = await client.searchPosts(query, limit, offset);

			// Apply client-side filtering based on options
			let filtered = posts;

			// Filter by author if specified
			if (filters.author) {
				filtered = filtered.filter((post: BlueskyPost) =>
					post.author.handle === filters.author ||
					post.author.handle === `@${filters.author}`
				);
			}

			// Filter by date range
			if (filters.since || filters.until) {
				filtered = filtered.filter((post: BlueskyPost) => {
					const postDate = new Date(post.record.createdAt);
					if (filters.since) {
						const sinceDate = new Date(filters.since as string);
						if (postDate < sinceDate) return false;
					}
					if (filters.until) {
						const untilDate = new Date(filters.until as string);
						if (postDate > untilDate) return false;
					}
					return true;
				});
			}

			if (out.isJson) {
				out.result({ posts: filtered, query, filters, total: filtered.length });
				return;
			}

			if (posts.length === 0) {
				console.log(Chalk.yellow('No results found matching your filters'));
				return;
			}

			if (filtered.length === 0) {
				console.log(Chalk.yellow('No results match the specified filters'));
				return;
			}

			// Display results
			for (const post of filtered) {
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

			console.log(Chalk.dim(`Total: ${filtered.length} results`));
		} catch (error) {
			throw new Error(
				`Advanced search failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Show search suggestions and help
	 */
	async help(): Promise<void> {
		console.log(Chalk.cyan('\n📚 Bluesky Search Guide\n'));

		console.log(Chalk.bold('Basic Search:'));
		console.log(
			Chalk.dim('  bsky search posts "TypeScript tips" --limit 20\n')
		);

		console.log(Chalk.bold('Search Users:'));
		console.log(Chalk.dim('  bsky search users "alice" --limit 10\n'));

		console.log(Chalk.bold('Advanced Search with Filters:'));
		console.log(
			Chalk.dim(
				'  bsky search advanced "AI development" \\\n' +
				'    --type posts \\\n' +
				'    --author @username \\\n' +
				'    --since 2024-01-01 \\\n' +
				'    --until 2024-12-31 \\\n' +
				'    --language en \\\n' +
				'    --limit 50\n'
			)
		);

		console.log(Chalk.bold('Common Search Operators:'));
		console.log(Chalk.dim('  "exact phrase"     - Search for exact phrase'));
		console.log(Chalk.dim('  -word              - Exclude word from results'));
		console.log(Chalk.dim('  word1 OR word2     - Search for either word'));
		console.log(Chalk.dim('  from:@handle       - Posts from specific user'));
		console.log(Chalk.dim('  #hashtag           - Posts with hashtag\n'));

		console.log(Chalk.bold('Filter Options:'));
		console.log(
			Chalk.dim(
				'  --type <type>      - Type: posts, replies, reposts (default: all)'
			)
		);
		console.log(Chalk.dim('  --author <handle>  - Filter by author handle'));
		console.log(Chalk.dim('  --since <date>     - Results after date (YYYY-MM-DD)'));
		console.log(Chalk.dim('  --until <date>     - Results before date (YYYY-MM-DD)'));
		console.log(Chalk.dim('  --language <lang>  - Filter by language code (en, es, etc.)'));
		console.log(Chalk.dim('  --limit <number>   - Max results to return (default: 10)\n'));

		console.log(Chalk.bold('Examples:'));
		console.log(
			Chalk.dim('  # Search for Bluesky protocol discussions\n' +
				'  bsky search posts "ATProto" --limit 25\n')
		);
		console.log(
			Chalk.dim('  # Search posts from last 7 days\n' +
				'  bsky search advanced "climate" \\\n' +
				'    --since 2024-03-09 \\\n' +
				'    --until 2024-03-16\n')
		);
		console.log(
			Chalk.dim('  # Find users interested in TypeScript\n' +
				'  bsky search users "typescript developer" --limit 15\n')
		);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private Helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private _parseOffset(offsetStr: string): number {
		const offset = parseInt(offsetStr, 10);
		if (isNaN(offset) || offset < 0) {
			throw new Error('Offset must be a non-negative number');
		}
		return offset;
	}

	private _parseLimit(limitStr: string): number {
		const limit = parseInt(limitStr, 10);
		if (isNaN(limit) || limit < 1) {
			throw new Error('Limit must be a positive number');
		}
		return Math.min(limit, 100); // Cap at 100
	}

	private _buildSearchFilters(options: Record<string, unknown>): Record<string, unknown> {
		const filters: Record<string, unknown> = {};

		if (options.type && typeof options.type === 'string') {
			filters.type = options.type;
		}

		if (options.author && typeof options.author === 'string') {
			filters.author = options.author;
		}

		if (options.since && typeof options.since === 'string') {
			filters.since = options.since;
		}

		if (options.until && typeof options.until === 'string') {
			filters.until = options.until;
		}

		if (options.language && typeof options.language === 'string') {
			filters.language = options.language;
		}

		return filters;
	}
}

export const searchCommand = new SearchCommandHandler();
