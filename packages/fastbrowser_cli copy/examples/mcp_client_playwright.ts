import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
	// Note: the PLAYWRIGHT_MCP_EXTENSION_TOKEN environment variable is required to authenticate with the Playwright MCP extension.
	const client = new Client({
		name: 'foobar',
		version: '0.1.0',
	});

	const transport = new StdioClientTransport({
		command: 'npx',
		args: ["@playwright/mcp", "--extension"],
		env: {
			PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'd-dwfALmOesZLoS7i-ia8Wf7TWrHtlRMHuVCqAUuiKU' 
		},
	});
	console.log("Connecting to MCP server...");
	await client.connect(transport);
	console.log("Connected!");


	const listToolsResult = await client.listTools()
	console.log("Available tools:", listToolsResult.tools.map(tool => tool.name));

	// const toolResult = await client.callTool({
	// 	name: '', 
	// 	arguments: args 
	// })

	await client.close();
}

void main();