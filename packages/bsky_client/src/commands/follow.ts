// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { BlueskyProfile, SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Follow / Unfollow Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class FollowCommandHandler {
	async follow(
		handle: string,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			if (handle === undefined || handle === '') {
				throw new Error('Handle is required');
			}

			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
			out.progress(`Following @${normalizedHandle}...`);

			const profile = await client.getUserProfile(normalizedHandle);
			const followUri = await client.followUser(profile.did);

			if (out.isJson) {
				out.result({ success: true, uri: followUri });
			} else {
				console.log(Chalk.green(`✓ Following @${normalizedHandle}`));
				console.log(Chalk.dim(`Follow URI: ${followUri}`));
			}
		} catch (error) {
			throw new Error(
				`Failed to follow user: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async unfollow(
		handle: string,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			if (handle === undefined || handle === '') {
				throw new Error('Handle is required');
			}

			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
			out.progress(`Unfollowing @${normalizedHandle}...`);

			await client.unfollowUser(normalizedHandle);

			if (out.isJson) {
				out.result({ success: true });
			} else {
				console.log(Chalk.green(`✓ Unfollowed @${normalizedHandle}`));
			}
		} catch (error) {
			throw new Error(
				`Failed to unfollow user: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Followers / Following Commands
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	async followers(
		handle: string | undefined,
		options: { limit: string; offset?: string },
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
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

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');

			const actor = handle !== undefined ? (handle.startsWith('@') ? handle.slice(1) : handle) : session.handle;
			out.progress(`Fetching followers for @${actor} (offset: ${offset})...`);

			const followers = await client.getFollowers(actor, limit, offset);

			if (out.isJson) {
				out.result({ followers, handle: actor, total: followers.length });
				return;
			}

			if (followers.length === 0) {
				console.log(Chalk.yellow('No followers found'));
				return;
			}

			this._displayProfiles(followers);
			console.log(Chalk.dim(`Total: ${followers.length} results`));
		} catch (error) {
			throw new Error(
				`Failed to list followers: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async following(
		handle: string | undefined,
		options: { limit: string; offset?: string },
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
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

			const limit = this._parseLimit(options.limit);
			const offset = this._parseOffset(options.offset ?? '0');

			const actor = handle !== undefined ? (handle.startsWith('@') ? handle.slice(1) : handle) : session.handle;
			out.progress(`Fetching accounts followed by @${actor} (offset: ${offset})...`);

			const following = await client.getFollows(actor, limit, offset);

			if (out.isJson) {
				out.result({ following, handle: actor, total: following.length });
				return;
			}

			if (following.length === 0) {
				console.log(Chalk.yellow('No following found'));
				return;
			}

			this._displayProfiles(following);
			console.log(Chalk.dim(`Total: ${following.length} results`));
		} catch (error) {
			throw new Error(
				`Failed to list following: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private Helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private _displayProfiles(profiles: BlueskyProfile[]): void {
		for (const user of profiles) {
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
	}

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

export const followCommand = new FollowCommandHandler();
