#!/usr/bin/env node

// node imports
import * as Assert from 'node:assert/strict';

// npm imports
import { Command, Option } from 'commander';
import { z } from "zod";
import * as A11yParse from "../../../a11y_parse/dist/src/index.js";

// local imports
import { McpMyClient } from "./libs/mcp_client.js";
import { McpProxy } from "./libs/mcp_proxy.js";
import { PlaywrightA11yConverter } from "./libs/playwright_a11y_helper.js";
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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

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


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	private static async _getA11yText(mcpClient: McpMyClient): Promise<string> {
		let snapshotText: string;
		const mcpTarget = await mcpClient.getMcpTarget();
		if (mcpTarget === 'chrome_devtools') {
			// take a snapshot to get the latest accessibility tree
			const toolName = McpTargetHelper.targetToolNameTakeSnapshot(mcpTarget);
			const response = await mcpClient.callTool(toolName, {});
			const responseText = response.content[0]
			if (responseText.type !== "text") throw new Error("Unexpected content type");

			// get the snapshot text and remove the first line (snapshot metadata)	
			snapshotText = responseText.text;
			snapshotText = snapshotText.split('\n').slice(1).join('\n');
		} else if (mcpTarget === 'playwright') {
			const toolName = McpTargetHelper.targetToolNameTakeSnapshot(mcpTarget);
			const response = await mcpClient.callTool(toolName, {});
			const responseText = response.content[0]
			if (responseText.type !== "text") throw new Error("Unexpected content type");
			snapshotText = PlaywrightA11yConverter.convertToChromeDevtools(responseText.text);
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}

		// sanity check
		Assert.ok(snapshotText !== undefined, "Snapshot text is empty");

		return snapshotText;
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
	): string {
		let text: string = `## Node found for selector '${selector}' (${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}${withAncestors ? ', with ancestors' : ''}):\n`;
		if (withAncestors) {
			if (selectedNodes.length === 0) {
				text += "No node found";
			} else {
				const ancestorTree = A11yParse.A11yTree.buildAncestorTree(selectedNodes);
				text += A11yParse.A11yTree.stringify(ancestorTree);
			}
		} else {
			for (const selectedNode of selectedNodes) {
				text += A11yParse.A11yTree.stringify(selectedNode) + '\n';
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

			responseTexts.push(this._formatSelectedNodes(querySelector.selector, selectedNodes, querySelector.withAncestors));
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
			responseTexts.push(this._formatSelectedNodes(querySelector.selector, firstNode, querySelector.withAncestors));
		}

		return responseTexts.join('\n');
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async initExternalTools(mcpServer: McpServer, mcpClient: McpMyClient): Promise<void> {
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
				// query the accessibility tree with the provided selector
				const outputText: string = await MainHelper.querySelectorsAll(mcpClient, querySelectorsInput);

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
				const outputText: string = await MainHelper.querySelectors(mcpClient, querySelectorsInput);
				debugger
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
					await mcpClient.callTool('press_key', { key });
				}

				// return a response indicating which keys were pressed
				return {
					content: [{ type: "text", text: `Pressed keys: ${keysToSend.join(', ')}` }],
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
				const uid = await MainHelper._resolveSelectorToUid(mcpClient, selector);
				return await mcpClient.callTool('click', { uid });
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
				const resolved = await Promise.all(elements.map(async (element) => ({
					uid: await MainHelper._resolveSelectorToUid(mcpClient, element.selector),
					value: element.value,
				})));
				return await mcpClient.callTool('fill_form', { elements: resolved });
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
				return {
					content: [{ type: "text", text: formatted }],
				};
			}
		);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static async commandMcpServer({
		mcpTarget,
		verbose = false,
	}: {
		mcpTarget: FastBrowserMcpTarget,
		verbose?: boolean
	}): Promise<void> {
		debugger
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		//	mcp client
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		const { command: mcpCommand, args: mcpArgs } = McpTargetHelper.mcpArgs(mcpTarget!);

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
						limit: 0,
					},
					{
						selector: 'heading[level="1"]',
						withAncestors: false,
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

		// Connect the MCP proxy server to start accepting connections from MCP clients (e.g. LLM agents).
		await mcpProxy.connect();

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

		const mcpServer = await mcpProxy.getMcpServer();
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
				// query the accessibility tree with the provided selector
				const outputText: string = await MainHelper.querySelectorsAll(mcpClient, querySelectorsInput);

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
				const outputText: string = await MainHelper.querySelectors(mcpClient, querySelectorsInput);
				debugger
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
					await mcpClient.callTool('press_key', { key });
				}

				// return a response indicating which keys were pressed
				return {
					content: [{ type: "text", text: `Pressed keys: ${keysToSend.join(', ')}` }],
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
				const uid = await MainHelper._resolveSelectorToUid(mcpClient, selector);
				return await mcpClient.callTool('click', { uid });
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
				const resolved = await Promise.all(elements.map(async (element) => ({
					uid: await MainHelper._resolveSelectorToUid(mcpClient, element.selector),
					value: element.value,
				})));
				return await mcpClient.callTool('fill_form', { elements: resolved });
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
				return {
					content: [{ type: "text", text: formatted }],
				};
			}
		);
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main() {
	const program = new Command();

	// chrome_devtools
	// playwright



	program
		.command('mcp_server')
		.description('Start the MCP proxy server')
		.option('-v, --verbose', 'Enable verbose logging')
		.addOption(new Option('-b, --mcp_target <mcpTarget>', 'the MCP> of MCP to run').choices(['chrome_devtools', 'playwright']).default('chrome_devtools'))
		.action(async (options: { verbose?: boolean, mcp_target: FastBrowserMcpTarget }) => {
			await MainHelper.commandMcpServer({
				mcpTarget: options.mcp_target,
				verbose: options.verbose,
			});
		});

	program.parse(process.argv);
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();