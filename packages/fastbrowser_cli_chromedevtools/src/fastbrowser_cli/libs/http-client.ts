// local imports
import { ToolResponseSchema, type ToolResponse } from '../../fastbrowser_httpd/libs/tool-schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class HttpClient {
	static getServerUrl(overrideUrl: string | undefined): string {
		if (overrideUrl !== undefined && overrideUrl !== '') return overrideUrl;
		const envUrl = process.env.FASTBROWSER_SERVER;
		if (envUrl !== undefined && envUrl !== '') return envUrl;
		return 'http://localhost:8787';
	}

	static async postTool(serverUrl: string, routeName: string, body: unknown): Promise<ToolResponse> {
		const url = `${serverUrl.replace(/\/+$/, '')}/tools/${routeName}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body ?? {}),
		});

		const responseText = await response.text();
		if (response.ok === false) {
			throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
		}

		let parsedJson: unknown;
		try {
			parsedJson = JSON.parse(responseText);
		} catch (err) {
			throw new Error(`Invalid JSON from server: ${responseText}`);
		}

		const parsed = ToolResponseSchema.safeParse(parsedJson);
		if (parsed.success === false) {
			throw new Error(`Unexpected response shape: ${JSON.stringify(parsed.error.flatten())}`);
		}
		return parsed.data;
	}

	static printResponse(response: ToolResponse): void {
		for (const part of response.content) {
			console.log(part.text);
		}
	}
}
