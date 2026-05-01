// node imports
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// local imports
import { SAMPLE_TREE_TEXT } from './test-fixtures.js';

const CLI_PATH = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

let tmpDir: string;
let fixturePath: string;

before(() => {
	tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'a11y_parse-cli-'));
	fixturePath = Path.join(tmpDir, 'sample.a11y.txt');
	Fs.writeFileSync(fixturePath, SAMPLE_TREE_TEXT, 'utf-8');
});

after(() => {
	Fs.rmSync(tmpDir, { recursive: true, force: true });
});

const runCli = (...args: string[]): { stdout: string; stderr: string; status: number | null } => {
	const result = spawnSync('npx', ['tsx', CLI_PATH, '--file', fixturePath, ...args], {
		encoding: 'utf-8',
	});
	return {
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
		status: result.status,
	};
};

describe('cli --with-children', () => {
	describe('single match (no --all)', () => {
		it('without --wc emits a single line for the match', () => {
			const { stdout, status } = runCli('main');
			assert.equal(status, 0);
			assert.equal(stdout.trim(), 'uid=2 main');
		});

		it('with --wc emits the matched node and its full descendant subtree', () => {
			const { stdout, status } = runCli('--wc', 'main');
			assert.equal(status, 0);
			const uids = stdout.trim().split('\n').map((l) => l.trim().split(/\s+/)[0]);
			assert.deepEqual(uids, ['uid=2', 'uid=3', 'uid=4', 'uid=5']);
		});

		it('--with-children long form is equivalent to --wc', () => {
			const shortForm = runCli('--wc', 'main').stdout;
			const longForm = runCli('--with-children', 'main').stdout;
			assert.equal(longForm, shortForm);
		});
	});

	describe('multi match (--all)', () => {
		it('without --wc emits one line per match', () => {
			const { stdout, status } = runCli('--all', 'link');
			assert.equal(status, 0);
			const lines = stdout.trim().split('\n');
			assert.equal(lines.length, 2);
			assert.equal(lines[0].split(/\s+/)[0], 'uid=4');
			assert.equal(lines[1].split(/\s+/)[0], 'uid=7');
		});

		it('with --wc emits one subtree per match (no FakeRoot at the CLI layer)', () => {
			const { stdout, status } = runCli('--all', '--wc', 'main');
			assert.equal(status, 0);
			const uids = stdout.trim().split('\n').map((l) => l.trim().split(/\s+/)[0]);
			// only `main` matches, and its subtree is heading + link + button
			assert.deepEqual(uids, ['uid=2', 'uid=3', 'uid=4', 'uid=5']);
			assert.equal(stdout.includes('FakeRoot'), false);
		});

		it('with --wa --wc splices descendants into the ancestor tree', () => {
			const { stdout, status } = runCli('--all', '--wa', '--wc', 'main');
			assert.equal(status, 0);
			const uids = stdout.trim().split('\n').map((l) => l.trim().split(/\s+/)[0]);
			// ancestors of main = WebArea(1); main itself = 2; descendants = 3,4,5
			assert.deepEqual(uids, ['uid=1', 'uid=2', 'uid=3', 'uid=4', 'uid=5']);
		});

		it('--wa alone does NOT include descendants (regression check)', () => {
			const { stdout, status } = runCli('--all', '--wa', 'main');
			assert.equal(status, 0);
			const uids = stdout.trim().split('\n').map((l) => l.trim().split(/\s+/)[0]);
			assert.deepEqual(uids, ['uid=1', 'uid=2']);
		});
	});
});
