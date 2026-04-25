// node imports
import * as Assert from "assert";

// npm imports
import { CallToolResult } from "@modelcontextprotocol/sdk/types";

// local imports
import { FastBrowserMcpTarget } from "../fastbrowser_types";
import { PlaywrightA11yConverter } from "./playwright_a11y_helper";

export class ResponseFormatter {
	static async formatListPages(mcpTarget: FastBrowserMcpTarget, callToolResult: CallToolResult): Promise<string> {
		const resultContent = callToolResult.content[0]
		if (resultContent.type !== "text") throw new Error("Unexpected content type");
		const resultText: string = resultContent.text

		if (mcpTarget === 'chrome_devtools') {
			// EXAMPLE:
			// ## Pages
			// 1: about:blank
			// 2: https://example.com/ [selected]
			return resultText
		} else if (mcpTarget === 'playwright') {
			// EXAMPLE:
			// ### Result
			// - 0: (current) [Offres d'emploi (CDI, CDD), apprentissages et stages | Welcome to the Jungle](https://www.welcometothejungle.com/fr/jobs?refinementList%5Boffices.country_code%5D%5B%5D=FR&query=machine%20learning&page=1)
			// ### Events
			// - New console entries: .playwright-mcp/console-2026-04-25T10-43-58-002Z.log#L1-L62

			// Convert 'playwright' format to 'chrome_devtools' format for consistency in the CLI output
			const lines = resultText.split('\n');
			// remove the 'Events' section and its lines, if it exists
			const eventsIndex = lines.findIndex(line => line.startsWith('### Events'));
			const linesWithoutEvents = eventsIndex !== -1 ? lines.slice(0, eventsIndex) : lines;
			const pageLines = linesWithoutEvents.filter(line => line.trim().startsWith('- '));
			const formattedLines = pageLines.map(line => {
				// Extract the page index and title/url from the line
				const match = line.trim().match(/- (\d+): (.+)/);
				if (match) {
					const index = match[1];
					const titleAndUrl = match[2];
					// Check if this is the current page (marked with "(current)")
					const isCurrent = titleAndUrl.includes('(current)');
					const titleAndUrlClean = titleAndUrl.replace('(current)', '').trim();
					const urlMatch = titleAndUrlClean.match(/\((https?:\/\/.+)\)/);
					const url = urlMatch ? urlMatch[1] : '';
					return `${index}: ${url}${isCurrent ? ' [selected]' : ''}`;
				} else {
					return line; // If the line doesn't match the expected format, return it unchanged
				}
			});
			const outputStr = `## Pages\n${formattedLines.join('\n')}`;
			return outputStr
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async formatNavigatePage(mcpTarget: FastBrowserMcpTarget, callToolResult: CallToolResult): Promise<string> {
		const resultContent = callToolResult.content[0]
		if (resultContent.type !== "text") throw new Error("Unexpected content type");
		const resultText: string = resultContent.text

		// Target format example:
		// Successfully navigated to https://example.com

		if (mcpTarget === 'chrome_devtools') {
			// EXAMPLE:
			// Successfully navigated to https://example.com
			// ## Pages
			// 1: https://example.com/ [selected]

			// Convert 'chrome_devtools' format to the target format for consistency in the CLI output
			const lines = resultText.split('\n');
			// keep only the first line that contains the navigation result
			Assert.ok(lines.length > 0, "Expected at least one line in the navigate page result");
			const navigateLine = lines[0].trim()
			const outputStr = navigateLine ? navigateLine.trim() : resultText; // Return the navigate line if found, otherwise return the original text
			return outputStr;
		} else if (mcpTarget === 'playwright') {
			// EXAMPLE:
			// ### Ran Playwright code
			// ```js
			// await page.goto('https:/example.com');
			// ```
			// ### Page
			// - Page URL: https://example.com/
			// - Page Title: Example Domain
			// ### Snapshot
			// - [Snapshot](.playwright-mcp/page-2026-04-25T11-24-36-780Z.yml)

			// Convert 'playwright' format to a simpler format for consistency in the CLI output
			const lines = resultText.split('\n');
			const pageUrlLine = lines.find(line => line.trim().startsWith('- Page URL:'));
			const pageUrl = pageUrlLine ? pageUrlLine.replace('- Page URL:', '').trim() : '';
			Assert.ok(pageUrl, "Expected to find a line with the page URL in the navigate page result");
			const outputStr = `Successfully navigated to ${pageUrl}`
			return outputStr;
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async formatTakeSnapshot(mcpTarget: FastBrowserMcpTarget, callToolResult: CallToolResult): Promise<string> {
		// extract the snapshot text from the tool response, which has different formats for chrome_devtools and playwright MCP targets
		if (mcpTarget === 'chrome_devtools') {
			// take a snapshot to get the latest accessibility tree
			const responseText = callToolResult.content[0]
			if (responseText.type !== "text") throw new Error("Unexpected content type");

			// get the snapshot text and remove the first line (snapshot metadata)	
			let snapshotText = responseText.text;
			snapshotText = snapshotText.split('\n').slice(1).join('\n');
			return snapshotText;
		} else if (mcpTarget === 'playwright') {
			const responseText = callToolResult.content[0]
			if (responseText.type !== "text") throw new Error("Unexpected content type");
			const snapshotText = PlaywrightA11yConverter.convertToChromeDevtools(responseText.text);
			return snapshotText;
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async formatClick(mcpTarget: FastBrowserMcpTarget, callToolResult: CallToolResult): Promise<string> {
		const resultContent = callToolResult.content[0]
		if (resultContent.type !== "text") throw new Error("Unexpected content type");
		const resultText: string = resultContent.text

		// Target format example:
		// Successfully clicked on the element

		if (mcpTarget === 'chrome_devtools') {
			// EXAMPLE:
			// Successfully clicked on the element

			return resultText
		} else if (mcpTarget === 'playwright') {
			// EXAMPLE:
			// ### Ran Playwright code`
			// ```js
			// await page.getByRole('link', { name: 'Learn more' }).click();
			// ```
			// ### Page
			// - Page URL: https://www.iana.org/help/example-domains
			// - Page Title: Example Domains
			// ### Snapshot
			// - [Snapshot](.playwrigh`t-mcp/page-2026-04-25T11-56-08-184Z.yml)

			// Convert 'playwright' format to a simpler format for consistency in the CLI output
			const outputStr = `Successfully clicked on the element`
			return outputStr;
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}
}