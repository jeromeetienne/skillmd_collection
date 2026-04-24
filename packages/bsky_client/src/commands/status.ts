// npm imports
import Chalk from 'chalk';

// local imports
import { BlueskyClient } from '../libs/bluesky_client';
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Status Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class StatusCommandHandler {
	async run(sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const session = await sessionManager.load();

			if (session === null) {
				if (out.isJson) {
					out.result({ authenticated: false });
				} else {
					console.log('\n' + Chalk.yellow('✗ Not authenticated'));
					console.log('  Run ' + Chalk.cyan('bsky login') + ' to authenticate');
					console.log('');
				}
				return;
			}

			try {
				const client = new BlueskyClient();
				await client.restoreSession(session);
			} catch {
				if (out.isJson) {
					out.result({ authenticated: false });
				} else {
					console.log('\n' + Chalk.yellow('✗ Not authenticated'));
					console.log('  Session expired or revoked. Run ' + Chalk.cyan('bsky login') + ' to re-authenticate.');
					console.log('');
				}
				return;
			}

			if (out.isJson) {
				out.result({ authenticated: true, session: { did: session.did, handle: session.handle } });
			} else {
				console.log('\n' + Chalk.green('✓ Authenticated'));
				console.log(`  Handle: ${Chalk.bold(session.handle)}`);
				console.log(`  DID: ${Chalk.dim(session.did)}`);
				console.log('');
			}
		} catch (error) {
			throw new Error(
				`Status check failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const statusCommand = new StatusCommandHandler();
