#!/usr/bin/env npx tsx

// npm imports
import { Command, Option } from 'commander';
import { FastBrowserHelper } from './fastbrowser_helper.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class WttjSearch {
	static parseJobTitles(output: string): Array<{ title: string; url: string; }> {
		const results: Array<{ title: string; url: string; }> = [];
		const headingRe = /heading "(.+?)" level/g;
		const urlRe = /url="([^"]+)"/;
		for (const line of output.split('\n')) {
			const headingMatch = headingRe.exec(line);
			if (headingMatch === null) continue;
			const urlMatch = urlRe.exec(line);
			results.push({
				title: headingMatch[1],
				url: urlMatch !== null ? urlMatch[1] : '',
			});
			headingRe.lastIndex = 0;
		}
		return results;
	}

	static outputJson(jobs: Array<{ title: string; url: string; }>): void {
		console.log(JSON.stringify(jobs, null, 2));
	}

	static outputMarkdown(jobs: Array<{ title: string; url: string; }>): void {
		console.log('| # | Title | URL |');
		console.log('|---|-------|-----|');
		for (const [i, job] of jobs.entries()) {
			const url = job.url !== '' ? `[link](${job.url})` : '';
			console.log(`| ${i + 1} | ${job.title} | ${url} |`);
		}
	}

	static run(query: string, limit: number = 1, offset: number = 1, format: 'json' | 'markdown' = 'markdown'): void {
		FastBrowserHelper.navigatePage('https://www.welcometothejungle.com/fr');
		FastBrowserHelper.fillForm('combobox[name*="intitulé de poste"]', query);
		FastBrowserHelper.pressKeys('Enter');

		let allJobs: Array<{ title: string; url: string; }> = [];

		for (let page = offset; page < offset + limit; page++) {
			if (page > 1) {
				FastBrowserHelper.click(`link[name="${page}"]`);
			}
			const output = FastBrowserHelper.querySelectorsAll('heading[level="2"]', 30);
			allJobs = allJobs.concat(WttjSearch.parseJobTitles(output));
		}

		if (format === 'json') {
			WttjSearch.outputJson(allJobs);
		} else {
			WttjSearch.outputMarkdown(allJobs);
		}
	}
}

///////////////////////////////////////////////////////////////////////////////

const program = new Command();
program
	.argument('[query]', 'job search query', 'machine learning')
	.option('-l, --limit <number>', 'number of pages to fetch', '1')
	.option('-o, --offset <number>', 'first page to scrape', '1')
	.addOption(new Option('-f, --format <format>', 'output format: json or markdown').choices(['json', 'markdown']).default('markdown'))
	.parse();

const opts = program.opts();
const query = program.args[0] ?? 'machine learning';
const limit = Number(opts['limit']);
const offset = Number(opts['offset']);
const format: 'json' | 'markdown' = opts['format'] === 'json' ? 'json' : 'markdown';
WttjSearch.run(query, limit, offset, format);
