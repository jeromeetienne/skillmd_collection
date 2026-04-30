#!/usr/bin/env npx tsx

// npm imports
import { Command, Option } from 'commander';
import { FastBrowserHelper } from './fastbrowser_helper.js';

type JobSearchResult = {
	title: string;
	url: string;
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class WttjSearch {

	private static outputJson(jobs: Array<JobSearchResult>): void {
		console.log(JSON.stringify(jobs, null, 2));
	}

	private static outputMarkdown(jobs: Array<JobSearchResult>): void {
		console.log('| # | Title | URL |');
		console.log('|---|-------|-----|');
		for (const [i, job] of jobs.entries()) {
			const url = job.url !== '' ? `[link](${job.url})` : '';
			console.log(`| ${i + 1} | ${job.title} | ${url} |`);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private static parseJobTitles(output: string): Array<JobSearchResult> {
		const results: Array<JobSearchResult> = [];
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

	// static collectOnePageResults(): Array<JobSearchResult> {
	// }

	static runSearch(query: string, pageIndexLimit: number = 1, pageIndexOffset: number = 1, outputFormat: 'json' | 'markdown' = 'markdown'): void {
		FastBrowserHelper.navigatePage('https://www.welcometothejungle.com/fr');
		FastBrowserHelper.fillForm('combobox[name*="intitulé de poste"]', query);
		FastBrowserHelper.pressKeys('Enter');

		let searchResults: Array<JobSearchResult> = [];

		for (let pageIndex = pageIndexOffset; pageIndex < pageIndexOffset + pageIndexLimit; pageIndex++) {
			if (pageIndex > 1) {
				FastBrowserHelper.click(`link[name="${pageIndex}"]`);
			}
			const output = FastBrowserHelper.querySelectorsAll('heading[level="2"]', 30);
			searchResults = searchResults.concat(WttjSearch.parseJobTitles(output));
		}

		if (outputFormat === 'json') {
			WttjSearch.outputJson(searchResults);
		} else {
			WttjSearch.outputMarkdown(searchResults);
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


async function main() {
	const program = new Command();
	program
		.argument('[query]', 'job search query', 'machine learning')
		.option('-l, --limit <number>', 'number of pages to fetch', '1')
		.option('-o, --offset <number>', 'first page to scrape', '1')
		.addOption(new Option('-f, --format <format>', 'output format: json or markdown').choices(['json', 'markdown']).default('markdown'))
		.parse();

	type CliOptions = {
		limit: string;
		offset: string;
		format: 'json' | 'markdown';
	};
	const options: CliOptions = program.opts<CliOptions>();


	const query = program.args[0] ?? 'machine learning';
	const limit = Number(options['limit']);
	const offset = Number(options['offset']);
	const format: CliOptions['format'] = options['format'] === 'json' ? 'json' : 'markdown';

	WttjSearch.runSearch(query, limit, offset, format);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Entry point
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();