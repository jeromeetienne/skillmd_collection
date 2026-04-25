#!/usr/bin/env node

// node imports
import Path from 'node:path';

// npm imports
import { Command } from 'commander';
import express from 'express';

// local imports
import { McpMyClient } from '../fastbrowser_mcp/libs/mcp_client.js';
import { Routes } from './libs/routes.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	static async commandStart({
		port,
		verbose = false,
	}: {
		port: number;
		verbose?: boolean;
	}): Promise<void> {
		// Spawn fastbrowser-mcp as a subprocess and hold a persistent MCP client to it.
		const fastbrowserMcpEntry = Path.resolve(__dirname, '..', 'fastbrowser_mcp', 'fastbrowser_mcp.js');
		const mcpClient = new McpMyClient({
			name: 'fastbrowser-httpd',
			version: '1.0.0',
			mcpTarget: 'chrome_devtools',
			transport: {
				type: 'stdio',
				command: process.execPath,
				args: [fastbrowserMcpEntry, 'mcp_server'],
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
		Routes.register(app, mcpClient);

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
		.action(async (opts: { port: string; verbose?: boolean }) => {
			const port = Number.parseInt(opts.port, 10);
			if (Number.isNaN(port) === true) {
				console.error(`Invalid --port: ${opts.port}`);
				process.exit(1);
			}
			await MainHelper.commandStart({ port, verbose: opts.verbose });
		});

	await program.parseAsync(process.argv);
}

void main();
