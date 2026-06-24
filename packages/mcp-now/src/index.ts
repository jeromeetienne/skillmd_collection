#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { DatetimeFormatter } from './datetime-formatter.js';

const server = new McpServer({
	name: 'mcp-now',
	version: '1.0.0',
});

const timezoneSchema = {
	timezone: z.string().optional().describe("IANA timezone name (e.g. 'America/New_York'). Defaults to local system timezone."),
};

server.registerTool(
	'get_current_datetime',
	{
		description: 'Get the current date and time',
		inputSchema: timezoneSchema,
	},
	async ({ timezone }) => {
		const formatted = DatetimeFormatter.formatDatetime(new Date(), timezone);
		return {
			content: [{ type: 'text', text: formatted }],
		};
	}
);

server.registerTool(
	'get_current_date',
	{
		description: 'Get the current date (without time)',
		inputSchema: timezoneSchema,
	},
	async ({ timezone }) => {
		const formatted = DatetimeFormatter.formatDate(new Date(), timezone);
		return {
			content: [{ type: 'text', text: formatted }],
		};
	}
);

async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
