// node imports
import Fs from 'node:fs';
import Path from 'node:path';

// npm imports
import Chalk from 'chalk';


const PROJECT_ROOT = Path.resolve(__dirname, '..', '..');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Install Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

interface InstallOptions {
	skills: boolean;
}

class InstallCommandHandler {
	async run(options: InstallOptions): Promise<void> {
		if (options.skills === false) {
			console.log(Chalk.yellow('Nothing to install. Use --skills to install the bsky_cli skill.'));
			return;
		}
		await this._installSkills();
	}

	private _copyDirSync(src: string, dest: string): void {
		Fs.mkdirSync(dest, { recursive: true });
		for (const entry of Fs.readdirSync(src, { withFileTypes: true })) {
			const srcPath = Path.join(src, entry.name);
			const destPath = Path.join(dest, entry.name);
			if (entry.isDirectory()) {
				this._copyDirSync(srcPath, destPath);
			} else {
				Fs.copyFileSync(srcPath, destPath);
			}
		}
	}

	private async _installSkills(): Promise<void> {

		// Skill source: <package-root>/skills/bluesky
		const skillSrc = Path.join(PROJECT_ROOT, 'skills', 'bluesky');

		if (Fs.existsSync(skillSrc) === false) {
			console.error(Chalk.red(`Skill source not found: ${skillSrc}`));
			process.exit(1);
		}

		// Destination: <invocation directory>/bluesky
		// npm changes cwd to the package root, so use INIT_CWD which npm sets
		// to the directory where the command was originally invoked.
		const invokeDir = process.env['INIT_CWD'] ?? process.cwd();
		const skillDest = Path.join(invokeDir, 'bluesky');

		console.log(Chalk.dim(`Installing skill to ${skillDest} ...`));

		try {
			this._copyDirSync(skillSrc, skillDest);
			console.log(Chalk.green(`✓ Skill installed → ${skillDest}`));
		} catch (error) {
			console.error(Chalk.red(`Install failed: ${error instanceof Error ? error.message : String(error)}`));
			process.exit(1);
		}
	}
}

export const installCommand = new InstallCommandHandler();
