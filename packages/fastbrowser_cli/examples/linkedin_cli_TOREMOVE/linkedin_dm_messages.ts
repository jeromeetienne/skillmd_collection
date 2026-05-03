import { Command } from 'commander';
import Fs from 'fs';

import { A11yDisplay, A11yQuery, A11yTree, AxNode } from 'a11y_parse';

class MessagesThreadHelper {


	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async parseMessagesThread(
		axNodeThread: AxNode,
		overrideYear?: number,
	): Promise<string> {
		const lines: string[] = [];
		let currentDate: Date | null = null;
		let currentSender: string | null = null;
		let currentTime: { hours: number; minutes: number } | null = null;
		const year = overrideYear !== undefined ? overrideYear : new Date().getFullYear();

		for (const item of axNodeThread.children) {
			if (item.children.length === 0) {
				continue;
			}

			const dateChild = item.children.find(
				(c) => c.role === 'time'
					&& c.attributes['value'] !== undefined
					&& c.attributes['value'].startsWith('•') === false,
			);
			if (dateChild !== undefined && dateChild.attributes['value'] !== undefined) {
				currentDate = MessagesThreadHelper.parseDateMarker(dateChild.attributes['value'], year);
			}

			const headerChild = item.children.find(
				(c) => c.role === 'generic'
					&& c.attributes['value'] !== undefined
					&& / sent the following messages at /.test(c.attributes['value']),
			);
			if (headerChild !== undefined && headerChild.attributes['value'] !== undefined) {
				const parsed = MessagesThreadHelper.extractSenderFromHeader(headerChild.attributes['value']);
				if (parsed !== null) {
					currentSender = parsed.sender;
					currentTime = MessagesThreadHelper.parseTimeOfDay(parsed.time);
				}
			}

			const innerTimes = A11yQuery.querySelectorAll(item, 'time');
			const bulletTime = innerTimes.find(
				(t) => t.attributes['value'] !== undefined && t.attributes['value'].startsWith('•'),
			);
			if (bulletTime !== undefined && bulletTime.attributes['value'] !== undefined) {
				currentTime = MessagesThreadHelper.parseTimeOfDay(bulletTime.attributes['value']);
			}

			if (headerChild === undefined) {
				const linkNodes = A11yQuery.querySelectorAll(item, 'link[url*="linkedin.com/in/"]');
				const senderLink = linkNodes.find(
					(l) => l.name !== undefined
						&& l.name.length > 0
						&& l.name.startsWith('View ') === false,
				);
				if (senderLink !== undefined && senderLink.name !== undefined) {
					currentSender = senderLink.name;
				}
			}

			const paragraphs = A11yQuery.querySelectorAll(item, 'paragraph')
				.filter((p) => MessagesThreadHelper.hasButtonAncestor(p, item) === false);
			const texts = paragraphs
				.map((p) => MessagesThreadHelper.extractParagraphText(p))
				.filter((t) => t.length > 0);
			if (texts.length === 0) {
				continue;
			}
			if (currentDate === null || currentSender === null || currentTime === null) {
				continue;
			}

			const iso = MessagesThreadHelper.combineDateTime(currentDate, currentTime);
			lines.push(`${iso}:${currentSender}: ${texts.join(' ')}`);
		}

		return lines.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static parseDateMarker(value: string, fallbackYear: number): Date {
		const months: Record<string, number> = {
			Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
			Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
		};
		const match = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
		if (match === null) {
			throw new Error(`Cannot parse date marker: "${value}"`);
		}
		const monthIndex = months[match[1]];
		if (monthIndex === undefined) {
			throw new Error(`Unknown month name: "${match[1]}"`);
		}
		const year = match[3] !== undefined ? parseInt(match[3], 10) : fallbackYear;
		return new Date(year, monthIndex, parseInt(match[2], 10));
	}

	private static parseTimeOfDay(value: string): { hours: number; minutes: number } {
		const cleaned = value.replace(/^•\s*/, '').trim();
		const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (match === null) {
			throw new Error(`Cannot parse time of day: "${value}"`);
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

	private static extractParagraphText(paragraph: AxNode): string {
		if (paragraph.attributes['value'] !== undefined) {
			return paragraph.attributes['value'].trim();
		}
		const parts: string[] = [];
		for (const child of paragraph.children) {
			if (child.name !== undefined && child.name.length > 0) {
				parts.push(child.name);
				continue;
			}
			if (child.attributes['value'] !== undefined) {
				parts.push(child.attributes['value']);
			}
		}
		return parts.join(' ').trim();
	}

	private static extractSenderFromHeader(value: string): { sender: string; time: string } | null {
		const match = value.match(/^(.+?) sent the following messages at (.+)$/);
		if (match === null) {
			return null;
		}
		return { sender: match[1], time: match[2] };
	}

	private static hasButtonAncestor(node: AxNode, stopAt: AxNode): boolean {
		let current: AxNode | undefined = node.parent;
		while (current !== undefined && current.uid !== stopAt.uid) {
			if (current.role === 'button') {
				return true;
			}
			current = current.parent;
		}
		return false;
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async readFileContent(filePath: string): Promise<string> {
		if (filePath !== '-') {
			const fileContent = await Fs.promises.readFile(filePath, 'utf-8');
			return fileContent;
		}

		return await new Promise<string>((resolve, reject) => {
			let data = '';
			process.stdin.setEncoding('utf-8');
			process.stdin.on('data', (chunk) => {
				data += chunk;
			});
			process.stdin.on('end', () => {
				resolve(data);
			});
			process.stdin.on('error', (err) => {
				reject(err);
			});
		});
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async getAxNodeThread(axTree: AxNode): Promise<AxNode> {
		const axNodeConvList: AxNode | undefined = A11yQuery.querySelector(axTree, 'list[name="Conversation List"]')
		if (axNodeConvList === undefined) throw new Error('Could not find conversation list node');

		console.log('axNodeConvList:', A11yDisplay.stringifyNode(axNodeConvList));
		const axNodeConvListParent = axNodeConvList.parent
		if (axNodeConvListParent === undefined) throw new Error('Conversation list node has no parent');

		console.log('axNodeConvListParent:', A11yDisplay.stringifyNode(axNodeConvListParent));

		// goto next sibling of conv list parent, which is the "Conversation details" container
		const axNodeConvDetails: AxNode | undefined = A11yTree.nextSibling(axNodeConvListParent);
		if (axNodeConvDetails === undefined) throw new Error('Could not find conversation details node');

		console.log('axNodeConvDetails:', A11yDisplay.stringifyNode(axNodeConvDetails));

		// console.log('Conversation List node:', axNodeConvList);
		console.log('axNodeConvDetails:')
		// console.log(A11yDisplay.stringifyTree(axNodeConvDetails));

		const axNodeThread = A11yQuery.querySelector(axNodeConvDetails, 'list');
		if (axNodeThread === undefined) throw new Error('Could not find thread node');

		return axNodeThread;
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const program = new Command();

	// NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- take_snapshot | npx tsx ./examples/linkedin_cli/linkedin_dm_messages.ts -f -
	program
		.name('linkedin_dm_messages')
		.description('Linkedin DM messages CLI')
		.requiredOption('-f, --a11y_file <a11y_path>', 'path to the a11y file')
		.parse(process.argv);

	const options = program.opts<{
		a11y_file: string;
	}>();

	console.log('Options:', options);

	// Get and parse the whole snapshot tree, then find the relevant subtree for the messages thread container and print it
	const fileContent = await MainHelper.readFileContent(options.a11y_file);
	const axTree = A11yTree.parse(fileContent);
	const axNodeThread = axTree.role === 'list'
		? axTree
		: await MainHelper.getAxNodeThread(axTree);

	const transcript = await MessagesThreadHelper.parseMessagesThread(axNodeThread);
	console.log(transcript);
}


void main()