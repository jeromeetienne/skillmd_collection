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

type ToolInput = Record<string, unknown>;

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
			this.renderToolUse(block);
			return;
		}
		console.log(colors.system(`\n[assistant block: ${block.type ?? 'unknown'}]`));
		this.printJSON(block);
	}

	private renderToolUse(block: ContentBlock) {
		const name = block.name ?? 'tool';
		if (block.id !== undefined) {
			this.toolNamesById.set(block.id, name);
		}
		console.log(colors.tool(`\n→ ${name}`));

		const rawInput = block.input;
		const input: ToolInput = (rawInput !== null && typeof rawInput === 'object')
			? rawInput as ToolInput
			: {};
		const bodyLines = MainHelper.formatToolBody(name, input);
		for (const line of bodyLines) {
			console.log(`    ${line}`);
		}
	}

	private static formatToolBody(name: string, input: ToolInput): string[] {
		if (name === 'Bash') return MainHelper.formatBashInput(input);
		if (name === 'Read') return MainHelper.formatReadInput(input);
		if (name === 'Write') return MainHelper.formatWriteInput(input);
		if (name === 'Edit') return MainHelper.formatEditInput(input);
		if (name === 'Grep') return MainHelper.formatGrepInput(input);
		if (name === 'Glob') return MainHelper.formatGlobInput(input);
		if (name === 'TodoWrite') return MainHelper.formatTodoWriteInput(input);
		if (name === 'WebFetch') return MainHelper.formatWebFetchInput(input);
		if (name === 'WebSearch') return MainHelper.formatWebSearchInput(input);
		if (name === 'Task' || name === 'Agent') return MainHelper.formatTaskInput(input);
		return MainHelper.formatFallbackInput(input);
	}

	private static formatBashInput(input: ToolInput): string[] {
		const command = MainHelper.readString(input, 'command') ?? '';
		const description = MainHelper.readString(input, 'description');
		const lines: string[] = [];
		const cmdLines = command.split('\n');
		lines.push(colors.text(`$ ${cmdLines[0] ?? ''}`));
		for (let i = 1; i < cmdLines.length; i++) {
			lines.push(colors.text(cmdLines[i]));
		}
		if (description !== undefined) {
			lines.push(colors.system(`# ${description}`));
		}
		return lines;
	}

	private static formatReadInput(input: ToolInput): string[] {
		const filePath = MainHelper.readString(input, 'file_path') ?? '';
		const offset = MainHelper.readNumber(input, 'offset');
		const limit = MainHelper.readNumber(input, 'limit');
		let suffix = '';
		if (offset !== undefined && limit !== undefined) {
			suffix = `:${offset}-${offset + limit - 1}`;
		} else if (offset !== undefined) {
			suffix = `:${offset}+`;
		}
		return [colors.text(`${filePath}${suffix}`)];
	}

	private static formatWriteInput(input: ToolInput): string[] {
		const filePath = MainHelper.readString(input, 'file_path') ?? '';
		return [colors.text(filePath)];
	}

	private static formatEditInput(input: ToolInput): string[] {
		const filePath = MainHelper.readString(input, 'file_path') ?? '';
		const lines = [colors.text(filePath)];
		if (MainHelper.readBoolean(input, 'replace_all') === true) {
			lines.push(colors.system('replace_all=true'));
		}
		return lines;
	}

	private static formatGrepInput(input: ToolInput): string[] {
		const pattern = MainHelper.readString(input, 'pattern') ?? '';
		const path = MainHelper.readString(input, 'path');
		const head = path !== undefined ? `"${pattern}" in ${path}` : `"${pattern}"`;
		const flags: string[] = [];
		const outputMode = MainHelper.readString(input, 'output_mode');
		if (outputMode !== undefined) flags.push(`output_mode=${outputMode}`);
		if (MainHelper.readBoolean(input, '-n') === true) flags.push('-n');
		if (MainHelper.readBoolean(input, '-i') === true) flags.push('-i');
		const headLimit = MainHelper.readNumber(input, 'head_limit');
		if (headLimit !== undefined) flags.push(`head_limit=${headLimit}`);
		const glob = MainHelper.readString(input, 'glob');
		if (glob !== undefined) flags.push(`glob=${glob}`);
		const fileType = MainHelper.readString(input, 'type');
		if (fileType !== undefined) flags.push(`type=${fileType}`);
		if (flags.length === 0) {
			return [colors.text(head)];
		}
		return [`${colors.text(head)} ${colors.system(`(${flags.join(', ')})`)}`];
	}

	private static formatGlobInput(input: ToolInput): string[] {
		const pattern = MainHelper.readString(input, 'pattern') ?? '';
		const path = MainHelper.readString(input, 'path');
		const text = path !== undefined ? `${pattern} in ${path}` : pattern;
		return [colors.text(text)];
	}

	private static formatTodoWriteInput(input: ToolInput): string[] {
		const todos = input['todos'];
		if (Array.isArray(todos) === false) {
			return [colors.system('(no todos)')];
		}
		return todos.map((todo) => {
			if (typeof todo !== 'object' || todo === null) {
				return colors.text(String(todo));
			}
			const t = todo as Record<string, unknown>;
			const status = typeof t['status'] === 'string' ? t['status'] : '?';
			const content = typeof t['content'] === 'string' ? t['content'] : '';
			let mark = '?';
			if (status === 'pending') mark = ' ';
			else if (status === 'in_progress') mark = '~';
			else if (status === 'completed') mark = 'x';
			return colors.text(`[${mark}] ${content}`);
		});
	}

	private static formatWebFetchInput(input: ToolInput): string[] {
		const url = MainHelper.readString(input, 'url') ?? '';
		const prompt = MainHelper.readString(input, 'prompt');
		const lines = [colors.text(url)];
		if (prompt !== undefined) {
			lines.push(colors.system(`prompt: ${prompt}`));
		}
		return lines;
	}

	private static formatWebSearchInput(input: ToolInput): string[] {
		const query = MainHelper.readString(input, 'query') ?? '';
		const flags: string[] = [];
		const allowed = input['allowed_domains'];
		if (Array.isArray(allowed) && allowed.length > 0) {
			flags.push(`allowed_domains=[${allowed.map((d) => String(d)).join(', ')}]`);
		}
		const blocked = input['blocked_domains'];
		if (Array.isArray(blocked) && blocked.length > 0) {
			flags.push(`blocked_domains=[${blocked.map((d) => String(d)).join(', ')}]`);
		}
		const head = colors.text(`"${query}"`);
		if (flags.length === 0) return [head];
		return [`${head} ${colors.system(`(${flags.join(', ')})`)}`];
	}

	private static formatTaskInput(input: ToolInput): string[] {
		const description = MainHelper.readString(input, 'description') ?? '';
		const subagentType = MainHelper.readString(input, 'subagent_type') ?? 'agent';
		const prompt = MainHelper.readString(input, 'prompt');
		const lines = [colors.text(`[${subagentType}] ${description}`)];
		if (prompt !== undefined) {
			const PROMPT_PREVIEW_LIMIT = 200;
			if (prompt.length <= PROMPT_PREVIEW_LIMIT) {
				lines.push(colors.system(`prompt: ${prompt}`));
			} else {
				const head = prompt.slice(0, PROMPT_PREVIEW_LIMIT);
				lines.push(colors.system(`prompt: ${head}… (${prompt.length} chars)`));
			}
		}
		return lines;
	}

	private static formatFallbackInput(input: ToolInput): string[] {
		const json = JSON.stringify(input, null, 2);
		return json.split('\n').map((line) => colors.json(line));
	}

	private static readString(input: ToolInput, key: string): string | undefined {
		const value = input[key];
		return typeof value === 'string' ? value : undefined;
	}

	private static readNumber(input: ToolInput, key: string): number | undefined {
		const value = input[key];
		return typeof value === 'number' ? value : undefined;
	}

	private static readBoolean(input: ToolInput, key: string): boolean | undefined {
		const value = input[key];
		return typeof value === 'boolean' ? value : undefined;
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
