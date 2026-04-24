import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'node:os';
import { LocalSessionManager } from '../src/libs/session_manager';
import type { AuthSession } from '../src/types';

///////////////////////////////////////////////////////////////////////////////
// session_manager.ts - LocalSessionManager
///////////////////////////////////////////////////////////////////////////////

const SAMPLE_SESSION: AuthSession = {
	did: 'did:plc:abc123',
	handle: 'test.bsky.social',
	accessJwt: 'access-token',
	refreshJwt: 'refresh-token',
};

describe('LocalSessionManager', () => {
	let tmpDir: string;
	let manager: LocalSessionManager;

	beforeEach(() => {
		tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'bsky_cli_test_'));
		manager = new LocalSessionManager(tmpDir);
	});

	afterEach(async () => {
		await Fs.promises.rm(tmpDir, { recursive: true, force: true });
	});

	describe('isAuthenticated()', () => {
		it('returns false when no session exists', async () => {
			assert.equal(await manager.isAuthenticated(), false);
		});

		it('returns true after saving a session', async () => {
			await manager.save(SAMPLE_SESSION);
			assert.equal(await manager.isAuthenticated(), true);
		});
	});

	describe('save() and load()', () => {
		it('round-trips session data', async () => {
			await manager.save(SAMPLE_SESSION);
			const loaded = await manager.load();
			assert.deepEqual(loaded, SAMPLE_SESSION);
		});

		it('load() returns null when no session file exists', async () => {
			const loaded = await manager.load();
			assert.equal(loaded, null);
		});

		it('load() throws on corrupted session file', async () => {
			const sessionPath = Path.join(tmpDir, 'session.json');
			await Fs.promises.writeFile(sessionPath, 'not valid json', 'utf-8');
			await assert.rejects(() => manager.load(), /corrupted/);
		});
	});

	describe('clear()', () => {
		it('removes the session file', async () => {
			await manager.save(SAMPLE_SESSION);
			await manager.clear();
			assert.equal(await manager.isAuthenticated(), false);
		});

		it('does not throw when no session exists', async () => {
			await assert.doesNotReject(() => manager.clear());
		});
	});
});
