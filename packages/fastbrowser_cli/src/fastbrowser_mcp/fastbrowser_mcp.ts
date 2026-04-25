#!/usr/bin/env node

// node imports
import * as Assert from 'node:assert/strict';
import Fs from 'node:fs';
import Path from 'node:path';

// npm imports
import { Command, Option } from 'commander';
import { z } from "zod";
import * as A11yParse from "a11y_parse";

// local imports
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


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	private static async _getA11yText(mcpClient: McpMyClient): Promise<string> {
		const mcpTarget = await mcpClient.getMcpTarget();
		const toolConfig = await McpTargetHelper.targetToolTakeSnapshot(mcpTarget);
		const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
		const snapshotText = await ResponseFormatter.formatTakeSnapshot(mcpTarget, callToolResult);
		// sanity check
		Assert.ok(snapshotText !== undefined, "Snapshot text is empty");

		// return the snapshot text
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
				const toolConfig = await McpTargetHelper.targetToolListPages(mcpTarget);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatListPages(mcpTarget, callToolResult);

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
				const toolConfig = await McpTargetHelper.targetToolNavigatePage(mcpTarget, url);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputStr = await ResponseFormatter.formatNavigatePage(mcpTarget, callToolResult);

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
				const a11yText: string = await MainHelper._getA11yText(mcpClient);
				let outputStr = a11yText

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
				const uid = await MainHelper._resolveSelectorToUid(mcpClient, selector);

				const toolConfig = await McpTargetHelper.targetToolClick(mcpTarget, uid);
				const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
				let outputText = await ResponseFormatter.formatClick(mcpTarget, callToolResult);

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
				const resolved = [];
				for (const element of elements) {
					const uid = await MainHelper._resolveSelectorToUid(mcpClient, element.selector);
					resolved.push({
						uid,
						value: element.value,
					});
				}
				if (mcpTarget === 'chrome_devtools') {
					const toolConfig = await McpTargetHelper.targetToolFillForm(mcpTarget, resolved);
					const callToolResult = await mcpClient.callTool(toolConfig.toolName, toolConfig.toolArgs);
					// const callToolResult = await mcpClient.callTool('fill_form', { elements: resolved });
					return callToolResult
				} else if (mcpTarget === 'playwright') {
					type Field = {
						name: string; // Human readable name for the field, e.g. "Email address"
						// type can be textbox, checkbox, radio, combobox, or slider
						type: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider';
						// the uid of the field's corresponding node in the accessibility tree
						ref: string;
						// the value to fill into the field - for checkboxes this can be "checked" or "unchecked", for radio buttons this can be "selected", for comboboxes this can be the option to select, and for sliders this can be the value to set the slider to
						value: string
					};
					const fields: Field[] = resolved.map((element, index) => ({
						name: `Field ${index + 1}`,
						type: 'textbox', // for simplicity, we assume all fields are textboxes in this example
						ref: element.uid,
						value: element.value,
					}));
					const callToolResult = await mcpClient.callTool('browser_fill_form', { fields: fields });
					return callToolResult
				} else {
					throw new Error(`Unsupported MCP target: ${mcpTarget}`);
				}
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
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main() {
	// Redirect process.stderr to a log file, so that the MCP communication is not polluted by logs.
	const logFile = Path.resolve(__dirname, `../../outputs/fastbrowser_mcp_${new Date().toISOString()}.log`);
	const logStream = Fs.createWriteStream(logFile, { flags: 'a' });
	process.stderr.write = logStream.write.bind(logStream);


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