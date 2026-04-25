// node imports
import Assert from "node:assert";

// npm imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';

// local imports
import { McpMyClient } from "./mcp_client.js";

export class McpProxy {
	private _mcpServer: McpServer;

	constructor() {
		this._mcpServer = new McpServer({
			name: "fastbrowser_mcp",
			version: "1.0.0",
		});
	}

	async connect() {
		const transport = new StdioServerTransport();
		await this._mcpServer.connect(transport);
	}

	async getMcpServer(): Promise<McpServer> {
		if (this._mcpServer === null) {
			throw new Error("MCP server is not initialized");
		}
		return this._mcpServer;
	}

	async proxyToolCall(mcpClient: McpMyClient, toolName: string) {
		const mcpClientTools = await mcpClient.listTools()
		const mcpClientTool = mcpClientTools.find((tool) => tool.name === toolName);
		Assert.ok(mcpClientTool !== undefined, `Tool ${toolName} not found in mcp client tools`)

		const inputSchema = convertJsonSchemaToZod(mcpClientTool.inputSchema as any);
		this._mcpServer.registerTool(toolName, {
			description: mcpClientTool.description,
			inputSchema: inputSchema,
		}, async (...args: any[]) => {
			const callResult = await mcpClient.callTool(toolName, args[0])
			return callResult
		});
	}
}