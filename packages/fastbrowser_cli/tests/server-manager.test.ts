// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';

// local imports
import { ServerManager } from '../src/fastbrowser_cli/libs/server-manager.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type FakeServer = {
	url: string;
	close: () => Promise<void>;
};

async function startFakeServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<FakeServer> {
	const server = http.createServer(handler);
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address() as AddressInfo;
	const url = `http://127.0.0.1:${address.port}`;
	const close = (): Promise<void> => new Promise((resolve, reject) => {
		server.close((err) => (err === undefined || err === null ? resolve() : reject(err)));
	});
	return { url, close };
}

describe('ServerManager.status', () => {
	it("returns 'stopped' when nothing is listening on the URL", async () => {
		// Port 1 is reserved (tcpmux); a connection will be refused.
		const result = await ServerManager.status('http://127.0.0.1:1');
		assert.equal(result, 'stopped');
	});

	it("returns 'stopped' for an unreachable host (DNS or routing failure)", async () => {
		const result = await ServerManager.status('http://127.0.0.1:9');
		assert.equal(result, 'stopped');
	});

	it("returns 'running' when /health responds with { ok: true }", async () => {
		const fake = await startFakeServer((req, res) => {
			if (req.url === '/health') {
				res.setHeader('content-type', 'application/json');
				res.end(JSON.stringify({ ok: true }));
				return;
			}
			res.statusCode = 404;
			res.end();
		});
		try {
			const result = await ServerManager.status(fake.url);
			assert.equal(result, 'running');
		} finally {
			await fake.close();
		}
	});

	it("returns 'stopped' when /health responds with { ok: false }", async () => {
		const fake = await startFakeServer((_req, res) => {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ ok: false }));
		});
		try {
			const result = await ServerManager.status(fake.url);
			assert.equal(result, 'stopped');
		} finally {
			await fake.close();
		}
	});

	it("returns 'stopped' when /health returns non-2xx", async () => {
		const fake = await startFakeServer((_req, res) => {
			res.statusCode = 500;
			res.end('boom');
		});
		try {
			const result = await ServerManager.status(fake.url);
			assert.equal(result, 'stopped');
		} finally {
			await fake.close();
		}
	});

	it('strips trailing slashes from the URL before calling /health', async () => {
		const seenUrls: string[] = [];
		const fake = await startFakeServer((req, res) => {
			seenUrls.push(req.url ?? '');
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ ok: true }));
		});
		try {
			const result = await ServerManager.status(`${fake.url}///`);
			assert.equal(result, 'running');
			assert.deepEqual(seenUrls, ['/health']);
		} finally {
			await fake.close();
		}
	});
});

