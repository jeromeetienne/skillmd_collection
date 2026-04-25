// npm imports
import type { Express, Request, Response } from 'express';

// local imports
import { McpMyClient } from '../../fastbrowser_mcp/libs/mcp_client.js';
import { TOOL_SCHEMAS, ToolResponseSchema } from './tool-schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class Routes {
	static register(app: Express, mcpClient: McpMyClient): void {
		app.get('/health', (_req: Request, res: Response) => {
			res.json({ ok: true });
		});

		for (const entry of TOOL_SCHEMAS) {
			const path = `/tools/${entry.routeName}`;
			app.post(path, async (request: Request, response: Response) => {
				// Validate body against the tool's Zod schema
				const parsed = entry.requestSchema.safeParse(request.body ?? {});
				if (parsed.success === false) {
					response.status(400).json({ error: parsed.error.flatten() });
					return;
				}

				try {
					const mcpResult = await mcpClient.callTool(entry.mcpToolName, parsed.data as Record<string, unknown>);
					// Narrow the MCP result to our uniform response shape.
					const toolResponse = ToolResponseSchema.parse({
						content: mcpResult.content,
					});
					response.json(toolResponse);
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					response.status(500).json({ error: message });
				}
			});
		}
	}
}
