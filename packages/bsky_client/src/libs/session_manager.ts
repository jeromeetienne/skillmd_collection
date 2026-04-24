// node imports
import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'node:os';

// local imports
import type { AuthSession, StoredSession, SessionManager } from '../types';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Session Manager Implementation
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class LocalSessionManager implements SessionManager {
	private sessionPath: string;

	constructor(configDir?: string) {
		const dir = configDir ?? Path.join(Os.homedir(), '.bsky_cli');
		this.sessionPath = Path.join(dir, 'session.json');
	}

	/**
	 * Save authentication session to local storage
	 * @param session - Authentication session to save
	 */
	async save(session: AuthSession): Promise<void> {
		try {
			const configDir = Path.dirname(this.sessionPath);

			// Create config directory if it doesn't exist
			if (!(await this._pathExists(configDir))) {
				await Fs.promises.mkdir(configDir, { recursive: true });
			}

			const storedSession: StoredSession = {
				...session,
				createdAt: new Date().toISOString(),
				lastUsed: new Date().toISOString(),
			};

			await Fs.promises.writeFile(
				this.sessionPath,
				JSON.stringify(storedSession, null, '\t'),
				'utf-8'
			);
		} catch (error) {
			throw new Error(
				`Failed to save session: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Load authentication session from local storage
	 * @returns Loaded session or null if not found
	 */
	async load(): Promise<AuthSession | null> {
		try {
			if (!(await this._pathExists(this.sessionPath))) {
				return null;
			}

			const content = await Fs.promises.readFile(this.sessionPath, 'utf-8');
			const stored = JSON.parse(content) as StoredSession;

			// Update last used time
			stored.lastUsed = new Date().toISOString();
			await Fs.promises.writeFile(
				this.sessionPath,
				JSON.stringify(stored, null, '\t'),
				'utf-8'
			);

			return {
				did: stored.did,
				handle: stored.handle,
				accessJwt: stored.accessJwt,
				refreshJwt: stored.refreshJwt,
			};
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error('Session file is corrupted. Please login again.');
			}
			throw new Error(
				`Failed to load session: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Clear saved session from local storage
	 */
	async clear(): Promise<void> {
		try {
			if (await this._pathExists(this.sessionPath)) {
				await Fs.promises.unlink(this.sessionPath);
			}
		} catch (error) {
			throw new Error(
				`Failed to clear session: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Check if a valid session is stored
	 * @returns True if session exists, false otherwise
	 */
	async isAuthenticated(): Promise<boolean> {
		return this._pathExists(this.sessionPath);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private Helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private async _pathExists(filePath: string): Promise<boolean> {
		try {
			await Fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
}
