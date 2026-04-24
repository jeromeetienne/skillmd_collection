// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Reply Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class ReplyCommandHandler {
	async run(
		uri: string,
		text: string,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Validate inputs
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const isAuthenticated = await sessionManager.isAuthenticated();
			if (isAuthenticated === false) {
				throw new Error('Not authenticated. Run "bsky login" first');
			}

			if (uri === undefined || uri === '') {
				throw new Error('Post URI is required');
			}

			if (text === undefined || text.trim().length === 0) {
				throw new Error('Reply text cannot be empty');
			}

			if (text.length > 300) {
				throw new Error('Reply text must be 300 characters or less');
			}

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Post reply to Bluesky API
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			const session = await sessionManager.load();
			if (session === null) {
				throw new Error('Failed to load session');
			}

			const client = new BlueskyClient();
			await client.restoreSession(session);

			// First, fetch the post to get CID for proper reply structure
			out.progress('Posting reply...');

			const parentPost = await client.getPost(uri);
			if (parentPost === null) {
				throw new Error('Parent post not found');
			}

			// Create the reply
			const replyUri = await client.createPost(text, {
				uri: parentPost.uri,
				cid: parentPost.cid,
			});

			if (out.isJson) {
				out.result({ success: true, uri: replyUri });
			} else {
				console.log(Chalk.green('✓ Reply posted successfully'));
				console.log(Chalk.dim(`Reply URI: ${replyUri}`));
			}
		} catch (error) {
			throw new Error(
				`Failed to post reply: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const replyCommand = new ReplyCommandHandler();
