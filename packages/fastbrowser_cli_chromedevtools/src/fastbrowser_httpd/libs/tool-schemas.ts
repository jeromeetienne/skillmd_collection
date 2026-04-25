// npm imports
import { z } from 'zod';

// local imports - reuse the authoritative query selector schemas
import { QuerySelectorsInputSchema, QuerySelectorsFirstInputSchema } from '../../fastbrowser_mcp/libs/schemas.js';
export type { QuerySelectorInput, QuerySelectorsInput, QuerySelectorFirstInput, QuerySelectorsFirstInput } from '../../fastbrowser_mcp/libs/schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Request schemas — one per tool. Shapes mirror what the underlying
//	fastbrowser-mcp tools accept. For the proxied chrome-devtools-mcp tools,
//	the shapes come from chrome-devtools-mcp's tool reference.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export const ListPagesRequestSchema = z.object({}).strict();
export type ListPagesRequest = z.infer<typeof ListPagesRequestSchema>;

export const NewPageRequestSchema = z.object({
	url: z.string().describe('URL to open in the new page'),
});
export type NewPageRequest = z.infer<typeof NewPageRequestSchema>;

export const ClosePageRequestSchema = z.object({
	pageId: z.number().describe('The id of the page to close'),
});
export type ClosePageRequest = z.infer<typeof ClosePageRequestSchema>;

export const NavigatePageRequestSchema = z.object({
	url: z.string().describe('URL to navigate to'),
});
export type NavigatePageRequest = z.infer<typeof NavigatePageRequestSchema>;

export const ClickRequestSchema = z.object({
	selector: z.string().describe('Accessibility selector (e.g. "#1_3" or \'button[name="Submit"]\')'),
});
export type ClickRequest = z.infer<typeof ClickRequestSchema>;

export const FillFormElementSchema = z.object({
	selector: z.string(),
	value: z.string(),
});
export type FillFormElement = z.infer<typeof FillFormElementSchema>;

export const FillFormRequestSchema = z.object({
	elements: z.array(FillFormElementSchema).describe('Elements to fill, each with a selector and a value'),
});
export type FillFormRequest = z.infer<typeof FillFormRequestSchema>;

export const QuerySelectorsAllRequestSchema = QuerySelectorsInputSchema;
export type QuerySelectorsAllRequest = z.infer<typeof QuerySelectorsAllRequestSchema>;

export const QuerySelectorRequestSchema = QuerySelectorsFirstInputSchema;
export type QuerySelectorRequest = z.infer<typeof QuerySelectorRequestSchema>;

export const PressKeysRequestSchema = z.object({
	keys: z.string().describe("Comma-separated sequence of keys. E.g. 'Hello, Tab, Enter'"),
});
export type PressKeysRequest = z.infer<typeof PressKeysRequestSchema>;

export const TakeSnapshotRequestSchema = z.object({}).strict();
export type TakeSnapshotRequest = z.infer<typeof TakeSnapshotRequestSchema>;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Uniform response — narrowed mirror of MCP's CallToolResult
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export const TextContentSchema = z.object({
	type: z.literal('text'),
	text: z.string(),
});
export type TextContent = z.infer<typeof TextContentSchema>;

export const ToolResponseSchema = z.object({
	content: z.array(TextContentSchema),
});
export type ToolResponse = z.infer<typeof ToolResponseSchema>;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Registry — drives route registration and CLI command generation
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// The REST route name (snake_case, matches the CLI command) is distinct from
// the underlying MCP tool name (which may be camelCase for fastbrowser-mcp's own
// tools). `mcpToolName` is what we send over MCP; `routeName` is the URL path.
export type ToolSchemaEntry = {
	routeName: string;
	mcpToolName: string;
	requestSchema: z.ZodType;
};

export const TOOL_SCHEMAS: ToolSchemaEntry[] = [
	{ routeName: 'list_pages', mcpToolName: 'list_pages', requestSchema: ListPagesRequestSchema },
	{ routeName: 'new_page', mcpToolName: 'new_page', requestSchema: NewPageRequestSchema },
	{ routeName: 'close_page', mcpToolName: 'close_page', requestSchema: ClosePageRequestSchema },
	{ routeName: 'navigate_page', mcpToolName: 'navigate_page', requestSchema: NavigatePageRequestSchema },
	{ routeName: 'click', mcpToolName: 'click', requestSchema: ClickRequestSchema },
	{ routeName: 'fill_form', mcpToolName: 'fill_form', requestSchema: FillFormRequestSchema },
	{ routeName: 'query_selectors_all', mcpToolName: 'querySelectorsAll', requestSchema: QuerySelectorsAllRequestSchema },
	{ routeName: 'query_selectors', mcpToolName: 'querySelectors', requestSchema: QuerySelectorRequestSchema },
	{ routeName: 'press_keys', mcpToolName: 'pressKeys', requestSchema: PressKeysRequestSchema },
	{ routeName: 'take_snapshot', mcpToolName: 'take_snapshot', requestSchema: TakeSnapshotRequestSchema },
];
