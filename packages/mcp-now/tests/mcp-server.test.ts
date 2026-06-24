// node imports
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Path from 'node:path';

// local imports
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER_PATH = Path.join(__dirname, '..', 'src', 'index.ts');

let transport: StdioClientTransport | undefined;
let client: Client | undefined;

before(async () => {
	transport = new StdioClientTransport({
		command: 'npx',
		args: ['tsx', SERVER_PATH],
	});
	client = new Client({ name: 'mcp-now-test', version: '1.0.0' });
	await client.connect(transport);
}, { timeout: 30000 });

after(async () => {
	if (client !== undefined) {
		await client.close();
	}
});

describe('mcp-now server (stdio)', () => {
	it('advertises the two datetime tools', { timeout: 30000 }, async () => {
		assert.ok(client !== undefined);
		const { tools } = await client.listTools();
		const names = tools.map((tool) => tool.name).sort();
		assert.deepEqual(names, ['get_current_date', 'get_current_datetime']);
	});

	it('returns the current date in the requested timezone', { timeout: 30000 }, async () => {
		assert.ok(client !== undefined);
		const result = await client.callTool({
			name: 'get_current_date',
			arguments: { timezone: 'UTC' },
		});
		const content = result.content as Array<{ type: string; text?: string }>;
		assert.equal(content[0].type, 'text');
		assert.match(content[0].text ?? '', /^\d{4}-\d{2}-\d{2}$/);
	});
});
