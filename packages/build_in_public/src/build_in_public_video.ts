#!/usr/bin/env -S npx tsx

import ChildProcess from 'node:child_process';
import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'node:os';
import path from 'node:path';
import * as Commander from 'commander';

const DEFAULT_TOPIC = 'why fastbrowser + a11y_parse are great to scrape the web with AI';
const DEFAULT_DESCRIPTION = `Based on those 2 folders, in a monorepo
- https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse
- https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/fastbrowser_cli`;


const __dirname = new URL('.', import.meta.url).pathname;
const REPOSITORY_ROOT = path.join(__dirname, '../../..');

export class BuildInPublicVideo {
	static streamClaudeToViewer(userPrompt: string, cwd: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const claude = ChildProcess.spawn(
				'claude',
				[
					'--output-format', 'stream-json',
					'--verbose',
					'--include-partial-messages',
					'--allowed-tools', 'Bash,Read,Write,WebFetch',
					'--permission-mode', 'auto',
					'-p', userPrompt,
				],
				{ cwd, stdio: ['ignore', 'pipe', 'inherit'] },
			);
			// /Users/jetienne/webwork/skillmd_collection/packages/claude_stream_viewer/src/claude_stream_viewer.ts
			// const streamViewerCmd = 'npx'
			// const streamViewerArgs = ['claude_stream_viewer@latest'];
			const streamViewerCmd = 'npx'
			const streamViewerArgs = [
				'tsx',
				Path.join(REPOSITORY_ROOT, './packages/claude_stream_viewer/src/claude_stream_viewer.ts'),
			];

			const viewer = ChildProcess.spawn(streamViewerCmd, streamViewerArgs, {
				cwd,
				stdio: ['pipe', 'inherit', 'inherit'],
			});

			claude.stdout.pipe(viewer.stdin);

			let claudeCode: number | null = null;
			let viewerCode: number | null = null;

			const settle = (): void => {
				if (claudeCode === null || viewerCode === null) {
					return;
				}
				if (claudeCode === 0 && viewerCode === 0) {
					resolve();
					return;
				}
				reject(new Error(`pipeline failed: claude=${claudeCode} viewer=${viewerCode}`));
			};

			claude.on('error', reject);
			viewer.on('error', reject);
			claude.on('close', (code: number | null) => {
				claudeCode = code ?? 1;
				settle();
			});
			viewer.on('close', (code: number | null) => {
				viewerCode = code ?? 1;
				settle();
			});
		});
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const program = new Commander.Command();
	program
		.name('build_in_public_video')
		.description('Scaffold a Remotion project and stream Claude Code to generate a build-in-public video.')
		.option('-t, --topic <topic>', 'video topic', DEFAULT_TOPIC)
		.option('-d, --description <description>', 'video description', DEFAULT_DESCRIPTION)
		.option('-td, --tmp-dir <dir>', 'parent directory for the generated project', '/tmp')
		.option('-o, --output-dir <dir>', 'output directory for the generated video (mp4/pdf/log)', '/tmp')
		.parse(process.argv);

	type CliOptions = {
		topic: string;
		description: string;
		tmpDir: string;
		outputDir: string;
	};
	const options = program.opts<CliOptions>();

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	const userPrompt = `Generate a build-in-public video

topic: ${options.topic}
description: |
${options.description.split('\n').map((line) => `  ${line}`).join('\n')}
`;

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////


	const tmpDir = options.tmpDir;
	const suffix = (new Date()).toISOString().replace(/[:.]/g, '-');
	const projectName = `video_build_in_public_${suffix}`;
	const projectDir = path.join(tmpDir, projectName);

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Creating the folder
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	console.log(`Creating project in ${projectDir}...`);

	ChildProcess.execSync(`npx create-video@latest --yes --blank ${projectName}`, {
		cwd: tmpDir,
		stdio: 'inherit',
	});

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Add the SKILL.md from remotion and build-in-public-video
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	console.log('Adding claude-code skill to project...');
	ChildProcess.execSync('npx skills add remotion-dev/skills -a claude-code --yes', {
		cwd: projectDir,
		stdio: 'inherit',
	});

	console.log('Copying build-in-public-video skill to project...');
	const skillSource = path.join(
		Os.homedir(),
		'webwork/transformer_bitcoin_ai/.claude/skills-disabled/build-in-public-video',
	);
	const skillDest = path.join(projectDir, '.claude/skills/build-in-public-video');
	Fs.cpSync(skillSource, skillDest, { recursive: true, preserveTimestamps: true });

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Launch claude
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	console.log('Streaming Claude output to viewer...');
	await BuildInPublicVideo.streamClaudeToViewer(userPrompt, projectDir);

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Copy output
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// copy the generated video, pdf and log files to the output directory. Using async Fs
	// {projectDir}/out/video.mp4
	// {projectDir}/out/video.pdf
	// {projectDir}/out/video.log
	const outputFiles = ['video.mp4', 'video.pdf', 'video.log'];
	for (const outputFile of outputFiles) {
		const pathSrc = path.join(projectDir, 'out', outputFile);
		const pathDest = path.join(options.outputDir, `${projectName}_${outputFile}`);

		const fileExists = await Fs.promises.access(pathSrc, Fs.constants.F_OK).then(() => true).catch(() => false);
		if (fileExists === false) {
			console.warn(`Output file not found: ${pathSrc}`);
			continue
		}

		// copy the file
		await Fs.promises.copyFile(pathSrc, pathDest);
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	console.log('Done!');
}

void main()