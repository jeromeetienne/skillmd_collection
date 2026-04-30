import { execSync } from 'node:child_process';

export class FastBrowserHelper {
	static run(command: string): string {
		const fullCommand = `npx fastbrowser_cli ${command}`;
		console.log(`Running command: ${fullCommand}`);
		return execSync(fullCommand, { encoding: 'utf8' });
	}

	static navigatePage(url: string): void {
		FastBrowserHelper.run(`navigate_page --url '${url}'`);
	}

	static fillForm(selector: string, value: string): void {
		FastBrowserHelper.run(`fill_form --selector '${selector}' --value '${value}'`);
	}

	static pressKeys(keys: string): void {
		FastBrowserHelper.run(`press_keys --keys '${keys}'`);
	}

	static click(selector: string): void {
		FastBrowserHelper.run(`click -s '${selector}'`);
	}

	static querySelectorsAll(selector: string, limit: number): string {
		return FastBrowserHelper.run(`query_selectors_all --selector '${selector}' --limit ${limit}`);
	}

	static takeSnapshot(): string {
		return FastBrowserHelper.run('take_snapshot');
	}

	static querySelectors(selector: string, withAncestors = true): string {
		const flag = withAncestors === false ? ' --no-with-ancestors' : '';
		return FastBrowserHelper.run(`query_selectors --selector '${selector}'${flag}`);
	}

}