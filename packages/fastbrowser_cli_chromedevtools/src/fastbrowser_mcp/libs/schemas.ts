// npm imports
import { z } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Authoritative query selector schemas — shared between the MCP server
//	and the HTTP/CLI layer. Kept out of the fastbrowser_mcp.ts entrypoint so
//	importing the schemas does not execute the CLI's top-level `main()`.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export const QuerySelectorInputSchema = z.object({
	selector: z.string()
		.describe("CSS-like selector to query the accessibility tree"),
	limit: z.number()
		.describe("Maximum number of nodes to return (excluding ancestors). Set to 0 for no limit.")
		.default(0),
	withAncestors: z.boolean()
		.describe("Whether to include ancestor nodes in the result")
		.default(true),
});

export const QuerySelectorsInputSchema = z.object({
	selectors: z.array(QuerySelectorInputSchema)
		.describe("List of selectors to query the accessibility tree"),
});

export const QuerySelectorFirstInputSchema = z.object({
	selector: z.string()
		.describe("CSS-like selector to query the accessibility tree"),
	withAncestors: z.boolean()
		.describe("Whether to include ancestor nodes in the result")
		.default(true),
});

export const QuerySelectorsFirstInputSchema = z.object({
	selectors: z.array(QuerySelectorFirstInputSchema)
		.describe("List of selectors; for each, the first matching node is returned"),
});

export type QuerySelectorInput = z.infer<typeof QuerySelectorInputSchema>;
export type QuerySelectorsInput = z.infer<typeof QuerySelectorsInputSchema>;
export type QuerySelectorFirstInput = z.infer<typeof QuerySelectorFirstInputSchema>;
export type QuerySelectorsFirstInput = z.infer<typeof QuerySelectorsFirstInputSchema>;
