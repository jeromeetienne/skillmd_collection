#!/usr/bin/env npx tsx

// npm imports
import * as Commander from 'commander';
import { FastBrowserHelper } from './fastbrowser_helper.js';
import { A11yTree } from 'a11y_parse';

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

	static async outputJson(jobs: Array<JobSearchResult>): Promise<void> {
		console.log(JSON.stringify(jobs, null, 2));
	}

	static async outputMarkdown(jobs: Array<JobSearchResult>): Promise<void> {
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

	static async collectOnePageResults(): Promise<Array<JobSearchResult>> {
		const searchResults: Array<JobSearchResult> = [];
		const a11ySelector = 'link[url^="/fr/companies/"]';
		let outputStr: string = await FastBrowserHelper.querySelectorsAll(a11ySelector, 0);
		// trim output to avoid issues with trailing newlines
		outputStr = outputStr.trim();
		// split output into lines and remove the first line which is a header
		const outputLines = outputStr.split('\n');
		// remove the first line which is a header
		outputLines.shift();

		// parse each line as an axNode and extract the job title and url
		for (const outputLine of outputLines) {
			const axNode = A11yTree.parse(outputLine);
			// sanity check - the axNode should have a 'name' and a 'url' attribute
			if (axNode.name === undefined) {
				throw new Error(`Expected axNode.name to be defined for selector: ${a11ySelector} line: ${outputLine}`);
			}
			if (axNode.attributes['url'] === undefined) {
				throw new Error(`Expected axNode.url to be defined for selector: ${a11ySelector} line: ${outputLine}`);
			}
			// Build the search result object and add it to the results array
			const searchResult: JobSearchResult = {
				title: axNode.name!,
				url: `https://www.welcometothejungle.com${axNode.attributes['url']!}`,
			};
			searchResults.push(searchResult);
		}

		// return the search results
		return searchResults
	}

	static async runSearch(query: string, pageIndexLimit: number = 1, pageIndexOffset: number = 0): Promise<Array<JobSearchResult>> {
		const searchResults: Array<JobSearchResult> = [];
		for (let pageIndex = pageIndexOffset; pageIndex < pageIndexOffset + pageIndexLimit; pageIndex++) {
			// load the page
			const pageUrl = `https://www.welcometothejungle.com/fr/jobs-matches?page=${pageIndex + 1}`;
			FastBrowserHelper.navigatePage(pageUrl);

			// collect results for the current page
			const newSearchResults = await this.collectOnePageResults();
			searchResults.push(...newSearchResults);
		}
		return searchResults;
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


async function main() {
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	const program = new Commander.Command();
	program
		.argument('[query]', 'job search query', 'machine learning')
		.option('-l, --page-limit <number>', 'number of pages to fetch', '1')
		.option('-o, --page-offset <number>', 'first page to scrape', '0')
		.addOption(new Commander.Option('-f, --format <format>', 'output format: json or markdown').choices(['json', 'markdown']).default('markdown'))
		.parse();

	type CliOptions = {
		pageLimit: string;
		pageOffset: string;
		format: 'json' | 'markdown';
	};
	const options: CliOptions = program.opts<CliOptions>();

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// run the search and get results
	const query = program.args[0]
	const limit = Number(options.pageLimit);
	const offset = Number(options.pageOffset);
	const searchResults: Array<JobSearchResult> = await WttjSearch.runSearch(query, limit, offset);

	// Output results in the specified format
	if (options.format === 'json') {
		await WttjSearch.outputJson(searchResults);
	} else if (options.format === 'markdown') {
		await WttjSearch.outputMarkdown(searchResults);
	} else {
		throw new Error(`Unsupported output format: ${options.format}`);
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Entry point
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();