#!/usr/bin/env node

// node imports
import Fs from 'node:fs';

// npm imports
import { Command } from 'commander';

// local imports
import { A11yTree, AxNode } from './libs/a11y_tree.js';
import { A11yQuery } from './libs/a11y_selector.js';
import { A11yDisplay } from './libs/a11y_display.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Helper class for CLI operations on accessibility trees.
 */
class MainHelper {
	/**
	 * Strips file header content before the first tree line (uid=).
	 * @param content - Raw file content
	 * @returns Content starting from the first tree line, or original content if no tree found
	 */
	static stripFileHeader(content: string): string {
		const lines = content.split('\n');
		const firstTreeLine = lines.findIndex(line => line.match(/^uid=/));
		if (firstTreeLine === -1) {
			return content;
		}
		return lines.slice(firstTreeLine).join('\n');
	}

	/**
	 * Reads and parses an accessibility tree file.
	 * @param file - Path to the accessibility tree file
	 * @returns Parsed accessibility tree
	 */
	static async readTree(file: string): Promise<AxNode> {
		let content: string = await Fs.promises.readFile(file, 'utf-8');

		const treeText = MainHelper.stripFileHeader(content);

		const axTree: AxNode = A11yTree.parse(treeText);
		return axTree;
	}

}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Main CLI entry point. Parses command-line arguments and executes accessibility tree queries.
 */
async function main(): Promise<void> {
	const program = new Command();

	program
		.name('a11y_parse')
		.description('Query an accessibility tree file using CSS-inspired selectors')
		.argument('<selector>', 'CSS-inspired selector (role, #uid, [attr*=val], combinators, pseudo-classes)')
		.requiredOption('-f, --file <path>', 'Path to accessibility tree text file')
		.option('-a, --all', 'Return all matches (default: first match only)')
		.option('--wa, --with-ancestor', 'Output ancestor tree containing all matched nodes')
		.option('--wc, --with-children', 'Include descendants of matched nodes in the output')
		.addHelpText('after', [
			'',
			'Examples:',
			'  npx a11y_parse --file page.a11y.txt button',
			'  npx a11y_parse --file page.a11y.txt --all \'link[url*="example.com"]\'',
			'  npx a11y_parse --file page.a11y.txt --all --wa heading',
			'  npx a11y_parse --file page.a11y.txt --all --wc heading',
			'  npx a11y_parse --file page.a11y.txt --all --wa --wc heading',
		].join('\n'))
		.parse(process.argv);

	type CliOptions = {
		file: string;
		all: boolean;
		withAncestor: boolean;
		withChildren: boolean;
	};
	const options = program.opts<CliOptions>();
	const selector: string = program.args[0];

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// Read and parse the accessibility tree file
	const axTree = await MainHelper.readTree(options.file);

	// Query based on --all flag
	if (options.all) {
		const nodes = A11yQuery.querySelectorAll(axTree, selector);
		if (nodes.length === 0) {
			process.exit(1);
		}
		if (options.withAncestor === true) {
			const subsetTree = A11yTree.buildSubsetTree(nodes, {
				withAncestors: true,
				withDescendants: options.withChildren === true,
			});
			process.stdout.write(A11yDisplay.stringifyTree(subsetTree) + '\n');
		} else if (options.withChildren === true) {
			for (const node of nodes) {
				process.stdout.write(A11yDisplay.stringifyTree(node) + '\n');
			}
		} else {
			for (const node of nodes) {
				process.stdout.write(A11yDisplay.stringifyNode(node) + '\n');
			}
		}
	} else {
		// Single match mode
		const node = A11yQuery.querySelector(axTree, selector);
		if (node === undefined) {
			process.exit(1);
		}
		if (options.withChildren === true) {
			process.stdout.write(A11yDisplay.stringifyTree(node) + '\n');
		} else {
			process.stdout.write(A11yDisplay.stringifyNode(node) + '\n');
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

void main();
