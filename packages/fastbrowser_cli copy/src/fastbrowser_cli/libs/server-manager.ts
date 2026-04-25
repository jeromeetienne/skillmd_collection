// node imports
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { spawn } from 'node:child_process';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type PidFile = {
	pid: number;
	port: number;
	startedAt: string;
};

const STATE_DIR = Path.join(Os.homedir(), '.fastbrowser_cli');
const PID_FILE = Path.join(STATE_DIR, 'server.json');
const LOG_FILE = Path.join(STATE_DIR, 'server.log');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class ServerManager {
	static async status(serverUrl: string): Promise<'running' | 'stopped'> {
		const base = serverUrl.replace(/\/+$/, '');
		try {
			const response = await fetch(`${base}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(500),
			});
			if (response.ok === false) return 'stopped';
			const payload = await response.json() as { ok?: unknown };
			return payload.ok === true ? 'running' : 'stopped';
		} catch {
			return 'stopped';
		}
	}

	static async ensureRunning(serverUrl: string): Promise<void> {
		const state = await ServerManager.status(serverUrl);
		if (state === 'running') return;

		if (ServerManager.isLocalUrl(serverUrl) === false) {
			throw new Error(`fastbrowser server at ${serverUrl} is not reachable and cannot be auto-started (non-local URL)`);
		}
		await ServerManager.start(serverUrl);
	}

	static async start(serverUrl: string): Promise<void> {
		const existing = await ServerManager.status(serverUrl);
		if (existing === 'running') {
			console.error(`fastbrowser server already running at ${serverUrl}`);
			return;
		}

		if (ServerManager.isLocalUrl(serverUrl) === false) {
			throw new Error(`Refusing to start: ${serverUrl} is not a local URL`);
		}

		const port = ServerManager.parsePort(serverUrl);
		const entryPath = Path.resolve(__dirname, '..', '..', 'fastbrowser_httpd', 'fastbrowser_httpd.js');
		const packageRoot = Path.resolve(__dirname, '..', '..', '..');

		Fs.mkdirSync(STATE_DIR, { recursive: true });
		const logFd = Fs.openSync(LOG_FILE, 'a');

		const child = spawn(process.execPath, [entryPath, '--port', String(port)], {
			detached: true,
			stdio: ['ignore', logFd, logFd],
			cwd: packageRoot,
			env: process.env,
		});
		child.unref();

		const pid = child.pid;
		if (pid === undefined) {
			Fs.closeSync(logFd);
			throw new Error('Failed to spawn fastbrowser-httpd (no pid)');
		}

		const pidFile: PidFile = {
			pid,
			port,
			startedAt: new Date().toISOString(),
		};
		Fs.writeFileSync(PID_FILE, JSON.stringify(pidFile, null, 2));

		const deadline = Date.now() + 10_000;
		while (Date.now() < deadline) {
			const state = await ServerManager.status(serverUrl);
			if (state === 'running') {
				Fs.closeSync(logFd);
				console.error(`fastbrowser server started (pid=${pid}, port=${port})`);
				return;
			}
			await ServerManager.sleep(500);
		}

		Fs.closeSync(logFd);
		const tail = ServerManager.readLogTail(50);
		throw new Error(`fastbrowser server did not become healthy within 10s. Log tail:\n${tail}`);
	}

	static async stop(serverUrl: string): Promise<void> {
		if (Fs.existsSync(PID_FILE) === false) {
			console.error('no server pid file; nothing to stop');
			return;
		}

		let pidFile: PidFile;
		try {
			const raw = Fs.readFileSync(PID_FILE, 'utf8');
			pidFile = JSON.parse(raw) as PidFile;
		} catch (err) {
			throw new Error(`Failed to read pid file ${PID_FILE}: ${(err as Error).message}`);
		}

		const pid = pidFile.pid;
		try {
			process.kill(pid, 'SIGTERM');
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== 'ESRCH') {
				throw err;
			}
		}

		const deadline = Date.now() + 5_000;
		while (Date.now() < deadline) {
			if (ServerManager.isAlive(pid) === false) break;
			await ServerManager.sleep(200);
		}

		if (ServerManager.isAlive(pid) === true) {
			try {
				process.kill(pid, 'SIGKILL');
			} catch {
				// best effort
			}
		}

		try {
			Fs.unlinkSync(PID_FILE);
		} catch {
			// best effort
		}

		// Best-effort: ensure the HTTP server is actually down from the caller's perspective.
		const state = await ServerManager.status(serverUrl);
		if (state === 'running') {
			console.error(`warning: process ${pid} killed but ${serverUrl} still responds to /health`);
			return;
		}
		console.error('fastbrowser server stopped');
	}

	private static isLocalUrl(serverUrl: string): boolean {
		try {
			const parsed = new URL(serverUrl);
			const host = parsed.hostname;
			return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
		} catch {
			return false;
		}
	}

	private static parsePort(serverUrl: string): number {
		try {
			const parsed = new URL(serverUrl);
			if (parsed.port !== '') {
				const port = Number.parseInt(parsed.port, 10);
				if (Number.isNaN(port) === false) return port;
			}
		} catch {
			// fall through
		}
		return 8787;
	}

	private static isAlive(pid: number): boolean {
		try {
			process.kill(pid, 0);
			return true;
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code === 'EPERM') return true;
			return false;
		}
	}

	private static readLogTail(maxLines: number): string {
		try {
			const content = Fs.readFileSync(LOG_FILE, 'utf8');
			const lines = content.split('\n');
			return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
		} catch {
			return '(log unavailable)';
		}
	}

	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
