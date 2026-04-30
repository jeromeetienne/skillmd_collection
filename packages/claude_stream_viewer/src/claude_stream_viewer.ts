#!/usr/bin/env node

// Reads Claude API stream-json events line-by-line from stdin and pretty-prints
// them with colorized output. Designed to wrap an upstream `claude --stream-json`
// pipe, e.g. `claude … | claude_stream_viewer`.

import Readline from 'node:readline';
import { Command } from 'commander';
import Chalk from 'chalk';

type CliOptions = {
	color: boolean;
};

// Partial typing on purpose: stream-json's shape varies across SDK versions and
// event subtypes, and we only consume the few fields we render. Anything we
// don't recognize falls through to the UNKNOWN EVENT branch so the user can
// extend this type incrementally as new shapes show up.
type ClaudeEvent = {
	type?: string;
	event?: {
		type?: string;
		delta?: {
			type?: string;
			text?: string;
		};
	};
	// Legacy `message_delta` format places the text delta one level higher,
	// directly on the root event rather than inside `event.delta`.
	delta?: {
		text?: string;
	};
	message?: {
		content?: Array<{ type?: string; text?: string }>;
	};
};

const colors = {
	text: Chalk.white,
	tool: Chalk.cyan,
	system: Chalk.gray,
	error: Chalk.red,
	json: Chalk.dim,
	header: Chalk.yellow.bold,
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	class MainHelper
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	static parseCliOptions(): CliOptions {
		const program = new Command();
		program
			.name('claude_stream_viewer')
			.description('Pretty-prints Claude API stream-json events from stdin with colorized output.')
			.version('1.0.9')
			.option('--no-color', 'disable colored output')
			.parse(process.argv);

		return program.opts<CliOptions>();
	}

	static printText(text: string) {
		process.stdout.write(colors.text(text));
	}

	static printNewline() {
		process.stdout.write('\n');
	}

	static printHeader(label: string) {
		MainHelper.printNewline();
		console.log(colors.header(`\n=== ${label} ===`));
	}

	static printJSON(obj: unknown) {
		console.log(colors.json(JSON.stringify(obj, null, 2)));
	}

	static handleEvent(data: ClaudeEvent) {
		try {
			// Newer SDKs wrap each event in a `stream_event` envelope.
			if (data.type === 'stream_event' && data.event) {
				const evt = data.event;

				if (evt.delta?.type === 'text_delta' && evt.delta.text) {
					MainHelper.printText(evt.delta.text);
					return;
				}

				if (evt.type === 'tool_use') {
					MainHelper.printHeader('TOOL USE');
					MainHelper.printJSON(evt);
					return;
				}

				// `content_block_delta` is the parent envelope of `text_delta` —
				// already rendered above, so skip it here to avoid duplicating
				// the text stream as a JSON dump.
				if (evt.type && evt.type !== 'content_block_delta') {
					MainHelper.printHeader(`EVENT: ${evt.type}`);
					MainHelper.printJSON(evt);
					return;
				}
			}

			// Legacy format: pre-`stream_event` SDKs emit raw `message_delta`
			// events with the text delta hanging off the root.
			if (data.type === 'message_delta') {
				const text = data.delta?.text;
				if (text) {
					MainHelper.printText(text);
					return;
				}
			}

			// Final assistant message bundling all content blocks for the turn.
			if (data.message?.content) {
				MainHelper.printHeader('FINAL MESSAGE');
				for (const block of data.message.content) {
					if (block.text) {
						console.log(colors.text(block.text));
					}
				}
				return;
			}

			// Unrecognized shape — dump it raw so the user can extend ClaudeEvent.
			MainHelper.printHeader('UNKNOWN EVENT');
			MainHelper.printJSON(data);
		} catch (err) {
			// Never let a single malformed event take down the stream — log and move on.
			console.error(colors.error('Error processing event:'), err);
			MainHelper.printJSON(data);
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	function main
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const options = MainHelper.parseCliOptions();
	if (options.color === false) {
		Chalk.level = 0;
	}

	const readline = Readline.createInterface({
		input: process.stdin,
		crlfDelay: Infinity,
	});

	readline.on('line', (line) => {
		// stream-json pipes occasionally pad with blank lines between events.
		if (line.trim() === '') return;

		try {
			const parsed = JSON.parse(line);
			MainHelper.handleEvent(parsed);
		} catch (err) {
			console.error(colors.error('Invalid JSON:'), line);
		}
	});

	await new Promise<void>((resolve) => {
		readline.on('close', () => {
			MainHelper.printNewline();
			console.log(colors.system('\n[stream ended]'));
			resolve();
		});
	});
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

await main();
