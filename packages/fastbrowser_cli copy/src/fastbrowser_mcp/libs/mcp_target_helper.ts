import { ta } from "zod/locales";
import { FastBrowserMcpTarget } from "../fastbrowser_types";

export type TargetToolConfig = {
	toolName: string;
	toolArgs: Record<string, unknown>;
};

export class McpTargetHelper {
	static EXTERNAL_TOOL_NAME = {
		listPages: "list_pages",
		newPage: "new_page",
		closePage: "close_page",
		takeSnapshot: "take_snapshot",
		navigatePage: "navigate_page",
		querySelectorsAll: "querySelectorsAll",
		querySelectors: "querySelectors",
		pressKeys: "pressKeys",
		click: "click",
		fillForm: "fill_form",
		getCurrentDateTime: "get_current_datetime",
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	For configuration
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	static mcpArgs(mcpTarget: FastBrowserMcpTarget): { command: string; args: string[] } {
		let mcpCommand: string;
		let mcpArgs: string[];
		if (mcpTarget === 'chrome_devtools') {
			mcpCommand = "npx";
			mcpArgs = ["chrome-devtools-mcp@latest", "--autoconnect", "--no-performance-crux", "--no-usage-statistics"];
		} else if (mcpTarget === 'playwright') {
			// npx @playwright/mcp@latest --cdp-endpoint=chrome
			// npx @playwright/mcp@latest --cdp-endpoint=http://localhost:9222
			// npx @playwright/mcp@latest --extension
			// 
			// https://playwright.dev/mcp/configuration/browser-extension#connect-via-browser-extension
			// https://github.com/microsoft/playwright/tree/main/packages/extension
			mcpCommand = "npx";
			mcpArgs = ["@playwright/mcp", "--extension"];
		} else {
			throw new Error(`Unsupported MCP type: ${mcpTarget}`);
		}

		return { command: mcpCommand, args: mcpArgs };
	}

	static async toolsToProxy(mcpTarget: FastBrowserMcpTarget): Promise<string[]> {
		const toolsToProxys: string[] = []
		if (mcpTarget === 'chrome_devtools') {
			toolsToProxys.push(...[
				'list_pages',
				'new_page',
				'close_page',
				'navigate_page',
				// 'take_snapshot',
			])
		} else if (mcpTarget === 'playwright') {
			toolsToProxys.push(...[
				'browser_tabs',
				'browser_navigate',
				// 'browser_snapshot',
			])
		} else {
			throw new Error(`Unsupported MCP type: ${mcpTarget}`);
		}
		return toolsToProxys;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	For each target tool
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////


	static async targetToolListPages(mcpTarget: FastBrowserMcpTarget): Promise<TargetToolConfig> {
		if (mcpTarget === 'chrome_devtools') {
			return {
				toolName: 'list_pages', toolArgs: {
					// No arguments needed for listing pages in Chrome DevTools MCP
				}
			};
		} else if (mcpTarget === 'playwright') {
			return {
				toolName: 'browser_tabs', toolArgs: {
					action: 'list',
				}
			};
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async targetToolNavigatePage(mcpTarget: FastBrowserMcpTarget, url: string): Promise<TargetToolConfig> {
		if (mcpTarget === 'chrome_devtools') {
			return {
				toolName: 'navigate_page', toolArgs: {
					url
				}
			};
		} else if (mcpTarget === 'playwright') {
			return {
				toolName: 'browser_navigate', toolArgs: {
					url,
				}
			};
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async targetToolTakeSnapshot(mcpTarget: FastBrowserMcpTarget): Promise<TargetToolConfig> {
		if (mcpTarget === 'chrome_devtools') {
			return { toolName: 'take_snapshot', toolArgs: {} };
		} else if (mcpTarget === 'playwright') {
			return { toolName: 'browser_snapshot', toolArgs: {} };
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}

	static async targetToolClick(mcpTarget: FastBrowserMcpTarget, uid: string): Promise<TargetToolConfig> {
		if (mcpTarget === 'chrome_devtools') {
			return { toolName: 'click', toolArgs: { uid } };
		} else if (mcpTarget === 'playwright') {
			return { toolName: 'browser_click', toolArgs: { ref: uid } };
		} else {
			throw new Error(`Unsupported MCP target: ${mcpTarget}`);
		}
	}
}