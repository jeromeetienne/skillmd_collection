#!/usr/bin/env node

// node imports
import Fs from 'node:fs';
import Path from 'node:path';

// npm imports
import { Command, Option } from 'commander';
import { z } from "zod";
import * as A11yParse from "a11y_parse";

// local imports
import { Logger } from "../shared/logger.js"
import { McpMyClient } from "./libs/mcp_my_client.js";
import { McpProxy } from "./libs/mcp_proxy.js";
import { ResponseFormatter } from "./libs/response_formatter.js";
import { FastBrowserMcpTarget } from './fastbrowser_types.js';
import {
	QuerySelectorInputSchema,
	QuerySelectorsInputSchema,
	QuerySelectorFirstInputSchema,
	QuerySelectorsFirstInputSchema,
	type QuerySelectorInput,
	type QuerySelectorsInput,
	type QuerySelectorFirstInput,
	type QuerySelectorsFirstInput,
} from "./libs/schemas.js";
import { McpTargetHelper } from './libs/mcp_target_helper.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

export {
	QuerySelectorInputSchema,
	QuerySelectorsInputSchema,
	QuerySelectorFirstInputSchema,
	QuerySelectorsFirstInputSchema,
	type QuerySelectorInput,
	type QuerySelectorsInput,
	type QuerySelectorFirstInput,
	type QuerySelectorsFirstInput,
};

