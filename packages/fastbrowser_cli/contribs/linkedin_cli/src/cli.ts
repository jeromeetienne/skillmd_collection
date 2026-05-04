#!/usr/bin/env npx tsx

// npm imports
import { Command } from 'commander';
import { A11yQuery, A11yTree, AxNode } from 'a11y_parse';

// local imports
import { FastBrowserHelper } from '../../_shared/fastbrowser_helper.js';
import { LinkedinThreadHelper } from './libs/linkedin_thread_helper.js';
import { LinkedinProfile, LinkedinProfileHelper } from './libs/linkedin_profile_helper.js';
import { LinkedinPost, LinkedinRecentPostsHelper } from './libs/linkedin_recent_posts_helper.js';

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

	static async gotoPageMessaging(): Promise<void> {
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage('https://www.linkedin.com/messaging/');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoPageFeed(): Promise<void> {
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage('https://www.linkedin.com/feed/');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoPageProfile(slug: string): Promise<void> {
		if (slug.length === 0) {
			throw new Error('slug is required');
		}
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage(`https://www.linkedin.com/in/${slug}/`);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoPageRecentPosts(slug: string): Promise<void> {
		if (slug.length === 0) {
			throw new Error('slug is required');
		}
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage(`https://www.linkedin.com/in/${slug}/recent-activity/all/`);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async exportRecentPosts(slug: string, limit: number): Promise<LinkedinPost[]> {
		// Trigger LinkedIn's infinite-scroll inside the window so that more than the initial posts get rendered.
		const scrollFunctionTxt = [
			`() => {`,
			`    const tryCount = 6;`,
			`    const delayMs = 500;`,
			`    (async () => {`,
			`        for (let i = 0; i < tryCount; i++) {`,
			`            window.scrollTo({`,
			`                top: 600000,`,
			`                behavior: 'smooth'`,
			`            });`,
			`            await new Promise(resolve => setTimeout(resolve, delayMs));`,
			`        }`,
			`    })();`,
			`}`,
		].join('\n');
		await FastBrowserHelper.evaluateScript(scrollFunctionTxt);

		// take snapshot and parse posts
		const snapshot = await FastBrowserHelper.takeSnapshot();
		let posts: LinkedinPost[] = LinkedinRecentPostsHelper.parsePosts(snapshot, slug);
		// apply limit
		if (limit > 0 && posts.length > limit) {
			posts = posts.slice(0, limit);
		}
		// return posts
		return posts;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async exportProfile(slug: string): Promise<LinkedinProfile> {
		// scroll to the bottom of the page multiple times to load dynamic content (like experience details, recommendations, etc.)
		const functionTxt = [
			`() => {`,
			`    // select the element`,
			`    const workspace = document.querySelector('main#workspace');`,
			`    if (workspace === null) {`,
			`        throw new Error('Workspace element not found');`,
			`    }`,
			`    // scroll to the bottom of the page multiple times to load dynamic content (like experience details, recommendations, etc.)`,
			`    const tryCount = 6;`,
			`    const delayMs = 500;`,
			`    (async () => {`,
			`        for (let i = 0; i < tryCount; i++) {`,
			`            workspace.scrollBy({`,
			`                top: 600000,`,
			`                behavior: 'smooth'`,
			`            });`,
			`            await new Promise(resolve => setTimeout(resolve, delayMs));`,
			`        }`,
			`        resolve(true);`,
			`    })();`,
			`}`,
		].join('\n');
		const resultEvaluateStr: string = await FastBrowserHelper.evaluateScript(functionTxt);

		// Take snapshot
		const snapshot = await FastBrowserHelper.takeSnapshot();
		// Parse profile
		const linkedinProfile = LinkedinProfileHelper.parseProfile(snapshot, slug);
		// Return profile
		return linkedinProfile;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async createPost(content: string): Promise<void> {
		await FastBrowserHelper.click('button[name^="Start a post"]');
		await FastBrowserHelper.fillForm('textbox[name^="Text editor"]', content);
		await FastBrowserHelper.click('button[name^="Post"]');
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

	static async selectConversation(targetUser: string): Promise<void> {
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
		const threadNode = MainHelper.findThreadNode(axTree);
		return await LinkedinThreadHelper.parseMessagesThread(threadNode);
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
		.name('linkedin_cli')
		.description('LinkedIn DM CLI - command line tool to interact with LinkedIn using the FastBrowser CLI');

	program
		.command('post <content>')
		.description('Create a post on the LinkedIn feed')
		.action(async (content: string) => {
			await MainHelper.gotoPageFeed();
			await MainHelper.createPost(content);
		});

	program
		.command('dm_page')
		.description('Navigate to the LinkedIn messaging page')
		.action(async () => {
			await MainHelper.gotoPageMessaging();
		});

	program
		.command('dm_list')
		.description('List the names of people you have conversations with. (assume you did \'dm_page\' first)')
		.action(async () => {
			const names = await MainHelper.listConvoNames();
			for (const name of names) {
				console.log(name);
			}
		});

	program
		.command('dm_send <target_user> <message>')
		.description('Send a message in an existing conversation. (assume you did \'dm_page\' first)')
		.action(async (targetUser: string, message: string) => {
			await MainHelper.selectConversation(targetUser);
			await MainHelper.fillAndSendMessage(message);
		});

	program
		.command('dm_thread <target_user>')
		.description('Get the message thread of a conversation. (assume you did \'dm_page\' first)')
		.action(async (targetUser: string) => {
			await MainHelper.selectConversation(targetUser);
			const transcript = await MainHelper.getMessagesTranscript();
			console.log(transcript);
		});

	program
		.command('profile <slug>')
		.description('Export a LinkedIn profile by slug (path component of /in/<slug>/)')
		.option('-f, --format <format>', 'output format: markdown or json', 'markdown')
		.action(async (slug: string, opts: { format: string; }) => {
			if (opts.format !== 'markdown' && opts.format !== 'json') {
				throw new Error(`unknown format '${opts.format}', expected 'markdown' or 'json'`);
			}
			await MainHelper.gotoPageProfile(slug);
			const profile = await MainHelper.exportProfile(slug);
			if (opts.format === 'json') {
				console.log(JSON.stringify(profile));
				return;
			}
			console.log(LinkedinProfileHelper.formatMarkdown(profile));
		});

	program
		.command('recent_posts <slug>')
		.description('Export the recent activity (posts) of a LinkedIn profile')
		.option('-f, --format <format>', 'output format: markdown or json', 'markdown')
		.option('-l, --limit <limit>', 'max number of posts to return (0 = all visible)', '0')
		.action(async (slug: string, opts: { format: string; limit: string; }) => {
			if (opts.format !== 'markdown' && opts.format !== 'json') {
				throw new Error(`unknown format '${opts.format}', expected 'markdown' or 'json'`);
			}
			const limit = parseInt(opts.limit, 10);
			if (Number.isNaN(limit) === true || limit < 0) {
				throw new Error(`invalid limit '${opts.limit}', expected a non-negative integer`);
			}
			await MainHelper.gotoPageRecentPosts(slug);
			const posts = await MainHelper.exportRecentPosts(slug, limit);
			if (opts.format === 'json') {
				console.log(JSON.stringify(posts));
				return;
			}
			console.log(LinkedinRecentPostsHelper.formatMarkdown(posts));
		});

	await program.parseAsync();
}

void main();
