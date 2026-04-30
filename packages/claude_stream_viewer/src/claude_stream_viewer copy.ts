#!/usr/bin/env node

// Reads Claude Code stream-json events line-by-line from stdin and pretty-prints
// the consolidated event layer (system/assistant/user/result). The fine-grained
// `stream_event` SSE envelopes are ignored — the consolidated events already
// carry fully assembled content blocks.
//
// Usage:
//   claude --output-format stream-json --verbose --permission-mode auto -p "explain quantum computing like I'm 5" | npx claude_stream_viewer


import Readline from 'node:readline';
import Fs from 'node:fs';
import * as Commander from 'commander';
import Chalk from 'chalk';
import Path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;

const MAX_TOOL_RESULT_LINES = 40;

type CliOptions = {
	color: boolean;
};

type ContentBlock = {
	type?: string;
	text?: string;
	thinking?: string;
	id?: string;
	name?: string;
	input?: unknown;
	tool_use_id?: string;
	content?: string | Array<{ type?: string; text?: string }>;
	is_error?: boolean;
};

// Partial typing on purpose: only fields we render are listed. Anything we
// don't recognize falls through to the unknown-event branch.
type ClaudeEvent = {
	type?: string;
	subtype?: string;
	cwd?: string;
	model?: string;
	tools?: string[];
	session_id?: string;
	claude_code_version?: string;
	message?: {
		content?: ContentBlock[];
	};
	rate_limit_info?: {
		status?: string;
	};
	result?: string;
	total_cost_usd?: number;
	duration_ms?: number;
	num_turns?: number;
	terminal_reason?: string;
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
		cache_read_input_tokens?: number;
		cache_creation_input_tokens?: number;
	};
};

