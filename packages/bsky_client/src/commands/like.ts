// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Like / Unlike Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class LikeCommandHandler {
	async like(
		uri: string,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
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

			out.progress('Liking post...');

			const post = await client.getPost(uri);
			if (post === null) {
				throw new Error('Post not found');
			}

			const likeUri = await client.likePost(post.uri, post.cid);

			if (out.isJson) {
				out.result({ success: true, uri: likeUri });
			} else {
				console.log(Chalk.green('✓ Post liked'));
				console.log(Chalk.dim(`Like URI: ${likeUri}`));
			}
		} catch (error) {
			throw new Error(
				`Failed to like post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async unlike(
		uri: string,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
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

			out.progress('Removing like...');

			await client.unlikePost(uri);

			if (out.isJson) {
				out.result({ success: true });
			} else {
				console.log(Chalk.green('✓ Like removed'));
			}
		} catch (error) {
			throw new Error(
				`Failed to unlike post: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const likeCommand = new LikeCommandHandler();
