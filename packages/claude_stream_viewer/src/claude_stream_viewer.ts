#!/usr/bin/env node

// Reads Claude API stream-json events line-by-line from stdin and pretty-prints
// them with colorized output. Designed to wrap an upstream `claude --stream-json`
// pipe, e.g. `claude … | claude_stream_viewer`.

import readline from 'node:readline';
import chalk from 'chalk';

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
	text: chalk.white,
	tool: chalk.cyan,
	system: chalk.gray,
	error: chalk.red,
	json: chalk.dim,
	header: chalk.yellow.bold,
};

function printText(text: string) {
	process.stdout.write(colors.text(text));
}

function printNewline() {
	process.stdout.write('\n');
}

function printHeader(label: string) {
	printNewline();
	console.log(colors.header(`\n=== ${label} ===`));
}

function printJSON(obj: unknown) {
	console.log(colors.json(JSON.stringify(obj, null, 2)));
}

function handleEvent(data: ClaudeEvent) {
	try {
		// Newer SDKs wrap each event in a `stream_event` envelope.
		if (data.type === 'stream_event' && data.event) {
			const evt = data.event;

			if (evt.delta?.type === 'text_delta' && evt.delta.text) {
				printText(evt.delta.text);
				return;
			}

			if (evt.type === 'tool_use') {
				printHeader('TOOL USE');
				printJSON(evt);
				return;
			}

			// `content_block_delta` is the parent envelope of `text_delta` —
			// already rendered above, so skip it here to avoid duplicating
			// the text stream as a JSON dump.
			if (evt.type && evt.type !== 'content_block_delta') {
				printHeader(`EVENT: ${evt.type}`);
				printJSON(evt);
				return;
			}
		}

		// Legacy format: pre-`stream_event` SDKs emit raw `message_delta`
		// events with the text delta hanging off the root.
		if (data.type === 'message_delta') {
			const text = data.delta?.text;
			if (text) {
				printText(text);
				return;
			}
		}

		// Final assistant message bundling all content blocks for the turn.
		if (data.message?.content) {
			printHeader('FINAL MESSAGE');
			for (const block of data.message.content) {
				if (block.text) {
					console.log(colors.text(block.text));
				}
			}
			return;
		}

		// Unrecognized shape — dump it raw so the user can extend ClaudeEvent.
		printHeader('UNKNOWN EVENT');
		printJSON(data);
	} catch (err) {
		// Never let a single malformed event take down the stream — log and move on.
		console.error(colors.error('Error processing event:'), err);
		printJSON(data);
	}
}

const rl = readline.createInterface({
	input: process.stdin,
	crlfDelay: Infinity,
});

rl.on('line', (line) => {
	// stream-json pipes occasionally pad with blank lines between events.
	if (line.trim() === '') return;

	try {
		const parsed = JSON.parse(line);
		handleEvent(parsed);
	} catch (err) {
		console.error(colors.error('Invalid JSON:'), line);
	}
});

rl.on('close', () => {
	printNewline();
	console.log(colors.system('\n[stream ended]'));
});
