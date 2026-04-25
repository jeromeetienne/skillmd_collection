// node imports
import Assert from "node:assert";
import { fileURLToPath } from "node:url";

// local imports
import type { AxNode } from "./a11y_tree.js";
import { A11yTree } from "./a11y_tree.js";

// role                        → match by role
// role[attr=value]            → attribute equals
// role[attr^=value]           → starts with
// role[attr$=value]           → ends with
// role[attr*=value]           → contains
// role[attr~=value]           → contains whole word
// role[attr]                  → attribute exists
// role[name="..."]            → name is treated as a virtual attribute
// #uid                        → match by uid
// *                           → any role
// A B                         → B is a descendant of A
// A > B                       → B is a direct child of A
// A + B                       → B is the immediately following sibling of A
// A ~ B                       → B is any following sibling of A
// role:first-child            → node is the first child of its parent
// role:last-child             → node is the last child of its parent
// role:nth-child(n)           → node is the nth child (1-based)
// A, B                        → union

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type Token =
	| { kind: "ident"; value: string; pos: number }
	| { kind: "string"; value: string; pos: number }
	| { kind: "symbol"; value: "#" | "*" | "[" | "]" | ">" | "," | "+" | "~" | ":" | "(" | ")"; pos: number }
	| { kind: "op"; value: "^=" | "$=" | "*=" | "=" | "~="; pos: number }
	| { kind: "ws"; pos: number };

type AttrMatch = {
	name: string;
	op?: "=" | "^=" | "$=" | "*=" | "~=";
	value?: string;
};

type PseudoClass =
	| { kind: "first-child" }
	| { kind: "last-child" }
	| { kind: "nth-child"; index: number };

interface SimpleSelector {
	role?: string;
	uid?: string;
	attrs: AttrMatch[];
	pseudos: PseudoClass[];
}

type Combinator = " " | ">" | "+" | "~";

interface CompoundSelector {
	parts: Array<{ combinator: Combinator | null; simple: SimpleSelector }>;
}

export class A11yQuery {
	static querySelector(root: AxNode, selector: string): AxNode | undefined {
		const groups = A11yQuery.parseSelector(selector);
		for (const n of A11yTree.walk(root)) {
			if (groups.some((g) => A11yQuery.matchCompound(n, g))) return n;
		}
		return undefined;
	}

