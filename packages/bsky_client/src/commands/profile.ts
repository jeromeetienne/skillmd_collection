// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Profile Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class ProfileCommandHandler {
	async run(
		handle: string,
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

			const resolvedHandle = (handle === undefined || handle === null || handle === '') ? session.handle : handle;
			const normalizedHandle = resolvedHandle.startsWith('@') ? resolvedHandle.slice(1) : resolvedHandle;
			out.progress(`Fetching profile for @${normalizedHandle}...`);

			const profile = await client.getUserProfile(normalizedHandle);

			if (out.isJson) {
				out.result({ profile });
				return;
			}

			console.log(Chalk.bold.cyan(`@${profile.handle}`));
			if (profile.displayName !== undefined && profile.displayName !== '') {
				console.log(Chalk.white(`  Name: ${profile.displayName}`));
			}
			if (profile.description !== undefined && profile.description !== '') {
				console.log(Chalk.white(`  Bio:  ${profile.description}`));
			}
			console.log(Chalk.dim(`  DID:  ${profile.did}`));
			console.log('');
			console.log(Chalk.green(`  Followers:  ${profile.followersCount}`));
			console.log(Chalk.green(`  Following:  ${profile.followsCount}`));
			console.log(Chalk.green(`  Posts:      ${profile.postsCount}`));

			if (profile.viewer !== undefined) {
				console.log('');
				const relationships: string[] = [];
				if (profile.viewer.following === true) {
					relationships.push('You follow them');
				}
				if (profile.viewer.followedBy === true) {
					relationships.push('They follow you');
				}
				if (profile.viewer.muted === true) {
					relationships.push('Muted');
				}
				if (profile.viewer.blocking === true) {
					relationships.push('Blocked');
				}
				if (profile.viewer.blockedBy === true) {
					relationships.push('Blocked by');
				}
				if (relationships.length > 0) {
					console.log(Chalk.yellow(`  Relationship: ${relationships.join(', ')}`));
				}
			}
		} catch (error) {
			throw new Error(
				`Failed to get profile: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const profileCommand = new ProfileCommandHandler();
