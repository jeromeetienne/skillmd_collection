// npm imports
import Chalk from 'chalk';
import ReadlinePromises from 'node:readline/promises';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Login Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

interface LoginOptions {
	username?: string;
	password?: string;
}

class LoginCommandHandler {
	async run(
		options: LoginOptions,
		sessionManager: SessionManager,
		out: OutputHelper
	): Promise<void> {
		try {
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Get credentials from options or prompt user
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			let username = options.username;
			let password = options.password;

			if (out.isJson) {
				if (username === undefined || username === '' || password === undefined || password === '') {
					throw new Error('Username and password are required (use -u and -p flags in JSON mode)');
				}
			} else {
				const readline = ReadlinePromises.createInterface({
					input: process.stdin,
					output: process.stdout,
				});

				if (username === undefined || username === '') {
					username = await readline.question(Chalk.cyan('Bluesky handle or email: '));
				}

				if (password === undefined || password === '') {
					// Note: In a real implementation, we'd mask the password input
					password = await readline.question(Chalk.cyan('App password: '));
				}

				readline.close();

				if (username === undefined || username === '' || password === undefined || password === '') {
					throw new Error('Username and password are required');
				}
			}

			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////
			//	Authenticate with Bluesky API
			///////////////////////////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////////////////////////////

			out.progress('Authenticating with Bluesky...');

			const client = new BlueskyClient();
			const session = await client.login(username, password);

			// Save session
			await sessionManager.save(session);

			// Get and display user profile
			await client.restoreSession(session);
			const profile = await client.getProfile();

			if (out.isJson) {
				out.result({ success: true, session: { did: session.did, handle: profile.handle, displayName: profile.displayName } });
			} else {
				console.log(
					Chalk.green(`\n✓ Successfully logged in as ${Chalk.bold(profile.handle)}`)
				);
				console.log(Chalk.dim(`DID: ${session.did}`));
				if (profile.displayName) {
					console.log(Chalk.dim(`Name: ${profile.displayName}`));
				}
			}
		} catch (error) {
			throw new Error(
				`Login failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const loginCommand = new LoginCommandHandler();
