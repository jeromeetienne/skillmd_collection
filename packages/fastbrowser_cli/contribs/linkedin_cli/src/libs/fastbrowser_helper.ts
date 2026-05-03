import { execSync } from 'node:child_process';

export class FastBrowserHelper {
	static async run(command: string): Promise<string> {
		// const fullCommand = `npx fastbrowser_cli ${command}`;
		const fullCommand = `npx tsx ./src/fastbrowser_cli/fastbrowser_cli.ts  ${command}`;
		console.error(`Running command: ${fullCommand}`);
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

	static async takeSnapshot(): Promise<string> {
		return await FastBrowserHelper.run('take_snapshot');
	}

	static async querySelectors(selector: string, withAncestors = true): Promise<string> {
		const flag = withAncestors === false ? ' --no-with-ancestors' : '';
		return await FastBrowserHelper.run(`query_selectors --selector '${selector}'${flag}`);
	}

}