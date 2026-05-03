#!/usr/bin/env npx tsx

import { Command } from 'commander';

import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';
import { FastBrowserHelper } from '../wttj_cli/fastbrowser_helper.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MessagesThreadHelper {

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

class LinkedinDmHelper {

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoMessaging(): Promise<void> {
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage('https://www.linkedin.com/messaging/');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async listConvoNames(): Promise<string[]> {
		const output = await FastBrowserHelper.querySelectorsAll(
			'list[name="Conversation List"] > listitem heading',
			0,
		);
		const names: string[] = [];
		for (const line of output.split('\n')) {
			if (/^uid=\S+\s+heading\s+"/.test(line) === false) {
				continue;
			}
			const axNode = A11yTree.parse(line);
			if (axNode.name === undefined) {
				continue;
			}
			names.push(axNode.name);
		}
		return names;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async clickConversation(targetUser: string): Promise<void> {
		const escaped = targetUser.replace(/"/g, '\\"');
		await FastBrowserHelper.click(
			`list[name="Conversation List"] > listitem heading[name^="${escaped}"]`,
		);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async fillAndSendMessage(message: string): Promise<void> {
		await FastBrowserHelper.fillForm('textbox[name^="Write"]', message);
		await FastBrowserHelper.click('button[name^="Send"]');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async getMessagesTranscript(): Promise<string> {
		const output = await FastBrowserHelper.takeSnapshot();
		const axTree = A11yTree.parse(output);
		const threadNode = LinkedinDmHelper.findThreadNode(axTree);
		return await MessagesThreadHelper.parseMessagesThread(threadNode);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static findThreadNode(axTree: AxNode): AxNode {
		const convList = A11yQuery.querySelector(axTree, 'list[name="Conversation List"]');
		if (convList === undefined) {
			throw new Error('Could not find conversation list node');
		}
		const convListParent = convList.parent;
		if (convListParent === undefined) {
			throw new Error('Conversation list node has no parent');
		}
		const convDetails = A11yTree.nextSibling(convListParent);
		if (convDetails === undefined) {
			throw new Error('Could not find conversation details node');
		}
		const threadNode = A11yQuery.querySelector(convDetails, 'list');
		if (threadNode === undefined) {
			throw new Error('Could not find thread node');
		}
		return threadNode;
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Entry point
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const program = new Command();

	program
		.name('linkedin_dm')
		.description('LinkedIn DM CLI');

	program
		.command('list_convos')
		.description('List the names of people you have conversations with')
		.action(async () => {
			await LinkedinDmHelper.gotoMessaging();
			const names = await LinkedinDmHelper.listConvoNames();
			for (const name of names) {
				console.log(name);
			}
		});

	program
		.command('send <target_user> <message>')
		.description('Send a message in an existing conversation')
		.action(async (targetUser: string, message: string) => {
			await LinkedinDmHelper.gotoMessaging();
			await LinkedinDmHelper.clickConversation(targetUser);
			await LinkedinDmHelper.fillAndSendMessage(message);
		});

	program
		.command('messages <target_user>')
		.description('Print the message thread of a conversation')
		.action(async (targetUser: string) => {
			await LinkedinDmHelper.gotoMessaging();
			await LinkedinDmHelper.clickConversation(targetUser);
			const transcript = await LinkedinDmHelper.getMessagesTranscript();
			console.log(transcript);
		});

	await program.parseAsync();
}

void main();
