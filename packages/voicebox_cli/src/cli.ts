#!/usr/bin/env node
import * as Commander from 'commander';
import { CommandHealth } from './commands/health.js';

const DEFAULT_BASE_URL = 'http://localhost:17493';

const program = new Commander.Command();

program
	.name('voicebox-cli')
	.description('CLI for the Voicebox REST API')
	.version('1.0.0');

program
	.command('health')
	.description('Check the Voicebox server health endpoint')
	.option('--base-url <url>', 'Base URL of the Voicebox server', process.env['VOICEBOX_BASE_URL'] ?? DEFAULT_BASE_URL)
	.action(async (options: { baseUrl: string }) => {
		try {
			await CommandHealth.run({ baseUrl: options.baseUrl });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			process.stderr.write(`Error: ${message}\n`);
			process.exit(1);
		}
	});

program.parseAsync(process.argv);
