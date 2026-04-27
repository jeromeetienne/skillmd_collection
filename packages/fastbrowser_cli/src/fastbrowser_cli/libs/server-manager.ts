// node imports
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { spawn } from 'node:child_process';

// local imports
import type { FastBrowserMcpTarget } from '../../fastbrowser_mcp/fastbrowser_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type PidFile = {
	pid: number;
	port: number;
	mcpTarget?: FastBrowserMcpTarget;
	startedAt: string;
};

export type ServerStatus = {
	state: 'running' | 'stopped';
	mcpTarget?: FastBrowserMcpTarget;
};

const STATE_DIRNAME = Path.join(Os.homedir(), '.fastbrowser_cli');
const PID_FILENAME = Path.join(STATE_DIRNAME, 'server.json');
const LOG_FILENAME = Path.join(STATE_DIRNAME, 'server.log');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class ServerManager {
	static async status(serverUrl: string): Promise<ServerStatus> {
		const base = serverUrl.replace(/\/+$/, '');
		try {
			const response = await fetch(`${base}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(500),
			});
			if (response.ok === false) return { state: 'stopped' };
			const payload = await response.json() as { ok?: unknown; mcpTarget?: unknown };
			if (payload.ok !== true) return { state: 'stopped' };
			const mcpTarget = payload.mcpTarget === 'chrome_devtools' || payload.mcpTarget === 'playwright'
				? payload.mcpTarget
				: undefined;
			return { state: 'running', mcpTarget };
		} catch {
			return { state: 'stopped' };
		}
	}

	static async ensureRunning(serverUrl: string, mcpTarget: FastBrowserMcpTarget): Promise<void> {
		const info = await ServerManager.status(serverUrl);
		if (info.state === 'running') {
			if (info.mcpTarget !== undefined && info.mcpTarget !== mcpTarget) {
				throw new Error(
					`fastbrowser server already running with mcpTarget=${info.mcpTarget}. ` +
					`To switch to ${mcpTarget}, run: fastbrowser-cli --mcp-target ${mcpTarget} server restart`,
				);
			}
			return;
		}

		if (ServerManager.isLocalUrl(serverUrl) === false) {
			throw new Error(`fastbrowser server at ${serverUrl} is not reachable and cannot be auto-started (non-local URL)`);
		}
		await ServerManager.start(serverUrl, mcpTarget);
	}

	static async start(serverUrl: string, mcpTarget: FastBrowserMcpTarget): Promise<void> {
		const existing = await ServerManager.status(serverUrl);
		if (existing.state === 'running') {
			if (existing.mcpTarget !== undefined && existing.mcpTarget !== mcpTarget) {
				throw new Error(
					`fastbrowser server already running with mcpTarget=${existing.mcpTarget}. ` +
					`Stop it first: fastbrowser-cli server stop`,
				);
			}
			console.error(`fastbrowser server already running at ${serverUrl}`);
			return;
		}

		if (ServerManager.isLocalUrl(serverUrl) === false) {
			throw new Error(`Refusing to start: ${serverUrl} is not a local URL`);
		}

		// debugger
		let entryPath = Path.resolve(import.meta.dirname, '..', '..', 'fastbrowser_httpd', 'fastbrowser_httpd.js');
		const port = ServerManager.parsePort(serverUrl);
		let spawnCommand = process.execPath;
		let spawnArgs = [entryPath, '--port', String(port), '--mcp-target', mcpTarget]
		// trick to work without being in `./dist'
		if (entryPath.includes('/dist/') === false) {
			spawnCommand = '/usr/local/bin/npx';
			spawnArgs[0] = spawnArgs[0].replace(/\.js$/, '.ts');
			spawnArgs = ['tsx', ...spawnArgs];
		}
		const packageRoot = Path.resolve(import.meta.dirname, '..', '..', '..');

		Fs.mkdirSync(STATE_DIRNAME, { recursive: true });
		const logFd = Fs.openSync(LOG_FILENAME, 'a');

		const child = spawn(spawnCommand, spawnArgs, {
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
			mcpTarget,
			startedAt: new Date().toISOString(),
		};
		Fs.writeFileSync(PID_FILENAME, JSON.stringify(pidFile, null, 2));

		const deadline = Date.now() + 10_000;
		while (Date.now() < deadline) {
			const info = await ServerManager.status(serverUrl);
			if (info.state === 'running') {
				Fs.closeSync(logFd);
				console.error(`fastbrowser server started (pid=${pid}, port=${port}, mcpTarget=${mcpTarget})`);
				return;
			}
			await ServerManager.sleep(500);
		}

		Fs.closeSync(logFd);
		const tail = ServerManager.readLogTail(50);
		throw new Error(`fastbrowser server did not become healthy within 10s. Log tail:\n${tail}`);
	}

	static async stop(serverUrl: string): Promise<void> {
		if (Fs.existsSync(PID_FILENAME) === false) {
			console.error('no server pid file; nothing to stop');
			return;
		}

		let pidFile: PidFile;
		try {
			const raw = Fs.readFileSync(PID_FILENAME, 'utf8');
			pidFile = JSON.parse(raw) as PidFile;
		} catch (err) {
			throw new Error(`Failed to read pid file ${PID_FILENAME}: ${(err as Error).message}`);
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
			Fs.unlinkSync(PID_FILENAME);
		} catch {
			// best effort
		}

		// Best-effort: ensure the HTTP server is actually down from the caller's perspective.
		const info = await ServerManager.status(serverUrl);
		if (info.state === 'running') {
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
			const content = Fs.readFileSync(LOG_FILENAME, 'utf8');
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
