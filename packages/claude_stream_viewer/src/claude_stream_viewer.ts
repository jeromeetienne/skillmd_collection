#!/usr/bin/env node

// Reads Claude API stream-json events line-by-line from stdin and pretty-prints
// them with colorized output. Designed to wrap an upstream `claude --stream-json`
// pipe, e.g. `claude … | npx claude_stream_viewer`.
// Usage:
//   claude --stream-json | npx claude_stream_viewer
//
// claude --output-format stream-json --verbose --include-partial-messages --permission-mode auto -p "explain quantum computing like I'm 5" | npx claude_stream_viewer


import Readline from 'node:readline';
import Fs from 'node:fs';
import * as Commander from 'commander';
import Chalk from 'chalk';
import Path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;

type CliOptions = {
	color: boolean;
	include?: string[];
	exclude?: string[];
};

type EventFilter = {
	include?: string[];
	exclude?: string[];
};

// Known event kinds the filter recognizes. Any `evt.type` from the stream_event
// envelope is also accepted as a kind (e.g. `message_start`, `message_stop`).
const KNOWN_EVENT_KINDS = ['text', 'tool_use', 'final_message', 'unknown'] as const;

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

type RenderFunction = () => void;

type ClassifiedEvent = {
	eventKind: string;
	renderFunction: RenderFunction;
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

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Classifies a raw Claude event from the stream according to its shape, returning an event kind and a render function that knows how to pretty-print it.
	 * 
	 * @param claudeEvent 
	 * @returns 
	 */
	static classifyEvent(claudeEvent: ClaudeEvent): ClassifiedEvent {
		// Newer SDKs wrap each event in a `stream_event` envelope.
		if (claudeEvent.type === 'stream_event' && claudeEvent.event !== undefined) {
			const event = claudeEvent.event;

			const deltaText = event.delta?.text;
			if (event.delta?.type === 'text_delta' && deltaText !== undefined && deltaText !== '') {
				return {
					eventKind: 'text',
					renderFunction: () => MainHelper.printText(deltaText),
				};
			}

			if (event.type === 'tool_use') {
				return {
					eventKind: 'tool_use',
					renderFunction: () => {
						MainHelper.printHeader('TOOL USE');
						MainHelper.printJSON(event);
					},
				};
			}

			// `content_block_delta` is the parent envelope of `text_delta` —
			// already rendered above, so skip it here to avoid duplicating
			// the text stream as a JSON dump.
			if (event.type !== undefined && event.type !== 'content_block_delta') {
				const subtype = event.type;
				return {
					eventKind: subtype,
					renderFunction: () => {
						MainHelper.printHeader(`EVENT: ${subtype}`);
						MainHelper.printJSON(event);
					},
				};
			}

			return { eventKind: 'content_block_delta', renderFunction: () => { } };
		}

		// Legacy format: pre-`stream_event` SDKs emit raw `message_delta`
		// events with the text delta hanging off the root.
		if (claudeEvent.type === 'message_delta') {
			const text = claudeEvent.delta?.text;
			if (text !== undefined && text !== '') {
				return {
					eventKind: 'text',
					renderFunction: () => MainHelper.printText(text),
				};
			}
		}

		// Final assistant message bundling all content blocks for the turn.
		const content = claudeEvent.message?.content;
		if (content !== undefined) {
			return {
				eventKind: 'final_message',
				renderFunction: () => {
					MainHelper.printHeader('FINAL MESSAGE');
					for (const block of content) {
						if (block.text !== undefined && block.text !== '') {
							console.log(colors.text(block.text));
						}
					}
				},
			};
		}

		return {
			eventKind: 'unknown',
			renderFunction: () => {
				MainHelper.printHeader('UNKNOWN EVENT');
				MainHelper.printJSON(claudeEvent);
			},
		};
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Determines whether an event of the given kind should be rendered according to the provided filter config.
	 * 
	 * @param eventKind 
	 * @param eventFilter 
	 * @returns 
	 */
	static shouldRenderKind(eventKind: string, eventFilter: EventFilter): boolean {
		if (eventFilter.include !== undefined && eventFilter.include.length > 0) {
			if (eventFilter.include.includes(eventKind) === false) return false;
		}
		if (eventFilter.exclude !== undefined && eventFilter.exclude.includes(eventKind)) {
			return false;
		}
		return true;
	}

	/**
	 * Classifies and renders a Claude event according to its shape and the provided filter config.
	 * 
	 * @param claudeEvent 
	 * @param eventFilter 
	 * @returns 
	 */
	static handleEvent(claudeEvent: ClaudeEvent, eventFilter: EventFilter) {
		try {
			// Classify the event to determine its kind and how to render it.
			const classifiedEvent: ClassifiedEvent = MainHelper.classifyEvent(claudeEvent);
			// If the event kind is unknown, still render it so the user can see the shape and add it to their filter config if desired.
			if (MainHelper.shouldRenderKind(classifiedEvent.eventKind, eventFilter) === false) return;
			// Render the event according to its classified kind and shape.
			classifiedEvent.renderFunction();
		} catch (err) {
			// Never let a single malformed event take down the stream — log and move on.
			console.error(colors.error('Error processing event:'), err);
			MainHelper.printJSON(claudeEvent);
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	function main
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {

	const packageJsonPath = Path.join(__dirname, '..', 'package.json');
	const packageJson: object = JSON.parse(await Fs.promises.readFile(packageJsonPath, 'utf-8'))
	const packageVersion = (packageJson as { version?: string }).version ?? 'unknown';

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	const parseList = (value: string): string[] =>
		value.split(',').map((s) => s.trim()).filter((s) => s !== '');

	const knownKindsHelp = `known kinds: ${KNOWN_EVENT_KINDS.join(', ')}, plus any stream_event subtype (e.g. message_start, message_stop, content_block_start)`;

	const program = new Commander.Command();
	program
		.name('claude_stream_viewer')
		.description('Pretty-prints Claude API stream-json events from stdin with colorized output.')
		.version(packageVersion)
		.option('--no-color', 'disable colored output')
		.option('--include <kinds>', `comma-separated event kinds to show (whitelist). ${knownKindsHelp}`, parseList)
		.option('--exclude <kinds>', `comma-separated event kinds to hide (blacklist). ${knownKindsHelp}`, parseList)
		.parse(process.argv);

	const options = program.opts<CliOptions>();
	const filter: EventFilter = {
		include: options.include,
		exclude: options.exclude,
	};
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

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
			MainHelper.handleEvent(parsed, filter);
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
