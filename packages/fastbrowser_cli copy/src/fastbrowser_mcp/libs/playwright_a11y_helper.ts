///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Convert Playwright's get-text-snapshot format to chrome-devtools-mcp's
//	take_snapshot body format, so that the rest of the pipeline (A11yParse +
//	selector engine) can be reused unchanged.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type Bracket =
	| { kind: 'attr'; key: string; value: string }
	| { kind: 'flag'; name: string };

type ParsedLine =
	| { kind: 'parent_attr'; key: string; value: string }
	| { kind: 'static_text'; text: string }
	| {
		kind: 'node';
		role: string;
		name?: string;
		uid?: string;
		attrs: Array<[string, string]>;
		flags: string[];
		value?: string;
	};

type EmittedNode = {
	indent: number;
	uid: string;
	role: string;
	name?: string;
	attrs: Array<[string, string]>;
	flags: string[];
};

export class PlaywrightA11yConverter {
	/**
	 * Convert Playwright's `get-text-snapshot` output to the body of chrome-devtools-mcp's `take_snapshot`.
	 *
	 * Playwright emits a YAML-like tree with `[ref=eN]` markers, e.g.
	 * ```
	 * - link "Welcome" [ref=e7] [cursor=pointer]:
	 *   - /url: /fr
	 *   - img "Welcome" [ref=e8]
	 * ```
	 *
	 * chrome-devtools-mcp emits one node per line with `uid=...`, e.g.
	 * ```
	 * uid=e7 link "Welcome" url="/fr"
	 *   uid=e8 image "Welcome"
	 * ```
	 *
	 * The output omits the `## Latest page snapshot` metadata line, so it can be passed directly
	 * to `A11yParse.A11yTree.parse()`.
	 */
	static convertToChromeDevtools(playwrightText: string): string {
		const lines = playwrightText.split('\n');
		const stack: EmittedNode[] = [];
		const allNodes: EmittedNode[] = [];
		let synthCounter = 0;
		const synth = () => `s${++synthCounter}`;

		for (const rawLine of lines) {
			if (rawLine.trim().length === 0) continue;

			const indentMatch = /^( *)/.exec(rawLine);
			const leadingSpaces = indentMatch !== null ? indentMatch[1].length : 0;
			const indent = Math.floor(leadingSpaces / 2);

			const trimmed = rawLine.slice(leadingSpaces);
			if (!trimmed.startsWith('- ')) continue;
			const body = trimmed.slice(2);

			while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
				stack.pop();
			}
			const parent = stack[stack.length - 1] as EmittedNode | undefined;

			const parsed = PlaywrightA11yConverter._parseLine(body);

			if (parsed.kind === 'parent_attr') {
				if (parent !== undefined) {
					parent.attrs.push([parsed.key, parsed.value]);
				}
				continue;
			}

			if (parsed.kind === 'static_text') {
				const node: EmittedNode = {
					indent,
					uid: synth(),
					role: 'StaticText',
					name: parsed.text,
					attrs: [],
					flags: [],
				};
				allNodes.push(node);
				stack.push(node);
				continue;
			}

			const uid = parsed.uid !== undefined ? parsed.uid : synth();
			const attrs: Array<[string, string]> = [...parsed.attrs];
			if (parsed.value !== undefined) {
				attrs.push(['value', parsed.value]);
			}
			const node: EmittedNode = {
				indent,
				uid,
				role: parsed.role,
				name: parsed.name,
				attrs,
				flags: parsed.flags,
			};
			allNodes.push(node);
			stack.push(node);
		}

		return allNodes.map((node) => PlaywrightA11yConverter._stringifyNode(node)).join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Internal helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static _parseLine(body: string): ParsedLine {
		if (body.startsWith('/url:')) {
			return { kind: 'parent_attr', key: 'url', value: body.slice('/url:'.length).trim() };
		}
		if (body.startsWith('/placeholder:')) {
			return { kind: 'parent_attr', key: 'placeholder', value: body.slice('/placeholder:'.length).trim() };
		}
		if (body.startsWith('text:')) {
			const text = PlaywrightA11yConverter._unquoteIfQuoted(body.slice('text:'.length).trim());
			return { kind: 'static_text', text };
		}

		let i = 0;
		const roleMatch = /^(\w+)/.exec(body);
		if (roleMatch === null) {
			return { kind: 'node', role: 'unknown', attrs: [], flags: [] };
		}
		const role = roleMatch[1];
		i = role.length;

		const skipSpaces = (): void => {
			while (i < body.length && body[i] === ' ') i++;
		};

		skipSpaces();

		let name: string | undefined;
		if (body[i] === '"') {
			const parsed = PlaywrightA11yConverter._readQuotedString(body, i);
			name = parsed.value;
			i = parsed.next;
		}

		const brackets: Bracket[] = [];
		skipSpaces();
		while (body[i] === '[') {
			const closeIdx = body.indexOf(']', i);
			if (closeIdx === -1) break;
			const content = body.slice(i + 1, closeIdx);
			const eqIdx = content.indexOf('=');
			if (eqIdx >= 0) {
				brackets.push({
					kind: 'attr',
					key: content.slice(0, eqIdx),
					value: content.slice(eqIdx + 1),
				});
			} else {
				brackets.push({ kind: 'flag', name: content });
			}
			i = closeIdx + 1;
			skipSpaces();
		}

		let value: string | undefined;
		if (body[i] === ':') {
			i++;
			const rest = body.slice(i).trim();
			if (rest.length > 0) {
				value = PlaywrightA11yConverter._unquoteIfQuoted(rest);
			}
		}

		let uid: string | undefined;
		const attrs: Array<[string, string]> = [];
		const flags: string[] = [];
		for (const b of brackets) {
			if (b.kind === 'attr') {
				if (b.key === 'ref') {
					uid = b.value;
				} else if (b.key === 'cursor') {
					// CSS cursor — not a meaningful a11y attribute
				} else {
					attrs.push([b.key, b.value]);
				}
			} else {
				flags.push(b.name);
			}
		}

		return { kind: 'node', role, name, uid, attrs, flags, value };
	}

	private static _readQuotedString(input: string, start: number): { value: string; next: number } {
		let i = start + 1;
		let result = '';
		while (i < input.length) {
			const ch = input[i];
			if (ch === '\\' && i + 1 < input.length) {
				result += input[i + 1];
				i += 2;
				continue;
			}
			if (ch === '"') {
				return { value: result, next: i + 1 };
			}
			result += ch;
			i++;
		}
		return { value: result, next: i };
	}

	private static _unquoteIfQuoted(s: string): string {
		if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
			const inner = s.slice(1, -1);
			return inner.replace(/\\(.)/g, '$1');
		}
		return s;
	}

	private static _stringifyNode(node: EmittedNode): string {
		const pad = '  '.repeat(node.indent);
		const name = node.name !== undefined ? ` "${PlaywrightA11yConverter._escapeQuotes(node.name)}"` : '';
		const parts: string[] = [];
		for (const flag of node.flags) parts.push(flag);
		for (const [k, v] of node.attrs) parts.push(`${k}="${PlaywrightA11yConverter._escapeQuotes(v)}"`);
		const tail = parts.length > 0 ? ' ' + parts.join(' ') : '';
		return `${pad}uid=${node.uid} ${node.role}${name}${tail}`;
	}

	private static _escapeQuotes(s: string): string {
		return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}
}