	static querySelectorAll(root: AxNode, selector: string): AxNode[] {
		const groups = A11yQuery.parseSelector(selector);
		const out: AxNode[] = [];
		for (const n of A11yTree.walk(root)) {
			if (groups.some((g) => A11yQuery.matchCompound(n, g))) out.push(n);
		}
		return out;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static makeError(msg: string, input: string, pos: number): Error {
		const pointer = ' '.repeat(pos) + '^';
		return new Error(`${msg} at column ${pos}:\n  ${input}\n  ${pointer}`);
	}

	private static tokenize(input: string): Token[] {
		const tokens: Token[] = [];
		let i = 0;

		while (i < input.length) {
			const c = input[i];

			if (/\s/.test(c)) {
				const start = i;
				while (i < input.length && /\s/.test(input[i])) i++;
				tokens.push({ kind: 'ws', pos: start });
				continue;
			}

			if (c === '"') {
				const start = i;
				let j = i + 1;
				let value = '';
				while (j < input.length && input[j] !== '"') {
					if (input[j] === '\\' && j + 1 < input.length) {
						value += input[j + 1];
						j += 2;
					} else {
						value += input[j++];
					}
				}
				if (input[j] !== '"') throw A11yQuery.makeError('Unterminated string', input, start);
				tokens.push({ kind: 'string', value, pos: start });
				i = j + 1;
				continue;
			}

			if (c === '^' || c === '$') {
				if (input[i + 1] === '=') {
					tokens.push({ kind: 'op', value: `${c}=` as '^=' | '$=', pos: i });
					i += 2;
					continue;
				}
			}

			if (c === '*') {
				if (input[i + 1] === '=') {
					tokens.push({ kind: 'op', value: '*=', pos: i });
					i += 2;
				} else {
					tokens.push({ kind: 'symbol', value: '*', pos: i });
					i++;
				}
				continue;
			}

			if (c === '~') {
				if (input[i + 1] === '=') {
					tokens.push({ kind: 'op', value: '~=', pos: i });
					i += 2;
				} else {
					tokens.push({ kind: 'symbol', value: '~', pos: i });
					i++;
				}
				continue;
			}

			if ('#[]>,+:()'.includes(c)) {
				tokens.push({ kind: 'symbol', value: c as '#' | '[' | ']' | '>' | ',' | '+' | ':' | '(' | ')', pos: i });
				i++;
				continue;
			}

			if (c === '=') {
				tokens.push({ kind: 'op', value: '=', pos: i });
				i++;
				continue;
			}

			if (/[\w-]/.test(c)) {
				const start = i;
				while (i < input.length && /[\w-]/.test(input[i])) i++;
				tokens.push({ kind: 'ident', value: input.slice(start, i), pos: start });
				continue;
			}

			throw A11yQuery.makeError(`Unexpected character '${c}'`, input, i);
		}

		return tokens.filter(
			(t, idx, arr) =>
				!(t.kind === 'ws' && (idx === 0 || idx === arr.length - 1 || arr[idx - 1].kind === 'ws'))
		);
	}

	private static parseSelector(input: string): CompoundSelector[] {
		const tokens = A11yQuery.tokenize(input);
		const groups: CompoundSelector[] = [];
		let i = 0;

		const peek = () => tokens[i];
		const eat = () => tokens[i++];

		const parseSimple = (): SimpleSelector => {
			const sel: SimpleSelector = { attrs: [], pseudos: [] };
			const t = peek();

			if (t?.kind === 'symbol' && t.value === '#') {
				eat();
				const id = eat();
				if (id?.kind !== 'ident') throw A11yQuery.makeError('Expected uid after #', input, id?.pos ?? input.length);
				sel.uid = id.value;
			} else if (t?.kind === 'symbol' && t.value === '*') {
				eat();
			} else if (t?.kind === 'ident') {
				sel.role = (eat() as { kind: 'ident'; value: string; pos: number }).value;
			} else {
				throw A11yQuery.makeError(`Expected role, *, or #uid; got ${JSON.stringify(t)}`, input, t?.pos ?? input.length);
			}

			while (peek()?.kind === 'symbol' && (peek() as { kind: 'symbol'; value: string }).value === '[') {
				eat();
				const nameTok = eat();
				if (nameTok?.kind !== 'ident') throw A11yQuery.makeError('Expected attribute name', input, nameTok?.pos ?? input.length);
				const attr: AttrMatch = { name: nameTok.value };

				if (peek()?.kind === 'ws') eat();
				const next = peek();
				if (next?.kind === 'op') {
					attr.op = (eat() as { kind: 'op'; value: AttrMatch['op'] }).value;
					if (peek()?.kind === 'ws') eat();
					const val = eat();
					if (val?.kind !== 'string' && val?.kind !== 'ident')
						throw A11yQuery.makeError('Expected attribute value', input, val?.pos ?? input.length);
					attr.value = val.value;
				} else if (next?.kind === 'string' || next?.kind === 'ident') {
					throw A11yQuery.makeError(`Expected operator before value '${next.value}'`, input, next.pos);
				}

				const close = eat();
				if (close?.kind !== 'symbol' || close.value !== ']')
					throw A11yQuery.makeError('Expected ]', input, close?.pos ?? input.length);
				sel.attrs.push(attr);
			}

			while (peek()?.kind === 'symbol' && (peek() as { kind: 'symbol'; value: string }).value === ':') {
				eat();
				const nameTok = eat();
				if (nameTok?.kind !== 'ident') throw A11yQuery.makeError('Expected pseudo-class name after \':\'', input, nameTok?.pos ?? input.length);

				if (nameTok.value === 'first-child') {
					sel.pseudos.push({ kind: 'first-child' });
				} else if (nameTok.value === 'last-child') {
					sel.pseudos.push({ kind: 'last-child' });
				} else if (nameTok.value === 'nth-child') {
					const open = eat();
					if (open?.kind !== 'symbol' || (open as { kind: 'symbol'; value: string }).value !== '(')
						throw A11yQuery.makeError('Expected \'(\' after nth-child', input, open?.pos ?? input.length);
					const num = eat();
					if (num?.kind !== 'ident' || !/^\d+$/.test(num.value))
						throw A11yQuery.makeError('Expected integer inside nth-child()', input, num?.pos ?? input.length);
					const close = eat();
					if (close?.kind !== 'symbol' || (close as { kind: 'symbol'; value: string }).value !== ')')
						throw A11yQuery.makeError('Expected \')\' after nth-child index', input, close?.pos ?? input.length);
					sel.pseudos.push({ kind: 'nth-child', index: parseInt(num.value, 10) });
				} else {
					throw A11yQuery.makeError(`Unknown pseudo-class '${nameTok.value}'`, input, nameTok.pos);
				}
			}

			return sel;
		};

		const parseCompound = (): CompoundSelector => {
			const parts: CompoundSelector['parts'] = [];
			parts.push({ combinator: null, simple: parseSimple() });

			while (i < tokens.length) {
				const t = peek();
				if (t?.kind === 'symbol' && t.value === ',') break;

				let combinator: Combinator | null = null;
				if (t?.kind === 'ws') {
					eat();
					combinator = ' ';
				}

				const next = peek();
				if (next?.kind === 'symbol' && next.value === '>') {
					eat();
					combinator = '>';
					if (peek()?.kind === 'ws') eat();
				} else if (next?.kind === 'symbol' && next.value === '+') {
					eat();
					combinator = '+';
					if (peek()?.kind === 'ws') eat();
				} else if (next?.kind === 'symbol' && next.value === '~') {
					eat();
					combinator = '~';
					if (peek()?.kind === 'ws') eat();
				}

				if (combinator === null) break;
				if (peek() === undefined || (peek()?.kind === 'symbol' && (peek() as { kind: 'symbol'; value: string }).value === ','))
					break;

				parts.push({ combinator, simple: parseSimple() });
			}

			return { parts };
		};

		groups.push(parseCompound());
		while (peek()?.kind === 'symbol' && (peek() as { kind: 'symbol'; value: string }).value === ',') {
			eat();
			if (peek()?.kind === 'ws') eat();
			groups.push(parseCompound());
		}

		return groups;
	}

	private static getAttr(node: AxNode, name: string): string | undefined {
		if (name === 'name') return node.name;
		return node.attributes[name];
	}

	private static matchSimple(node: AxNode, sel: SimpleSelector): boolean {
		if (sel.uid !== undefined && node.uid !== sel.uid) return false;
		if (sel.role !== undefined && node.role !== sel.role) return false;

		for (const a of sel.attrs) {
			const actual = A11yQuery.getAttr(node, a.name);
			if (actual === undefined) return false;
			if (a.op === undefined) continue;
			const v = a.value ?? '';
			switch (a.op) {
				case '=':
					if (actual !== v) return false;
					break;
				case '^=':
					if (!actual.startsWith(v)) return false;
					break;
				case '$=':
					if (!actual.endsWith(v)) return false;
					break;
				case '*=':
					if (!actual.includes(v)) return false;
					break;
				case '~=':
					if (!actual.split(/\s+/).includes(v)) return false;
					break;
			}
		}

		for (const pseudo of sel.pseudos) {
			const siblings = node.parent?.children;
			if (siblings === undefined) return false;
			const idx = siblings.indexOf(node);
			if (pseudo.kind === 'first-child' && idx !== 0) return false;
			if (pseudo.kind === 'last-child' && idx !== siblings.length - 1) return false;
			if (pseudo.kind === 'nth-child' && idx !== pseudo.index - 1) return false;
		}

		return true;
	}

	private static matchCompound(node: AxNode, compound: CompoundSelector): boolean {
		const parts = compound.parts;
		const last = parts[parts.length - 1];
		if (!A11yQuery.matchSimple(node, last.simple)) return false;

		let current: AxNode | undefined = node;
		for (let p = parts.length - 2; p >= 0; p--) {
			const { combinator } = parts[p + 1];
			const target = parts[p].simple;

			if (combinator === '>') {
				current = current?.parent;
				if (!current || !A11yQuery.matchSimple(current, target)) return false;
			} else if (combinator === ' ') {
				current = current?.parent;
				while (current !== undefined && !A11yQuery.matchSimple(current, target)) current = current.parent;
				if (current === undefined) return false;
			} else if (combinator === '+') {
				const parent: AxNode | undefined = current?.parent;
				if (parent === undefined) return false;
				const siblings: AxNode[] = parent.children;
				const idx = siblings.indexOf(current as AxNode);
				const prev: AxNode | undefined = siblings[idx - 1];
				if (prev === undefined || !A11yQuery.matchSimple(prev, target)) return false;
				current = prev;
			} else if (combinator === '~') {
				const parent: AxNode | undefined = current?.parent;
				if (parent === undefined) return false;
				const siblings: AxNode[] = parent.children;
				const idx = siblings.indexOf(current as AxNode);
				let match: AxNode | undefined;
				for (let k = idx - 1; k >= 0; k--) {
					if (A11yQuery.matchSimple(siblings[k] as AxNode, target)) { match = siblings[k]; break; }
				}
				if (match === undefined) return false;
				current = match;
			}
		}

		return true;
	}

}