const logger = Logger.fromMetaUrl(import.meta.url, {
	allToStderr: true,
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	/**
	 * Multiple retry... not sure it is actually useful - https://github.com/jeromeetienne/skillmd_collection/issues/47
	 * 
	 * @param mcpClient 
	 * @returns 
	 */
	private static async _getA11yText(mcpClient: McpMyClient): Promise<string> {
		const mcpTarget = await mcpClient.getMcpTarget();
		const toolConfig = await McpTargetHelper.targetToolTakeSnapshot(mcpTarget);

		// `take_snapshot` is racy — for reasons we haven't traced (could be playwright's a11y serializer, the
		// `@playwright/mcp` extension transport, or the chrome extension itself), back-to-back calls on an unchanged
		// page sometimes return incomplete or empty trees. Stabilize by taking snapshots in pairs and only returning
		// once two consecutive ones agree on node count within STABLE_TOLERANCE. On exhaustion, return best-effort
		// rather than throw, so legitimately tiny pages don't break workflows.
		const MAX_ATTEMPTS = 6;
		const RETRY_DELAY_MS = 250;
		const STABLE_TOLERANCE = 2;

		let prev: { text: string; nodeCount: number } | undefined = undefined;
		let last: { text: string; nodeCount: number } = { text: '', nodeCount: 0 };

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
			const text = await ResponseFormatter.formatTakeSnapshot(mcpTarget, callToolResult);
			const nodeCount = MainHelper._countSnapshotNodes(text);
			last = { text, nodeCount };

			if (prev !== undefined && Math.abs(nodeCount - prev.nodeCount) <= STABLE_TOLERANCE) {
				if (nodeCount === 0) {
					logger.warn(`${mcpTarget}:take_snapshot: settled at empty after ${attempt} attempt(s) — returning empty snapshot`);
				}
				return text;
			}

			logger.warn(`${mcpTarget}:take_snapshot: attempt ${attempt}/${MAX_ATTEMPTS}: nodeCount=${nodeCount}, prev=${prev === undefined ? 'n/a' : prev.nodeCount} — not stable, retrying`);

			prev = last;
			if (attempt < MAX_ATTEMPTS) {
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
			}
		}

		logger.warn(`${mcpTarget}:take_snapshot: exhausted ${MAX_ATTEMPTS} attempts without stabilizing — returning best-effort (nodeCount=${last.nodeCount})`);
		return last.text;
	}

	private static _countSnapshotNodes(snapshotText: string): number {
		if (snapshotText.trim().length === 0) return 0;
		let count = 0;
		for (const line of snapshotText.split('\n')) {
			if (line.trim().startsWith('uid=')) {
				count += 1;
			}
		}
		return count;
	}

	/**
	 * TODO to remove this function - just call the .parse
	 * @param mcpClient 
	 * @returns 
	 */
	private static async _getSnapshotTree(mcpClient: McpMyClient): Promise<{ snapshotText: string, a11yTree: A11yParse.AxNode }> {
		const a11yText: string = await this._getA11yText(mcpClient);

		// parse the accessibility tree
		const a11yTree = A11yParse.A11yTree.parse(a11yText);

		// return the parsed accessibility tree
		return { snapshotText: a11yText, a11yTree }
	}

	/**
	 * Takes a snapshot of the current page to get the latest accessibility tree, and parses it into an AxNode tree structure.
	 * @param mcpClient The MCP client to use for taking a snapshot.
	 * @returns The parsed accessibility tree as an AxNode.
	 */
	private static async _resolveSelectorToUid(mcpClient: McpMyClient, selector: string): Promise<string> {
		// Fast path: if the selector is already a uid selector (e.g. "#1_3"), extract and return the uid directly without 
		// taking a snapshot or querying the tree.
		const fastPathMatch = selector.match(/^#([\w-]+)$/);
		if (fastPathMatch !== null) return fastPathMatch[1];

		// Slow path: take a snapshot, parse the tree, and query it with the provided selector to find the uid of the first matching node.
		const { a11yTree } = await this._getSnapshotTree(mcpClient);
		const selectedNodes = A11yParse.A11yQuery.querySelectorAll(a11yTree, selector);
		if (selectedNodes.length === 0) throw new Error(`No node matched selector '${selector}'`);

		return selectedNodes[0].uid;
	}

	/**
	 * Formats a list of selected accessibility-tree nodes into the text block used by
	 * both querySelector and querySelectorsAll responses.
	 */
	private static _formatSelectedNodes(
		selector: string,
		selectedNodes: A11yParse.AxNode[],
		withAncestors: boolean,
		withChildren: boolean,
	): string {
		const nodeCount = selectedNodes.length;
		const pluralS = nodeCount > 1 ? 's' : '';
		const ancestorsText = withAncestors ? ', with ancestors' : '';
		const childrenText = withChildren ? ', with children' : '';
		let text: string = `## Node${pluralS} found for selector '${selector}' (${nodeCount} node${pluralS}${ancestorsText}${childrenText}):`;
		if (selectedNodes.length === 0) {
			if (text.length > 0) text += '\n';
			text += "No node found";
		} else if (withAncestors === true) {
			const subsetTree = A11yParse.A11yTree.buildSubsetTree(selectedNodes, {
				withAncestors: true,
				withChildren,
			});
			if (text.length > 0) text += '\n';
			text += A11yParse.A11yDisplay.stringifyTree(subsetTree);
		} else if (withChildren === true) {
			for (const selectedNode of selectedNodes) {
				if (text.length > 0) text += '\n';
				text += A11yParse.A11yDisplay.stringifyTree(selectedNode);
			}
		} else {
			for (const selectedNode of selectedNodes) {
				if (text.length > 0) text += '\n';
				text += A11yParse.A11yDisplay.stringifyNode(selectedNode);
			}
		}
		text += '\n';
		return text;
	}

	/**
	 * Queries the accessibility tree with the provided CSS-like selectors, and returns a text representation of the results.
	 *
	 * @param mcpClient The MCP client to use for taking a snapshot.
	 * @param querySelectors The selectors to query the accessibility tree with.
	 * @returns A text representation of the query results.
	 */
	static async querySelectorsAll(mcpClient: McpMyClient, querySelectors: QuerySelectorsInput): Promise<string> {
		const { a11yTree } = await this._getSnapshotTree(mcpClient);

		const responseTexts: string[] = [];
		for (const querySelector of querySelectors.selectors) {
			// query the tree with the provided selector
			const selectedNodes = A11yParse.A11yQuery.querySelectorAll(a11yTree, querySelector.selector);

			// honor querySelector.limit by slicing the selected nodes array (but keep ancestors if withAncestors is true)
			if (querySelector.limit > 0) {
				selectedNodes.splice(querySelector.limit);
			}

			responseTexts.push(this._formatSelectedNodes(querySelector.selector, selectedNodes, querySelector.withAncestors, querySelector.withChildren));
		}

		// join the response texts for all selectors and return
		const responseText = responseTexts.join('\n');
		return responseText;
	}

	/**
	 * Queries the accessibility tree with one or more CSS-like selectors. For each selector,
	 * returns a text representation of the first matching node (or "No node found").
	 *
	 * @param mcpClient The MCP client to use for taking a snapshot.
	 * @param querySelectors The selectors to query the accessibility tree with.
	 * @returns A text representation of the first matching node for each selector.
	 */
	static async querySelectors(mcpClient: McpMyClient, querySelectors: QuerySelectorsFirstInput): Promise<string> {
		const { a11yTree } = await this._getSnapshotTree(mcpClient);

		const responseTexts: string[] = [];
		for (const querySelector of querySelectors.selectors) {
			const selectedNodes = A11yParse.A11yQuery.querySelectorAll(a11yTree, querySelector.selector);
			const firstNode = selectedNodes.length > 0 ? [selectedNodes[0]] : [];
			responseTexts.push(this._formatSelectedNodes(querySelector.selector, firstNode, querySelector.withAncestors, querySelector.withChildren));
		}

		return responseTexts.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Init external tools (i.e. tools that are implemented in terms of calls to the mcpClient, rather than directly registered on the mcpClient)
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async initExternalTools(mcpServer: McpServer, mcpClient: McpMyClient): Promise<void> {
		const mcpTarget = await mcpClient.getMcpTarget();

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	list_pages
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.listPages,
			{
				description: "List the open pages/tabs in the browser",
				inputSchema: z.object({}),
			},
			async () => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.listPages}: listing pages`);

				const toolConfig = await McpTargetHelper.targetToolListPages(mcpTarget);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatListPages(mcpTarget, callToolResult);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.listPages}: output:`)
				logger.warn(`${outputStr}`);
				return {
					content: [{ type: "text", text: outputStr }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	new_page
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.newPage,
			{
				description: "Open a new browser page/tab at the given URL",
				inputSchema: z.object({
					url: z.string().describe("The URL to open in the new page"),
				}),
			},
			async ({ url }: { url: string }) => {
				// NOTE: when running on playwright MCP, we use the navigate_page tool instead of new_page, because 
				// playwright MCP's new_page tool open a new tab but not in the tag-group... so we cant controls it
				// it is happening even when using playwright mcp directly
				//
				// const toolConfig = await McpTargetHelper.targetToolNewPage(mcpTarget, url);
				// const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				// let outputStr = await ResponseFormatter.formatNewPage(mcpTarget, callToolResult, url);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.newPage}: url=${url}`);


				// so working around this by calling the navigate_page tool instead of new_page when the target is playwright
				const toolConfig = await McpTargetHelper.targetToolNavigatePage(mcpTarget, url);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatNavigatePage(mcpTarget, callToolResult);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.newPage}: output:`)
				logger.warn(`${outputStr}`);

				return {
					content: [{ type: "text", text: outputStr }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	close_page
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.closePage,
			{
				description: "Close a browser page/tab by its id (as listed by list_pages)",
				inputSchema: z.object({
					pageId: z.number().describe("The id of the page to close"),
				}),
			},
			async ({ pageId }: { pageId: number }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.closePage}: pageId=${pageId}`);

				const toolConfig = await McpTargetHelper.targetToolClosePage(mcpTarget, pageId);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatClosePage(mcpTarget, callToolResult, pageId);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.closePage}: output:`)
				logger.warn(`${outputStr}`);

				return {
					content: [{ type: "text", text: outputStr }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	navigate_page
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.navigatePage,
			{
				description: "Navigate the current page to a new URL",
				inputSchema: z.object({
					url: z.string().describe("The URL to navigate to"),
				}),
			},
			async ({ url }: { url: string }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.navigatePage}: url=${url}`);

				const toolConfig = await McpTargetHelper.targetToolNavigatePage(mcpTarget, url);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatNavigatePage(mcpTarget, callToolResult);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.navigatePage}: output:`)
				logger.warn(`${outputStr}`);

				return {
					content: [{ type: "text", text: outputStr }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	list_pages
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.takeSnapshot,
			{
				description: "Take a snapshot of the current page to get the latest accessibility tree",
				inputSchema: z.object({}),
			},
			async () => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.takeSnapshot}: taking snapshot`);

				const a11yText: string = await MainHelper._getA11yText(mcpClient);
				let outputStr = a11yText

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.takeSnapshot}: output:`);
				logger.warn(`${outputStr}`);

				return {
					content: [{ type: "text", text: outputStr }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	.querySelectorsAll tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		const cssSelectorLanguageDescription = [
			`The selector syntax is similar to CSS selectors, but with some differences and limitations:`,
			``,
			`- You can select by role: e.g. "button", "link", "heading"`,
			`- You can select by uid: e.g. "#1_3"`,
			`- You can select by attribute equals: e.g. 'link[name="Learn more"]'`,
			`- You can select by attribute starts-with: e.g. 'link[url^="https://iana.org"]'`,
			`- You can select by attribute exists: e.g. 'heading[level]'`,
			`- You can select descendants: e.g. "RootWebArea link"`,
			`- You can select direct children: e.g. "RootWebArea > heading"`,
			`- You can use union: e.g. "heading, link"`,
			`- You can combine selectors: e.g. 'RootWebArea > link[url*="iana"]'`,
		].join('\n');

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectorsAll,
			{
				description: [
					`Query the accessibility tree with CSS-like selectors`,
					`Selector syntax: ${cssSelectorLanguageDescription} `,
				].join('\n'),
				inputSchema: QuerySelectorsInputSchema,
			},
			async (querySelectorsInput: QuerySelectorsInput) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectorsAll}: querying selectors: ${JSON.stringify(querySelectorsInput)}`);

				// query the accessibility tree with the provided selector
				const outputText: string = await MainHelper.querySelectorsAll(mcpClient, querySelectorsInput);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectorsAll}: output:`);
				logger.warn(`${outputText}`);

				return {
					content: [{ type: "text", text: outputText }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	.querySelectors tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectors,
			{
				description: [
					`Query the accessibility tree with one or more CSS-like selectors. For each selector, returns the first matching node (or "No node found").`,
					`Selector syntax: ${cssSelectorLanguageDescription} `,
				].join('\n'),
				inputSchema: QuerySelectorsFirstInputSchema,
			},
			async (querySelectorsInput: QuerySelectorsFirstInput) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectors}: querying selectors: ${JSON.stringify(querySelectorsInput)}`);

				const outputText: string = await MainHelper.querySelectors(mcpClient, querySelectorsInput);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.querySelectors}: output:`);
				logger.warn(`${outputText}`);

				return {
					content: [{ type: "text", text: outputText }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	pressKeys tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.pressKeys,
			{
				description: "Press a sequence of keys on the page. E.g. 'Tab', 'Enter', 'ArrowDown'",
				inputSchema: z.object({
					keys: z.string().describe("The keys to press, in order, comma-separated. E.g. 'Hello, Tab, Enter, ArrowDown'"),
				}),
			},
			async ({ keys }: { keys: string }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.pressKeys}: pressing keys: ${keys}`);

				// Build the list of keys to send, splitting regular characters into individual key presses, but keeping special keys as-is
				const keysToSend: string[] = [];
				const keysSplit = keys.split(',').map((key) => key.trim());
				for (const key of keysSplit) {
					const specialKeys = ['Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Backspace', 'Delete'];
					if (specialKeys.includes(key)) {
						keysToSend.push(key);
					} else {
						// for regular characters, we need to split them into individual key presses
						for (const char of key) {
							keysToSend.push(char);
						}
					}
				}
				console.error("Keys to send:", keysToSend);
				// chrome-devtools-mcp's 'press_key' tool accepts a single 'key' per call — loop through the sequence
				for (const key of keysToSend) {
					const toolConfig = await McpTargetHelper.targetToolPressKey(mcpTarget, key);
					const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
					// trying to handle the error case
					if (callToolResult.isError) {
						console.error(`Error pressing key '${key}':`, callToolResult.error);
						return {
							content: [{ type: "text", text: `Error pressing key '${key}'` }],
						};
					}
				}

				let outputText = await ResponseFormatter.formatPressKeys(mcpTarget, keysToSend);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.pressKeys}: output:`);
				logger.warn(`${outputText}`);

				// return a response indicating which keys were pressed
				return {
					content: [{ type: "text", text: outputText }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	click tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.click,
			{
				description: [
					`Click an element selected by an accessibility selector.`,
					`Selector syntax: ${cssSelectorLanguageDescription} `,
				].join('\n'),
				inputSchema: {
					selector: z.string().describe('Accessibility selector (e.g. "#1_3" or \'button[name="Submit"]\')'),
				},
			},
			async ({ selector }: { selector: string }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.click}: clicking selector: ${selector}`);

				const uid = await MainHelper._resolveSelectorToUid(mcpClient, selector);
				const toolConfig = await McpTargetHelper.targetToolClick(mcpTarget, uid);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputText = await ResponseFormatter.formatClick(mcpTarget, callToolResult);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.click}: output:`);

				return {
					content: [{ type: "text", text: outputText }],
				};
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	fill_form tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.fillForm,
			{
				description: [
					`Fill one or more form fields, each selected by an accessibility selector.`,
					`Selector syntax: ${cssSelectorLanguageDescription} `,
				].join('\n'),
				inputSchema: {
					elements: z.array(z.object({
						selector: z.string().describe('Accessibility selector for the form field'),
						value: z.string().describe('Value to fill into the field'),
					})).describe('Elements to fill, each with a selector and a value'),
				},
			},
			async ({ elements }: { elements: { selector: string; value: string }[] }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.fillForm}: filling form with elements: ${JSON.stringify(elements)}`);

				const resolved = [];
				for (const element of elements) {
					const uid = await MainHelper._resolveSelectorToUid(mcpClient, element.selector);
					resolved.push({
						uid,
						value: element.value,
					});
				}
				let callToolResult: CallToolResult;
				if (mcpTarget === 'chrome_devtools') {
					const toolConfig = await McpTargetHelper.targetToolFillForm(mcpTarget, resolved);
					callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				} else if (mcpTarget === 'playwright') {
					type Field = {
						name: string; // Human readable name for the field, e.g. "Email address"
						// type can be textbox, checkbox, radio, combobox, or slider
						type: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider';
						// the uid of the field's corresponding node in the accessibility tree
						target: string;
						// the value to fill into the field - for checkboxes this can be "checked" or "unchecked", for radio buttons this can be "selected", for comboboxes this can be the option to select, and for sliders this can be the value to set the slider to
						value: string
					};
					const fields: Field[] = resolved.map((element, index) => ({
						name: `Field ${index + 1}`,
						type: 'textbox', // for simplicity, we assume all fields are textboxes in this example
						target: element.uid,
						value: element.value,
					}));
					callToolResult = await mcpClient.callTool('browser_fill_form', { fields: fields });
				} else {
					throw new Error(`Unsupported MCP target: ${mcpTarget}`);
				}

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.fillForm}: output:`);
				logger.warn(`${JSON.stringify(callToolResult)}`);

				return callToolResult
			}
		);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	.get_current_datetime tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		const timezoneSchema = {
			timezone: z.string().optional().describe("IANA timezone name (e.g. 'America/New_York'). Defaults to local system timezone."),
		};
		mcpServer.registerTool(
			McpTargetHelper.EXTERNAL_TOOL_NAME.getCurrentDateTime,
			{
				description: "Get the current date and time",
				inputSchema: timezoneSchema,
			},
			async ({ timezone }) => {
				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.getCurrentDateTime}: getting current date and time with timezone: ${timezone ?? 'local system timezone'}`);


				const date = new Date();
				const options: Intl.DateTimeFormatOptions = {
					timeZone: timezone,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					timeZoneName: "short",
				};
				const formatted = new Intl.DateTimeFormat("en-US", options).format(date);

				// log the events
				logger.warn(`${mcpTarget}:${McpTargetHelper.EXTERNAL_TOOL_NAME.getCurrentDateTime}: output: ${formatted}`);

				return {
					content: [{ type: "text", text: formatted }],
				};
			}
		);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	.commandMcpServer: the main entry point for starting the MCP proxy server, which connects to the MCP 
	// 	target (e.g. chrome-devtools-mcp), proxies tools from the MCP target, and registers external tools that 
	// 	are implemented in terms of calls to the MCP target.
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async commandMcpServer({
		mcpTarget,
		verbose = false,
	}: {
		mcpTarget: FastBrowserMcpTarget,
		verbose?: boolean
	}): Promise<void> {
		// Redirect process.stderr to a log file, so that the MCP communication is not polluted by logs.
		const logFile = Path.resolve(import.meta.dirname, `../../outputs/fastbrowser_mcp_${new Date().toISOString()}.log`);
		const logStream = Fs.createWriteStream(logFile, { flags: 'a' });
		process.stderr.write = logStream.write.bind(logStream);

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	mcp client
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		const { command: mcpCommand, args: mcpArgs } = McpTargetHelper.mcpArgs(mcpTarget);

		// TODO remove this MCPMyClient - confusing

		// Create the mcp client toward the official chrome-devtools-mcp tool, which provides access to a Chrome tab's accessibility 
		// tree and allows us to take snapshots and query the tree with selectors.
		const mcpClient = new McpMyClient({
			name: "fastbrowser_mcp_proxy_client",
			version: "1.0.0",
			mcpTarget,
			transport: {
				type: "stdio",
				command: mcpCommand,
				args: mcpArgs,
			},
		});

		// Connect the mcp client to the chrome-devtools-mcp tool, which will allow us to take snapshots and query the accessibility tree.
		await mcpClient.connect();

		// If verbose mode is enabled, list all the tools available in the mcpClient for debugging purposes.
		if (verbose) {
			// list all the tools available in mcpClient for debugging
			const mcpClientTools = await mcpClient.listTools();
			console.error("Tools available in mcpClient:");
			for (const tool of mcpClientTools) {
				console.error(`- ${tool.name}: ${tool.description}`);
			}
		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		if (false) {
			await mcpClient.callTool('navigate_page', {
				// url: "https://www.example.com/",
				url: "https://welcometothejungle.com/"
			});
			const responseText = await MainHelper.querySelectorsAll(mcpClient, {
				selectors: [
					{
						selector: "link, button",
						withAncestors: true,
						withChildren: false,
						limit: 0,
					},
					{
						selector: 'heading[level="1"]',
						withAncestors: false,
						withChildren: false,
						limit: 0,
					},
				],
			});
			console.log(responseText);
			await mcpClient.close();
			process.exit(0);
		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		// Create the MCP proxy server, which will expose tools to the MCP client and proxy calls to those tools to 
		// the mcpClient connected to the chrome-devtools-mcp.
		const mcpProxy = new McpProxy();

		// Proxy the 'most interesting' tools from the mcpClient to the mcpProxy, so that they can be called from the 
		// MCP server (and thus from an LLM agent connected to the MCP server).
		const toolsToProxys: string[] = await McpTargetHelper.toolsToProxy(mcpTarget);
		for (const toolName of toolsToProxys) {
			await mcpProxy.proxyToolCall(mcpClient, toolName)
		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	.querySelectorsAll tool implementation
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		const mcpServer = await mcpProxy.getMcpServer();
		await MainHelper.initExternalTools(mcpServer, mcpClient);

		// Connect the MCP proxy server to start accepting connections from MCP clients (e.g. LLM agents).
		await mcpProxy.connect();
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	.commandTargetTools: connect to the target MCP and print each tool's name, description, and input schema.
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async commandTargetTools({
		mcpTarget,
	}: {
		mcpTarget: FastBrowserMcpTarget,
	}): Promise<void> {
		const { command: mcpCommand, args: mcpArgs } = McpTargetHelper.mcpArgs(mcpTarget);

		const mcpClient = new McpMyClient({
			name: 'fastbrowser_target_tools_client',
			version: '1.0.0',
			mcpTarget,
			transport: {
				type: 'stdio',
				command: mcpCommand,
				args: mcpArgs,
			},
		});

		await mcpClient.connect();
		try {
			const tools = await mcpClient.listTools();
			console.log(`# Tools available on MCP target '${mcpTarget}' (${tools.length})\n`);
			for (const tool of tools) {
				console.log(`## ${tool.name}`);
				console.log('');
				console.log(`### Description`)
				console.log(`${tool.description ?? '(no description)'}`);
				console.log('');
				console.log(`### Input schema`);
				console.log("```");
				console.log(JSON.stringify(tool.inputSchema, null, 2));
				console.log("```");
				console.log('');
			}
		} finally {
			await mcpClient.close();
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main() {
	// throw Error("This entry point is not meant to be run directly. Please run one of the npm scripts defined in package.json, e.g. 'npm run start:fastbrowser_mcp' or 'npm run inspect:fastbrowser_mcp:chrome_devtools'");

	const program = new Command();
	program
		.command('mcp_server')
		.description('Start the MCP proxy server')
		.option('-v, --verbose', 'Enable verbose logging')
		.addOption(
			new Option('-b, --mcp_target <mcpTarget>', 'the MCP> of MCP to run')
				.choices(['chrome_devtools', 'playwright'])
				.default('playwright')
		)
		.action(async (options: { verbose?: boolean, mcp_target: FastBrowserMcpTarget }) => {
			await MainHelper.commandMcpServer({
				mcpTarget: options.mcp_target,
				verbose: options.verbose,
			});
		});

	program
		.command('target_tools')
		.description('List the tools exposed by the target MCP (name, description, input schema)')
		.addOption(
			new Option('-b, --mcp_target <mcpTarget>', 'the MCP target to introspect')
				.choices(['chrome_devtools', 'playwright'])
				.default('playwright')
		)
		.action(async (options: { mcp_target: FastBrowserMcpTarget }) => {
			await MainHelper.commandTargetTools({
				mcpTarget: options.mcp_target,
			});
		});

	// display help if no command is provided
	if (process.argv.length < 3) {
		program.help();
		process.exit(1);
	}

	// Parse the command-line arguments and execute the appropriate command action.
	program.parse(process.argv);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();