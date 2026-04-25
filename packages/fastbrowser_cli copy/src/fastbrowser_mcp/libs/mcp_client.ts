// node import
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { CallToolResult, Prompt, Resource, Tool } from "@modelcontextprotocol/sdk/types.js";
import { FastBrowserMcpTarget } from "../fastbrowser_types";

export type StdioConfig = {
	type: "stdio";
	command: string;
	args?: string[];
	env?: Record<string, string>;
};

export type HttpConfig = {
	type: "http";
	url: string;
	headers?: Record<string, string>;
};

export type McpTransportConfig = StdioConfig | HttpConfig;

export interface McpClientOptions {
	name: string;
	version: string;
	mcpTarget: FastBrowserMcpTarget;
	transport: McpTransportConfig;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// TODO remove this function - it seems to do vastly nothing - more confusing that helpful
// - i use the McpServer directly, and i got a wrapper for the client... discrepancy is confusing
export class McpMyClient {
	private readonly client: Client;
	private transport?: Transport;
	private mcpTarget: FastBrowserMcpTarget;
	private connected = false;

	constructor(private readonly options: McpClientOptions) {
		this.mcpTarget = options.mcpTarget;
		this.client = new Client({
			name: options.name,
			version: options.version,
		});
	}

	async getMcpTarget(): Promise<FastBrowserMcpTarget> {
		return this.mcpTarget;
	}

	async connect(): Promise<void> {
		if (this.connected) return;

		this.transport = this.createTransport(this.options.transport);
		await this.client.connect(this.transport);
		this.connected = true;
	}

	async close(): Promise<void> {
		if (!this.connected) return;
		await this.client.close();
		this.connected = false;
	}

	async listTools(): Promise<Tool[]> {
		this.assertConnected();
		const { tools } = await this.client.listTools();
		return tools;
	}

	async callTool(
		name: string,
		args: Record<string, unknown> = {},
	): Promise<CallToolResult> {
		this.assertConnected();
		return this.client.callTool({ name, arguments: args }) as Promise<CallToolResult>;
	}

	async listResources(): Promise<Resource[]> {
		this.assertConnected();
		const { resources } = await this.client.listResources();
		return resources;
	}

	async readResource(uri: string): Promise<unknown> {
		this.assertConnected();
		return this.client.readResource({ uri });
	}

	async listPrompts(): Promise<Prompt[]> {
		this.assertConnected();
		const { prompts } = await this.client.listPrompts();
		return prompts;
	}

	async getPrompt(name: string, args: Record<string, string> = {}) {
		this.assertConnected();
		return this.client.getPrompt({ name, arguments: args });
	}

	private createTransport(config: McpTransportConfig): Transport {
		switch (config.type) {
			case "stdio":
				return new StdioClientTransport({
					command: config.command,
					args: config.args ?? [],
					env: config.env,
				});
			case "http":
				return new StreamableHTTPClientTransport(new URL(config.url), {
					requestInit: { headers: config.headers },
				});
		}
	}

	private assertConnected(): void {
		if (!this.connected) {
			throw new Error("McpClient is not connected. Call connect() first.");
		}
	}
}