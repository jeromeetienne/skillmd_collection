// npm imports
import Chalk from 'chalk';

// local imports
import type { OutputHelper } from '../libs/output';
import type { SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Logout Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class LogoutCommandHandler {
	async run(sessionManager: SessionManager, out: OutputHelper): Promise<void> {
		try {
			const isAuthenticated = await sessionManager.isAuthenticated();

			if (isAuthenticated === false) {
				if (out.isJson) {
					out.result({ success: false, error: 'not logged in' });
				} else {
					console.log(Chalk.yellow('Not currently logged in'));
				}
				return;
			}

			await sessionManager.clear();

			if (out.isJson) {
				out.result({ success: true });
			} else {
				console.log(Chalk.green('✓ Successfully logged out'));
			}
		} catch (error) {
			throw new Error(
				`Logout failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

export const logoutCommand = new LogoutCommandHandler();
