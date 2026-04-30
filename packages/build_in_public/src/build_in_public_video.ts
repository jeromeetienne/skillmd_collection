#!/usr/bin/env -S npx tsx

import ChildProcess from 'node:child_process';
import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'node:os';
import path from 'node:path';

const USER_PROMPT = `Generate a build-in-public video

topic: why fastbrowser + a11y_parse are great to scrape the web with AI
description: |
  Based on those 2 folders, in a monorepo
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/fastbrowser_cli
`;

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
	const tmpDir = '/tmp';
	const suffix = (new Date()).toISOString().replace(/[:.]/g, '-');
	const projectName = `video_build_in_public_${suffix}`;
	const projectDir = path.join(tmpDir, projectName);


	console.log(`Creating project in ${projectDir}...`);

	ChildProcess.execSync(`npx create-video@latest --yes --blank ${projectName}`, {
		cwd: tmpDir,
		stdio: 'inherit',
	});

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

	console.log('Streaming Claude output to viewer...');
	await BuildInPublicVideo.streamClaudeToViewer(USER_PROMPT, projectDir);

	console.log('Done!');
}

void main()