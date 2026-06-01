// npm imports
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const TIME_OF_DAY_REGEXP = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
const FULL_DATE_REGEXP = /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/;
const WEEKDAYS: Record<string, number> = {
	Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
	Thursday: 4, Friday: 5, Saturday: 6,
};
const MONTHS: Record<string, number> = {
	Jan: 0, January: 0,
	Feb: 1, February: 1,
	Mar: 2, March: 2,
	Apr: 3, April: 3,
	May: 4,
	Jun: 5, June: 5,
	Jul: 6, July: 6,
	Aug: 7, August: 7,
	Sep: 8, September: 8,
	Oct: 9, October: 9,
	Nov: 10, November: 10,
	Dec: 11, December: 11,
};

export class TwitterThreadHelper {
	static async parseMessagesThread(
		rawOutput: string,
		otherHandle: string,
		overrideYear?: number,
	): Promise<string> {
		const treeText = TwitterThreadHelper.extractAxTreeText(rawOutput);
		if (treeText.length === 0) {
			return '';
		}
		const root = A11yTree.parse(treeText);
		const items = A11yQuery.querySelectorAll(root, 'main listitem');
		const year = overrideYear !== undefined ? overrideYear : new Date().getFullYear();

		const lines: string[] = [];
		let currentDate: Date | null = null;
		const pending: string[] = [];

		for (const item of items) {
			const valueGenerics = A11yQuery.querySelectorAll(item, 'generic[value]');
			if (valueGenerics.length === 0) {
				continue;
			}

			const dateMarker = TwitterThreadHelper.detectDateMarker(item, valueGenerics, year);
			if (dateMarker !== null) {
				currentDate = dateMarker;
				continue;
			}

			const timestampNodes = TwitterThreadHelper.findTimestampNodes(valueGenerics);
			if (timestampNodes.length === 0) {
				const text = TwitterThreadHelper.collectText(valueGenerics, new Set());
				if (text.length > 0) {
					pending.push(text);
				}
				continue;
			}

			const time = TwitterThreadHelper.parseTimeOfDay(timestampNodes[0].attributes['value']);
			if (time === null) {
				continue;
			}
			if (currentDate === null) {
				continue;
			}

			const sender = A11yQuery.querySelector(item, 'img') !== undefined
				? 'You'
				: otherHandle;

			const timestampUids = new Set(timestampNodes.map((n) => n.uid));
			const text = TwitterThreadHelper.collectText(valueGenerics, timestampUids);
			const iso = TwitterThreadHelper.combineDateTime(currentDate, time);

			for (const pendingText of pending) {
				lines.push(`${iso}:${sender}:${pendingText}`);
			}
			pending.length = 0;

			if (text.length === 0) {
				continue;
			}
			lines.push(`${iso}:${sender}:${text}`);
		}

		return lines.join('\n');
	}

	private static collectText(valueGenerics: AxNode[], excludeUids: Set<string>): string {
		const parts: string[] = [];
		for (const node of valueGenerics) {
			if (excludeUids.has(node.uid) === true) {
				continue;
			}
			const value = node.attributes['value'];
			if (value === undefined) {
				continue;
			}
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				continue;
			}
			parts.push(trimmed);
		}
		return parts.join(' ');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static extractAxTreeText(rawOutput: string): string {
		const lines: string[] = [];
		for (const line of rawOutput.split('\n')) {
			if (/^\s*uid=/.test(line) === true) {
				lines.push(line);
			}
		}
		return lines.join('\n');
	}

	private static findTimestampNodes(valueGenerics: AxNode[]): AxNode[] {
		const result: AxNode[] = [];
		for (const node of valueGenerics) {
			const value = node.attributes['value'];
			if (value === undefined) {
				continue;
			}
			if (TIME_OF_DAY_REGEXP.test(value) === true) {
				result.push(node);
			}
		}
		return result;
	}

	private static detectDateMarker(
		item: AxNode,
		valueGenerics: AxNode[],
		fallbackYear: number,
	): Date | null {
		const hasTimestamp = TwitterThreadHelper.findTimestampNodes(valueGenerics).length > 0;
		if (hasTimestamp === true) {
			return null;
		}
		if (A11yQuery.querySelector(item, 'img') !== undefined) {
			return null;
		}
		for (const node of valueGenerics) {
			const raw = node.attributes['value'];
			if (raw === undefined) {
				continue;
			}
			const value = raw.trim();
			const parsed = TwitterThreadHelper.parseDateMarker(value, fallbackYear);
			if (parsed !== null) {
				return parsed;
			}
		}
		return null;
	}

	private static parseDateMarker(value: string, fallbackYear: number): Date | null {
		if (value === 'Today') {
			const now = new Date();
			return new Date(now.getFullYear(), now.getMonth(), now.getDate());
		}
		if (value === 'Yesterday') {
			const now = new Date();
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			d.setDate(d.getDate() - 1);
			return d;
		}
		if (WEEKDAYS[value] !== undefined) {
			const target = WEEKDAYS[value];
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const diff = (today.getDay() - target + 7) % 7;
			const days = diff === 0 ? 7 : diff;
			today.setDate(today.getDate() - days);
			return today;
		}
		const match = value.match(FULL_DATE_REGEXP);
		if (match === null) {
			return null;
		}
		const monthIndex = MONTHS[match[1]];
		if (monthIndex === undefined) {
			return null;
		}
		const day = parseInt(match[2], 10);
		const explicitYear = match[3] !== undefined ? parseInt(match[3], 10) : null;
		const year = explicitYear !== null ? explicitYear : fallbackYear;
		const candidate = new Date(year, monthIndex, day);
		if (explicitYear === null && candidate.getTime() > Date.now()) {
			candidate.setFullYear(year - 1);
		}
		return candidate;
	}

	private static parseTimeOfDay(value: string | undefined): { hours: number; minutes: number } | null {
		if (value === undefined) {
			return null;
		}
		const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (match === null) {
			return null;
		}
		let hours = parseInt(match[1], 10);
		const minutes = parseInt(match[2], 10);
		const meridiem = match[3].toUpperCase();
		if (meridiem === 'AM' && hours === 12) {
			hours = 0;
		} else if (meridiem === 'PM' && hours !== 12) {
			hours += 12;
		}
		return { hours, minutes };
	}

	private static combineDateTime(date: Date, time: { hours: number; minutes: number }): string {
		const yyyy = date.getFullYear().toString().padStart(4, '0');
		const mm = (date.getMonth() + 1).toString().padStart(2, '0');
		const dd = date.getDate().toString().padStart(2, '0');
		const hh = time.hours.toString().padStart(2, '0');
		const mi = time.minutes.toString().padStart(2, '0');
		return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
	}
}
