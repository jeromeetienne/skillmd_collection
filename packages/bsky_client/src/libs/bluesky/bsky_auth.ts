// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { AuthSession } from '../../types';

export class BskyAuth {
	constructor(private agent: BskyAgent) {}

	async login(username: string, password: string): Promise<AuthSession> {
		try {
			const response = await this.agent.login({
				identifier: username,
				password: password,
			});

			if (response.data.accessJwt === undefined || response.data.did === undefined || response.data.handle === undefined) {
				throw new Error('Invalid response from Bluesky authentication');
			}

			return {
				did: response.data.did,
				handle: response.data.handle,
				accessJwt: response.data.accessJwt,
				refreshJwt: response.data.refreshJwt ?? '',
			};
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('Invalid username')) {
					throw new Error('Invalid username or handle');
				}
				if (error.message.includes('Invalid password')) {
					throw new Error(
						'Invalid password. Use an App Password from your Bluesky settings'
					);
				}
			}
			throw new Error(
				`Authentication failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	async restoreSession(session: AuthSession): Promise<void> {
		await this.agent.resumeSession({
			accessJwt: session.accessJwt,
			refreshJwt: session.refreshJwt,
			did: session.did,
			handle: session.handle,
			active: true,
		});
	}
}
