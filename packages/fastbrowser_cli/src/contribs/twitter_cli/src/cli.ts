#!/usr/bin/env npx tsx

// npm imports
import { Command } from 'commander';
import { A11yQuery, A11yTree } from 'a11y_parse';

// local imports
import { FastBrowserHelper } from '../../_shared/fastbrowser_helper.js';
import { TwitterThreadHelper } from './libs/twitter_thread_helper.js';
import { TwitterProfile, TwitterProfileHelper } from './libs/twitter_profile_helper.js';
import { TwitterPost, TwitterRecentPostsHelper } from './libs/twitter_recent_posts_helper.js';

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

	static async gotoPageHome(): Promise<void> {
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage('https://x.com/home');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoPageDm(): Promise<void> {
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage('https://x.com/i/chat/');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async gotoPageProfile(handle: string): Promise<void> {
		if (handle.length === 0) {
			throw new Error('handle is required');
		}
		await FastBrowserHelper.run('check');
		await FastBrowserHelper.navigatePage(`https://x.com/${handle}`);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async exportProfile(handle: string): Promise<TwitterProfile> {
		const snapshot = await FastBrowserHelper.takeSnapshot();
		const profile = TwitterProfileHelper.parseProfile(snapshot, handle);
		if (profile.website !== null) {
			profile.website = await TwitterProfileHelper.resolveWebsite(profile.website);
		}
		return profile;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async exportRecentPosts(handle: string, limit: number): Promise<TwitterPost[]> {
		let posts: TwitterPost[] = [];
		const maxAttempts = 8;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const snapshot = await FastBrowserHelper.takeSnapshot();
			posts = TwitterRecentPostsHelper.parsePosts(snapshot, handle);
			if (posts.length > 0) {
				break;
			}
			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}
		}
		if (limit > 0 && posts.length > limit) {
			return posts.slice(0, limit);
		}
		return posts;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async createPost(content: string): Promise<void> {
		await FastBrowserHelper.click('link[name="Post"]');
		await FastBrowserHelper.fillForm('dialog textbox', content);
		await FastBrowserHelper.click('dialog button[name="Post"]');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async listConversationHandles(): Promise<string[]> {
		const output = await FastBrowserHelper.querySelectorsAllWithChildren(
			'listitem:has(link[name="user avatar"])',
			0,
		);
		const treeText = MainHelper.extractAxTreeText(output);
		if (treeText.length === 0) {
			return [];
		}
		const root = A11yTree.parse(treeText);
		const items = A11yQuery.querySelectorAll(root, 'listitem:has(link[name="user avatar"])');
		const handles: string[] = [];
		for (const item of items) {
			const link = A11yQuery.querySelector(item, 'link[name="user avatar"]');
			if (link === undefined) {
				continue;
			}
			const url = link.attributes['url'];
			if (url === undefined) {
				continue;
			}
			const handle = MainHelper.handleFromUrl(url);
			if (handle === null) {
				continue;
			}
			handles.push(handle);
		}
		return handles;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async selectConversation(handle: string): Promise<void> {
		if (handle.length === 0) {
			throw new Error('handle is required');
		}
		const escaped = handle.replace(/"/g, '\\"');
		await FastBrowserHelper.click(`listitem:has(link[url$="/${escaped}"])`);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async fillAndSendMessage(message: string): Promise<void> {
		await FastBrowserHelper.fillForm('textbox[name="Unencrypted message"]', message);
		await FastBrowserHelper.click('generic:has(> textbox[name="Unencrypted message"]) > button');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async getMessagesTranscript(handle: string): Promise<string> {
		const output = await FastBrowserHelper.querySelectorsAllWithChildren('main listitem', 0);
		return await TwitterThreadHelper.parseMessagesThread(output, handle);
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

	private static handleFromUrl(url: string): string | null {
		const trimmed = url.replace(/\/+$/, '');
		const slash = trimmed.lastIndexOf('/');
		if (slash === -1) {
			return null;
		}
		const handle = trimmed.slice(slash + 1);
		if (handle.length === 0) {
			return null;
		}
		return handle;
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
		.name('twitter_cli')
		.description('Twitter CLI - command line tool to interact with x.com using the FastBrowser CLI');

	program
		.command('post <content>')
		.description('Create a post on x.com')
		.action(async (content: string) => {
			await MainHelper.gotoPageHome();
			await MainHelper.createPost(content);
		});

	program
		.command('dm_page')
		.description('Navigate to the x.com direct messages page')
		.action(async () => {
			await MainHelper.gotoPageDm();
		});

	program
		.command('dm_list')
		.description('List the handles of people you have conversations with. (assume you did "dm_page" first)')
		.action(async () => {
			const handles = await MainHelper.listConversationHandles();
			for (const handle of handles) {
				console.log(handle);
			}
		});

	program
		.command('dm_select <handle>')
		.description('Select an existing conversation by handle. (assume you did "dm_page" first)')
		.action(async (handle: string) => {
			await MainHelper.selectConversation(handle);
		});

	program
		.command('dm_thread <handle>')
		.description('Get the message thread of a conversation. (assume you did "dm_page" first)')
		.action(async (handle: string) => {
			await MainHelper.selectConversation(handle);
			const transcript = await MainHelper.getMessagesTranscript(handle);
			console.log(transcript);
		});

	program
		.command('profile <handle>')
		.description('Export the profile of a twitter handle')
		.option('-f, --format <format>', 'output format: markdown or json', 'markdown')
		.action(async (handle: string, opts: { format: string; }) => {
			if (opts.format !== 'markdown' && opts.format !== 'json') {
				throw new Error(`unknown format '${opts.format}', expected 'markdown' or 'json'`);
			}
			await MainHelper.gotoPageProfile(handle);
			const profile = await MainHelper.exportProfile(handle);
			if (opts.format === 'json') {
				console.log(JSON.stringify(profile));
				return;
			}
			console.log(TwitterProfileHelper.formatMarkdown(profile));
		});

	program
		.command('recent_posts <handle>')
		.description('Export the recent posts visible on a twitter handle\'s profile')
		.option('-f, --format <format>', 'output format: markdown or json', 'markdown')
		.option('-l, --limit <limit>', 'max number of posts to return (0 = all visible)', '0')
		.action(async (handle: string, opts: { format: string; limit: string; }) => {
			if (opts.format !== 'markdown' && opts.format !== 'json') {
				throw new Error(`unknown format '${opts.format}', expected 'markdown' or 'json'`);
			}
			const limit = parseInt(opts.limit, 10);
			if (Number.isNaN(limit) === true || limit < 0) {
				throw new Error(`invalid limit '${opts.limit}', expected a non-negative integer`);
			}
			await MainHelper.gotoPageProfile(handle);
			const posts = await MainHelper.exportRecentPosts(handle, limit);
			if (opts.format === 'json') {
				console.log(JSON.stringify(posts));
				return;
			}
			console.log(TwitterRecentPostsHelper.formatMarkdown(posts));
		});

	program
		.command('dm_send <handle> <message>')
		.description('Send a message in an existing conversation. (assume you did \'dm_page\' first)')
		.action(async (handle: string, message: string) => {
			await MainHelper.selectConversation(handle);
			await MainHelper.fillAndSendMessage(message);
		});

	await program.parseAsync();
}

void main();
