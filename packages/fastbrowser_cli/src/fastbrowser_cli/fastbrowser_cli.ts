#!/usr/bin/env node

import Fs from 'node:fs';
import Path from 'node:path';

import { Command, CommanderError, Option } from 'commander';
import stringArgv from 'string-argv';

import { HttpClient } from './libs/http-client.js';
import { ServerManager } from './libs/server-manager.js';
import { QueryBuilder } from './libs/query-builder.js';
import type { FastBrowserMcpTarget } from '../fastbrowser_mcp/fastbrowser_types.js';

///////////////////////////////////////////////////////////////////////////////

type GlobalOpts = {
	server?: string;
	autostart?: boolean;
	mcpTarget?: FastBrowserMcpTarget;
};

class SilentExitError extends Error {
	constructor() {
		super('silent-exit');
	}
}

///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	/**
	 * Get the server URL from the command options, environment variable, or default
	 * @param cmd 
	 * @returns 
	 */
	static getServerUrlFromCmd(cmd: Command): string {
		const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
		return HttpClient.getServerUrl(globalOpts.server);
	}

	/**
	 * Determine whether to auto-start the server based on command options (default: true)
	 * @param cmd
	 * @returns
	 */
	static getAutostartFromCmd(cmd: Command): boolean {
		const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
		return globalOpts.autostart !== false;
	}

	static getMcpTargetFromCmd(cmd: Command): FastBrowserMcpTarget {
		const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
		return globalOpts.mcpTarget ?? 'playwright';
	}

	/**
	 * Run a tool by making an HTTP request to the server, with optional auto-start
	 * @param cmd
	 * @param routeName
	 * @param body
	 */
	static async runTool(cmd: Command, routeName: string, body: unknown): Promise<void> {
		const server = MainHelper.getServerUrlFromCmd(cmd);
		const mcpTarget = MainHelper.getMcpTargetFromCmd(cmd);
		if (MainHelper.getAutostartFromCmd(cmd) === true) {
			await ServerManager.ensureRunning(server, mcpTarget);
		}
		const response = await HttpClient.postTool(server, routeName, body);
		HttpClient.printResponse(response);
	}

	static readPackageVersion(): string {
		const packageJsonPath = Path.resolve(import.meta.dirname, '../../package.json');
		const raw = Fs.readFileSync(packageJsonPath, 'utf-8');
		const parsed = JSON.parse(raw) as { version?: string };
		if (typeof parsed.version !== 'string') {
			throw new Error(`fastbrowser-cli: missing "version" in ${packageJsonPath}`);
		}
		return parsed.version;
	}

	static async runInstall(skillFolder: string): Promise<void> {
		const sourceSkillsDir = Path.resolve(import.meta.dirname, '../../skills');
		const targetSkillsDir = Path.resolve(skillFolder, 'skills');
		try {
			const entries = await Fs.promises.readdir(sourceSkillsDir, { withFileTypes: true });
			const skillDirs = entries.filter((entry) => entry.isDirectory() === true);
			if (skillDirs.length === 0) {
				console.error(`fastbrowser-cli error: no skills found in ${sourceSkillsDir}`);
				process.exit(1);
			}
			for (const skillDir of skillDirs) {
				const sourceDir = Path.join(sourceSkillsDir, skillDir.name);
				const targetDir = Path.join(targetSkillsDir, skillDir.name);
				await Fs.promises.cp(sourceDir, targetDir, { recursive: true });
				console.log(`Installed ${skillDir.name} skill at ${targetDir}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`fastbrowser-cli error: ${message}`);
			process.exit(1);
		}
	}

	static async readBatchSource(file: string | undefined, inlineScript: string | undefined): Promise<string> {
		if (inlineScript !== undefined && inlineScript !== '') {
			return inlineScript;
		}
		if (file !== undefined && file !== '') {
			return await Fs.promises.readFile(file, 'utf-8');
		}
		if (process.stdin.isTTY === true) {
			throw new Error('batch: no input. Provide a file path, --script, or pipe commands on stdin.');
		}
		return await MainHelper.readStdinToString();
	}

	static async readStdinToString(): Promise<string> {
		const chunks: Buffer[] = [];
		return await new Promise((resolve, reject) => {
			process.stdin.on('data', (chunk) => chunks.push(chunk as Buffer));
			process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
			process.stdin.on('error', (err) => reject(err));
		});
	}

	static async runBatch(program: Command, source: string, stopOnError: boolean, batchCmd: Command): Promise<void> {
		const globalOpts = batchCmd.optsWithGlobals<GlobalOpts>();
		const globalFlags: string[] = [];
		if (globalOpts.server !== undefined) {
			globalFlags.push('--server', globalOpts.server);
		}
		if (globalOpts.autostart === false) {
			globalFlags.push('--no-autostart');
		}
		if (globalOpts.mcpTarget !== undefined) {
			globalFlags.push('--mcp-target', globalOpts.mcpTarget);
		}

		const lines = source.split('\n');
		let ok = 0;
		let failed = 0;
		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (line === '' || line.startsWith('#') === true) continue;

			const argv = stringArgv(line);
			if (argv.length === 0) continue;

			console.log(`> ${line}`);
			try {
				await program.parseAsync([...globalFlags, ...argv], { from: 'user' });
				ok += 1;
			} catch (err) {
				failed += 1;
				if (err instanceof SilentExitError === false && err instanceof CommanderError === false) {
					const message = err instanceof Error ? err.message : String(err);
					console.error(`fastbrowser-cli error: ${message}`);
				}
				if (stopOnError === true) {
					throw new SilentExitError();
				}
			}
		}

		if (stopOnError === false) {
			console.log(`batch: ${ok} ok, ${failed} failed`);
		}
		if (failed > 0) {
			throw new SilentExitError();
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const program = new Command();
	program
		.name('fastbrowser-cli')
		.description('CLI client for fastbrowser')
		.version(MainHelper.readPackageVersion(), '-V, --version', 'Print the fastbrowser-cli version')
		.option('--server <url>', 'fastbrowser-httpd URL (default: env FASTBROWSER_SERVER or http://localhost:8787)')
		.option('--autostart', 'Auto-start the server before a command if it is not running', true)
		.option('--no-autostart', 'Do not auto-start the server before a command')
		.addOption(
			new Option('--mcp-target <target>', 'browser backend (default: $FASTBROWSER_MCP_TARGET or playwright)')
				.choices(['chrome_devtools', 'playwright'])
				.default(process.env.FASTBROWSER_MCP_TARGET ?? 'playwright'),
		);

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	const serverCmd = program
		.command('server')
		.description('Manage the fastbrowser HTTP server');

	serverCmd
		.command('start')
		.description('Start the fastbrowser HTTP server as a detached daemon')
		.action(async (_opts, cmd: Command) => {
			const serverUrl = MainHelper.getServerUrlFromCmd(cmd);
			const mcpTarget = MainHelper.getMcpTargetFromCmd(cmd);
			await ServerManager.start(serverUrl, mcpTarget);
		});

	serverCmd
		.command('stop')
		.description('Stop the fastbrowser HTTP server')
		.action(async (_opts, cmd: Command) => {
			const serverUrl = MainHelper.getServerUrlFromCmd(cmd);
			await ServerManager.stop(serverUrl);
		});

	serverCmd
		.command('status')
		.description('Report whether the fastbrowser HTTP server is running')
		.action(async (_opts, cmd: Command) => {
			const serverUrl = MainHelper.getServerUrlFromCmd(cmd);
			const serverStatus = await ServerManager.status(serverUrl);
			const targetSuffix = serverStatus.mcpTarget !== undefined ? ` (mcpTarget=${serverStatus.mcpTarget})` : '';
			console.log(`fastbrowser server at ${serverUrl}: ${serverStatus.state}${targetSuffix}`);
		});

	serverCmd
		.command('restart')
		.description('Restart the fastbrowser HTTP server')
		.action(async (_opts, cmd: Command) => {
			const serverUrl = MainHelper.getServerUrlFromCmd(cmd);
			const mcpTarget = MainHelper.getMcpTargetFromCmd(cmd);
			await ServerManager.stop(serverUrl);
			await ServerManager.start(serverUrl, mcpTarget);
		});
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	program
		.command('list_pages')
		.description('List all open browser pages')
		.action(async (_opts, cmd: Command) => {
			await MainHelper.runTool(cmd, 'list_pages', {});
		});

	program
		.command('new_page')
		.description('Open a new browser page')
		.requiredOption('--url <url>', 'URL to open')
		.action(async (opts: { url: string }, cmd: Command) => {
			await MainHelper.runTool(cmd, 'new_page', { url: opts.url });
		});

	program
		.command('close_page')
		.description('Close a page by its id')
		.requiredOption('--page-id <number>', 'The page id to close')
		.action(async (opts: { pageId: string }, cmd: Command) => {
			const pageId = Number.parseInt(opts.pageId, 10);
			if (Number.isNaN(pageId) === true) {
				throw new Error(`Invalid --page-id: ${opts.pageId}`);
			}
			await MainHelper.runTool(cmd, 'close_page', { pageId });
		});

	program
		.command('navigate_page')
		.description('Navigate the current page to a URL')
		.requiredOption('--url <url>', 'URL to navigate to')
		.action(async (opts: { url: string }, cmd: Command) => {
			await MainHelper.runTool(cmd, 'navigate_page', { url: opts.url });
		});

	program
		.command('click')
		.description('Click an element by its accessibility selector')
		.requiredOption('-s, --selector <selector>', 'Accessibility selector (e.g. "#1_3" or \'button[name="Submit"]\')')
		.action(async (opts: { selector: string }, cmd: Command) => {
			await MainHelper.runTool(cmd, 'click', { selector: opts.selector });
		});

	program
		.command('fill_form')
		.description('Fill a form field by its accessibility selector')
		.requiredOption('-s, --selector <selector>', 'Accessibility selector (e.g. "#1_3" or \'textbox[name="Email"]\')')
		.requiredOption('-v, --value <value>', 'Value to fill')
		.action(async (opts: { selector: string; value: string }, cmd: Command) => {
			await MainHelper.runTool(cmd, 'fill_form', {
				elements: [{ selector: opts.selector, value: opts.value }],
			});
		});

	program
		.command('query_selectors_all')
		.description('Query the accessibility tree with CSS-like selectors')
		.option('-s, --selector <selector>', 'CSS-like selector (repeatable)', (value: string, prev: string[] = []) => {
			prev.push(value);
			return prev;
		})
		.option('--limit <number>', 'Max nodes per selector (0 = unlimited)', '0')
		.option('--with-ancestors', 'Include ancestor nodes', false)
		.option('--no-with-ancestors', 'Exclude ancestor nodes')
		.option('--selectors-json <json>', 'JSON array of {selector,limit,withAncestors} for per-selector control')
		.action(async (opts: {
			selector?: string[];
			limit?: string;
			withAncestors?: boolean;
			selectorsJson?: string;
		}, cmd: Command) => {
			const body = QueryBuilder.buildQuerySelectorsBody(opts);
			await MainHelper.runTool(cmd, 'query_selectors_all', body);
		});

	program
		.command('query_selectors')
		.description('Query the accessibility tree with CSS-like selectors and, for each, return the first matching node')
		.option('-s, --selector <selector>', 'CSS-like selector (repeatable)', (value: string, prev: string[] = []) => {
			prev.push(value);
			return prev;
		})
		.option('--with-ancestors', 'Include ancestor nodes', false)
		.option('--no-with-ancestors', 'Exclude ancestor nodes')
		.option('--selectors-json <json>', 'JSON array of {selector,withAncestors} for per-selector control')
		.action(async (opts: {
			selector?: string[];
			withAncestors?: boolean;
			selectorsJson?: string;
		}, cmd: Command) => {
			const body = QueryBuilder.buildQuerySelectorFirstBody(opts);
			await MainHelper.runTool(cmd, 'query_selectors', body);
		});

	program
		.command('take_snapshot')
		.description('Take an accessibility-tree snapshot of the current page')
		.action(async (_opts, cmd: Command) => {
			await MainHelper.runTool(cmd, 'take_snapshot', {});
		});

	program
		.command('press_keys')
		.description('Press a sequence of keys')
		.requiredOption('--keys <keys>', "Comma-separated keys. E.g. 'Hello, Tab, Enter'")
		.action(async (opts: { keys: string }, cmd: Command) => {
			await MainHelper.runTool(cmd, 'press_keys', { keys: opts.keys });
		});

	program
		.command('install [skill-folder]')
		.description('Install all bundled skills into <skill-folder>/skills/ (default: .)')
		.action(async (skillFolder: string | undefined) => {
			await MainHelper.runInstall(skillFolder ?? '.');
		});

	program
		.command('batch [file]')
		.description('Run multiple commands from a file, piped stdin, or an inline --script string (one command per line, # comments allowed)')
		.option('--script <script>', 'Inline multi-line script (overrides [file] and stdin)')
		.option('--no-stop-on-error', 'Continue running subsequent lines after a failure (default: stop on first error)')
		.action(async (file: string | undefined, opts: { script?: string; stopOnError: boolean }, cmd: Command) => {
			const source = await MainHelper.readBatchSource(file, opts.script);
			await MainHelper.runBatch(program, source, opts.stopOnError !== false, cmd);
		});

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	await program.parseAsync();
}

void main();
