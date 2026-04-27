#!/usr/bin/env node

// node imports
import Path from 'node:path';

// npm imports
import { Command, Option } from 'commander';
import express from 'express';

// local imports
import { McpMyClient } from '../fastbrowser_mcp/libs/mcp_my_client.js';
import type { FastBrowserMcpTarget } from '../fastbrowser_mcp/fastbrowser_types.js';
import { Routes } from './libs/routes.js';


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	static async commandStart({
		port,
		mcpTarget,
		verbose = false,
	}: {
		port: number;
		mcpTarget: FastBrowserMcpTarget;
		verbose?: boolean;
	}): Promise<void> {
		// Spawn fastbrowser-mcp as a subprocess and hold a persistent MCP client to it.
		const fastbrowserMcpEntry = Path.resolve(import.meta.dirname, '..', 'fastbrowser_mcp', 'fastbrowser_mcp.js');
		let mcpServerCommand = process.execPath;
		let mcpServerArgs = [fastbrowserMcpEntry, 'mcp_server', '--mcp_target', mcpTarget];
		// trick to work without being in `./dist'
		if (fastbrowserMcpEntry.includes('/dist/') === false) {
			mcpServerCommand = '/usr/local/bin/npx';
			mcpServerArgs[0] = mcpServerArgs[0].replace(/\.js$/, '.ts');
			mcpServerArgs = ['tsx', ...mcpServerArgs];
		}

		const mcpClient = new McpMyClient({
			name: 'fastbrowser-httpd',
			version: '1.0.0',
			mcpTarget,
			transport: {
				type: 'stdio',
				command: mcpServerCommand,
				args: mcpServerArgs,
			},
		});

		console.error('Connecting to fastbrowser-mcp ...');
		await mcpClient.connect();
		console.error('MCP client connected');

		if (verbose) {
			const tools = await mcpClient.listTools();
			console.error('Tools available in fastbrowser-mcp:');
			for (const tool of tools) {
				console.error(`- ${tool.name}`);
			}
		}

		const app = express();
		app.use(express.json({ limit: '2mb' }));
		Routes.register(app, mcpClient, mcpTarget);

		const server = app.listen(port, () => {
			console.error(`fastbrowser-httpd listening on http://localhost:${port}`);
		});

		const shutdown = async (signal: string): Promise<void> => {
			console.error(`Received ${signal}, shutting down ...`);
			server.close();
			await mcpClient.close();
			process.exit(0);
		};
		process.on('SIGINT', () => { void shutdown('SIGINT'); });
		process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
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
		.name('fastbrowser-httpd')
		.description('Persistent HTTP server fronting fastbrowser-mcp')
		.option('-p, --port <number>', 'Port to listen on', '8787')
		.option('-v, --verbose', 'Enable verbose logging')
		.addOption(
			new Option('--mcp-target <target>', 'browser backend (default: $FASTBROWSER_MCP_TARGET or playwright)')
				.choices(['chrome_devtools', 'playwright'])
				.default(process.env.FASTBROWSER_MCP_TARGET ?? 'playwright'),
		)
		.action(async (opts: { port: string; verbose?: boolean; mcpTarget: FastBrowserMcpTarget }) => {
			const port = Number.parseInt(opts.port, 10);
			if (Number.isNaN(port) === true) {
				console.error(`Invalid --port: ${opts.port}`);
				process.exit(1);
			}
			await MainHelper.commandStart({ port, mcpTarget: opts.mcpTarget, verbose: opts.verbose });
		});

	await program.parseAsync(process.argv);
}

void main();
