// local imports
import type {
	QuerySelectorInput,
	QuerySelectorFirstInput,
	QuerySelectorsAllRequest,
	QuerySelectorRequest,
} from '../../fastbrowser_httpd/libs/tool-schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type BuildQuerySelectorsAllOpts = {
	selector?: string[];
	limit?: string;
	withAncestors?: boolean;
	withChildren?: boolean;
	selectorsJson?: string;
};

export type BuildQuerySelectorFirstOpts = {
	selector?: string[];
	withAncestors?: boolean;
	withChildren?: boolean;
	selectorsJson?: string;
};

export class QueryBuilder {
	static buildQuerySelectorsBody(opts: BuildQuerySelectorsAllOpts): QuerySelectorsAllRequest {
		if (opts.selectorsJson !== undefined && opts.selectorsJson !== '') {
			let parsed: unknown;
			try {
				parsed = JSON.parse(opts.selectorsJson);
			} catch (err) {
				throw new Error(`--selectors-json is not valid JSON: ${(err as Error).message}`);
			}
			if (Array.isArray(parsed) === false) {
				throw new Error('--selectors-json must be a JSON array');
			}
			return { selectors: parsed as QuerySelectorInput[] };
		}

		const selectorList = opts.selector ?? [];
		if (selectorList.length === 0) {
			throw new Error('At least one --selector or --selectors-json is required');
		}

		const limit = opts.limit === undefined ? 0 : Number.parseInt(opts.limit, 10);
		if (Number.isNaN(limit) === true) {
			throw new Error(`Invalid --limit: ${opts.limit}`);
		}
		const withAncestors = opts.withAncestors !== false;
		const withChildren = opts.withChildren === true;

		const selectors: QuerySelectorInput[] = selectorList.map((selector) => ({
			selector,
			limit,
			withAncestors,
			withChildren,
		}));
		return { selectors };
	}

	static buildQuerySelectorFirstBody(opts: BuildQuerySelectorFirstOpts): QuerySelectorRequest {
		if (opts.selectorsJson !== undefined && opts.selectorsJson !== '') {
			let parsed: unknown;
			try {
				parsed = JSON.parse(opts.selectorsJson);
			} catch (err) {
				throw new Error(`--selectors-json is not valid JSON: ${(err as Error).message}`);
			}
			if (Array.isArray(parsed) === false) {
				throw new Error('--selectors-json must be a JSON array');
			}
			return { selectors: parsed as QuerySelectorFirstInput[] };
		}

		const selectorList = opts.selector ?? [];
		if (selectorList.length === 0) {
			throw new Error('At least one --selector or --selectors-json is required');
		}

		const withAncestors = opts.withAncestors !== false;
		const withChildren = opts.withChildren === true;

		const selectors: QuerySelectorFirstInput[] = selectorList.map((selector) => ({
			selector,
			withAncestors,
			withChildren,
		}));
		return { selectors };
	}
}