const colors = {
	text: Chalk.white,
	tool: Chalk.cyan,
	system: Chalk.gray,
	error: Chalk.red,
	json: Chalk.dim,
	header: Chalk.yellow.bold,
	thinking: Chalk.gray.italic,
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	class MainHelper
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	private toolNamesById = new Map<string, string>();

	printHeader(label: string) {
		console.log(colors.header(`\n=== ${label} ===`));
	}

	printJSON(obj: unknown) {
		console.log(colors.json(JSON.stringify(obj, null, 2)));
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	per-event-type renderers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private renderSystem(event: ClaudeEvent) {
		if (event.subtype !== 'init') {
			this.printHeader(`SYSTEM: ${event.subtype ?? 'unknown'}`);
			this.printJSON(event);
			return;
		}
		this.printHeader('SESSION');
		const sessionPrefix = event.session_id !== undefined ? event.session_id.slice(0, 8) : 'unknown';
		const toolsCount = event.tools !== undefined ? event.tools.length : 0;
		console.log(colors.system(`model: ${event.model ?? 'unknown'}`));
		console.log(colors.system(`cwd: ${event.cwd ?? 'unknown'}`));
		console.log(colors.system(`tools: ${toolsCount}`));
		console.log(colors.system(`session: ${sessionPrefix}`));
		if (event.claude_code_version !== undefined) {
			console.log(colors.system(`claude-code: v${event.claude_code_version}`));
		}
	}

	private renderAssistant(event: ClaudeEvent) {
		const content = event.message?.content;
		if (content === undefined) return;
		for (const block of content) {
			this.renderAssistantBlock(block);
		}
	}

	private renderAssistantBlock(block: ContentBlock) {
		if (block.type === 'thinking') {
			console.log(colors.system('\n--- thinking ---'));
			console.log(colors.thinking(block.thinking ?? ''));
			return;
		}
		if (block.type === 'text') {
			console.log(colors.text(`\n${block.text ?? ''}`));
			return;
		}
		if (block.type === 'tool_use') {
			const name = block.name ?? 'tool';
			if (block.id !== undefined) {
				this.toolNamesById.set(block.id, name);
			}
			console.log(colors.tool(`\n→ ${name}`));
			console.log(colors.json(JSON.stringify(block.input ?? {}, null, 2)));
			return;
		}
		console.log(colors.system(`\n[assistant block: ${block.type ?? 'unknown'}]`));
		this.printJSON(block);
	}

	private renderUser(event: ClaudeEvent) {
		const content = event.message?.content;
		if (content === undefined) return;
		for (const block of content) {
			if (block.type === 'tool_result') {
				this.renderToolResult(block);
				continue;
			}
			console.log(colors.system(`\n[user block: ${block.type ?? 'unknown'}]`));
			this.printJSON(block);
		}
	}

	private renderToolResult(block: ContentBlock) {
		const toolName = block.tool_use_id !== undefined
			? this.toolNamesById.get(block.tool_use_id) ?? block.tool_use_id.slice(0, 12)
			: 'unknown';
		const isError = block.is_error === true;
		const label = isError ? `← ${toolName} ERROR` : `← ${toolName} result`;
		console.log(colors.tool(`\n${label}`));

		const text = MainHelper.toolResultToText(block.content);
		const lines = text.split('\n');
		const colorFn = isError ? colors.error : colors.text;
		if (lines.length <= MAX_TOOL_RESULT_LINES) {
			console.log(colorFn(text));
			return;
		}
		const head = lines.slice(0, MAX_TOOL_RESULT_LINES).join('\n');
		const moreCount = lines.length - MAX_TOOL_RESULT_LINES;
		console.log(colorFn(head));
		console.log(colors.system(`… (truncated, ${moreCount} more lines)`));
	}

	private static toolResultToText(content: ContentBlock['content']): string {
		if (content === undefined) return '';
		if (typeof content === 'string') return content;
		return content.map((b) => b.text ?? '').join('');
	}

	private renderRateLimit(event: ClaudeEvent) {
		const status = event.rate_limit_info?.status ?? 'unknown';
		console.log(colors.system(`\n[rate_limit] ${status}`));
	}

	private renderResult(event: ClaudeEvent) {
		this.printHeader('RESULT');
		if (event.terminal_reason !== undefined) console.log(colors.system(`terminal_reason: ${event.terminal_reason}`));
		if (event.num_turns !== undefined) console.log(colors.system(`turns: ${event.num_turns}`));
		if (event.duration_ms !== undefined) console.log(colors.system(`duration: ${(event.duration_ms / 1000).toFixed(2)}s`));
		if (event.total_cost_usd !== undefined) console.log(colors.system(`cost: $${event.total_cost_usd.toFixed(4)}`));
		const usage = event.usage;
		if (usage !== undefined) {
			console.log(colors.system(
				`tokens: in=${usage.input_tokens ?? 0} out=${usage.output_tokens ?? 0} cache_read=${usage.cache_read_input_tokens ?? 0} cache_create=${usage.cache_creation_input_tokens ?? 0}`,
			));
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	dispatcher
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	handleEvent(claudeEvent: ClaudeEvent) {
		try {
			const type = claudeEvent.type;
			if (type === 'stream_event') return;
			if (type === 'system') return this.renderSystem(claudeEvent);
			if (type === 'assistant') return this.renderAssistant(claudeEvent);
			if (type === 'user') return this.renderUser(claudeEvent);
			if (type === 'rate_limit_event') return this.renderRateLimit(claudeEvent);
			if (type === 'result') return this.renderResult(claudeEvent);
			this.printHeader(`${type ?? 'unknown'}`);
			this.printJSON(claudeEvent);
		} catch (err) {
			console.error(colors.error('Error processing event:'), err);
			this.printJSON(claudeEvent);
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
	const packageJson: object = JSON.parse(await Fs.promises.readFile(packageJsonPath, 'utf-8'));
	const packageVersion = (packageJson as { version?: string }).version ?? 'unknown';

	const program = new Commander.Command();
	program
		.name('claude_stream_viewer')
		.description('Pretty-prints Claude Code consolidated stream-json events from stdin with colorized output.')
		.version(packageVersion)
		.option('--no-color', 'disable colored output')
		.parse(process.argv);

	const options = program.opts<CliOptions>();
	if (options.color === false) {
		Chalk.level = 0;
	}

	const helper = new MainHelper();
	const readline = Readline.createInterface({
		input: process.stdin,
		crlfDelay: Infinity,
	});

	readline.on('line', (line) => {
		if (line.trim() === '') return;
		try {
			const parsed = JSON.parse(line);
			helper.handleEvent(parsed);
		} catch (err) {
			console.error(colors.error('Invalid JSON:'), line);
		}
	});

	await new Promise<void>((resolve) => {
		readline.on('close', () => {
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
