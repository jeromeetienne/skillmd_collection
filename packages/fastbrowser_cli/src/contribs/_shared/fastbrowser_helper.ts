import { execSync } from 'node:child_process';

const __dirname = new URL('.', import.meta.url).pathname;
const __filename = new URL(import.meta.url).pathname;

export class FastBrowserHelper {
	static async run(command: string): Promise<string> {
		const duringDev = __filename.endsWith('.ts') ? true : false;
		const baseCommand = duringDev
			? `npx tsx ${__dirname}../../fastbrowser_cli/fastbrowser_cli.ts`
			: `node ${__dirname}../../fastbrowser_cli/fastbrowser_cli.js`;
		const fullCommand = `${baseCommand} ${command}`;
		// console.log(`FastBrowserHelper: meta.url: ${import.meta.url}`);
		// console.error(`FastBrowserHelper: Running command: ${fullCommand}`);
		return execSync(fullCommand, { encoding: 'utf8' });
	}

	static async navigatePage(url: string): Promise<void> {
		await FastBrowserHelper.run(`navigate_page --url '${url}'`);
	}

	static async fillForm(selector: string, value: string): Promise<void> {
		await FastBrowserHelper.run(`fill_form --selector '${selector}' --value '${value}'`);
	}

	static async pressKeys(keys: string): Promise<void> {
		await FastBrowserHelper.run(`press_keys --keys '${keys}'`);
	}

	static async click(selector: string): Promise<void> {
		await FastBrowserHelper.run(`click -s '${selector}'`);
	}

	static async querySelectorsAll(selector: string, limit: number): Promise<string> {
		return await FastBrowserHelper.run(`query_selectors --all --selector '${selector}' --limit ${limit}`);
	}

	static async querySelectorsAllWithChildren(selector: string, limit: number): Promise<string> {
		return await FastBrowserHelper.run(`query_selectors --all --selector '${selector}' --limit ${limit} --with-ancestors --with-children`);
	}

	static async takeSnapshot(): Promise<string> {
		return await FastBrowserHelper.run('take_snapshot');
	}

	static async querySelectors(selector: string, withAncestors = true): Promise<string> {
		const flag = withAncestors === false ? ' --no-with-ancestors' : '';
		return await FastBrowserHelper.run(`query_selectors --selector '${selector}'${flag}`);
	}

	static async evaluateScript(functionText: string): Promise<string> {
		return await FastBrowserHelper.run(`evaluate_script --script "${functionText}"`);
	}
}