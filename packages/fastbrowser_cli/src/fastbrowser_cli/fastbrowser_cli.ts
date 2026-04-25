#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { Command, CommanderError } from 'commander';
import stringArgv from 'string-argv';

import { HttpClient } from './libs/http-client.js';
import { ServerManager } from './libs/server-manager.js';
import type { QuerySelectorInput, QuerySelectorFirstInput, QuerySelectorsAllRequest, QuerySelectorRequest } from '../fastbrowser_httpd/libs/tool-schemas.js';

///////////////////////////////////////////////////////////////////////////////

type GlobalOpts = {
	server?: string;
	autostart?: boolean;
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

	/**
	 * Run a tool by making an HTTP request to the server, with optional auto-start
	 * @param cmd 
	 * @param routeName 
	 * @param body 
	 */
	static async runTool(cmd: Command, routeName: string, body: unknown): Promise<void> {
		const server = MainHelper.getServerUrlFromCmd(cmd);
		if (MainHelper.getAutostartFromCmd(cmd) === true) {
			await ServerManager.ensureRunning(server);
		}
		const response = await HttpClient.postTool(server, routeName, body);
		HttpClient.printResponse(response);
	}

	static buildQuerySelectorsBody(opts: {
		selector?: string[];
		limit?: string;
		withAncestors?: boolean;
		selectorsJson?: string;
	}): QuerySelectorsAllRequest {
		if (opts.selectorsJson !== undefined && opts.selectorsJson !== '') {
			let parsed: unknown;
			try {
				parsed = JSON.parse(opts.selectorsJson);
			} catch (err) {
				throw new Error(`--selectors-json is not valid JSON: ${(err as Error).message}`);
			}
			if (Array.isArray(parsed) === false) {
				throw new Error('--selectors-json must be a JSON array');
			}
			return { selectors: parsed as QuerySelectorInput[] };
		}

		const selectorList = opts.selector ?? [];
		if (selectorList.length === 0) {
			throw new Error('At least one --selector or --selectors-json is required');
		}

		const limit = opts.limit === undefined ? 0 : Number.parseInt(opts.limit, 10);
		if (Number.isNaN(limit) === true) {
			throw new Error(`Invalid --limit: ${opts.limit}`);
		}
		const withAncestors = opts.withAncestors !== false;

		const selectors: QuerySelectorInput[] = selectorList.map((selector) => ({
			selector,
			limit,
			withAncestors,
		}));
		return { selectors };
	}

	static buildQuerySelectorFirstBody(opts: {
		selector?: string[];
		withAncestors?: boolean;
		selectorsJson?: string;
	}): QuerySelectorRequest {
		if (opts.selectorsJson !== undefined && opts.selectorsJson !== '') {
			let parsed: unknown;
			try {
				parsed = JSON.parse(opts.selectorsJson);
			} catch (err) {
				throw new Error(`--selectors-json is not valid JSON: ${(err as Error).message}`);
			}
			if (Array.isArray(parsed) === false) {
				throw new Error('--selectors-json must be a JSON array');
			}
			return { selectors: parsed as QuerySelectorFirstInput[] };
		}

		const selectorList = opts.selector ?? [];
		if (selectorList.length === 0) {
			throw new Error('At least one --selector or --selectors-json is required');
		}

		const withAncestors = opts.withAncestors !== false;

		const selectors: QuerySelectorFirstInput[] = selectorList.map((selector) => ({
			selector,
			withAncestors,
		}));
		return { selectors };
	}

	static async runInstall(skillFolder: string): Promise<void> {
		const sourceSkillMd = path.resolve(__dirname, '../../skills/fastbrowser/SKILL.md');
		const targetDir = path.resolve(skillFolder, 'skills', 'fastbrowser');
		const targetSkillMd = path.join(targetDir, 'SKILL.md');
		try {
			await fs.promises.mkdir(targetDir, { recursive: true });
			await fs.promises.copyFile(sourceSkillMd, targetSkillMd);
			console.log(`Installed fastbrowser SKILL.md at ${targetSkillMd}`);
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
			return await fs.promises.readFile(file, 'utf-8');
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
		.option('--server <url>', 'fastbrowser-httpd URL (default: env FASTBROWSER_SERVER or http://localhost:8787)')
		.option('--autostart', 'Auto-start the server before a command if it is not running', true)
		.option('--no-autostart', 'Do not auto-start the server before a command');

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
			await ServerManager.start(serverUrl);
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
			console.log(`fastbrowser server at ${serverUrl}: ${serverStatus}`);
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
		.option('--with-ancestors', 'Include ancestor nodes', true)
		.option('--no-with-ancestors', 'Exclude ancestor nodes')
		.option('--selectors-json <json>', 'JSON array of {selector,limit,withAncestors} for per-selector control')
		.action(async (opts: {
			selector?: string[];
			limit?: string;
			withAncestors?: boolean;
			selectorsJson?: string;
		}, cmd: Command) => {
			const body = MainHelper.buildQuerySelectorsBody(opts);
			await MainHelper.runTool(cmd, 'query_selectors_all', body);
		});

	program
		.command('query_selectors')
		.description('Query the accessibility tree with CSS-like selectors and, for each, return the first matching node')
		.option('-s, --selector <selector>', 'CSS-like selector (repeatable)', (value: string, prev: string[] = []) => {
			prev.push(value);
			return prev;
		})
		.option('--with-ancestors', 'Include ancestor nodes', true)
		.option('--no-with-ancestors', 'Exclude ancestor nodes')
		.option('--selectors-json <json>', 'JSON array of {selector,withAncestors} for per-selector control')
		.action(async (opts: {
			selector?: string[];
			withAncestors?: boolean;
			selectorsJson?: string;
		}, cmd: Command) => {
			const body = MainHelper.buildQuerySelectorFirstBody(opts);
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
		.description('Install SKILL.md into <skill-folder>/skills/fastbrowser (default: .)')
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
