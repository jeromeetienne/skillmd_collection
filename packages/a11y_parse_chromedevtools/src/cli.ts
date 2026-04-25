#!/usr/bin/env node

// node imports
import Fs from 'node:fs';

// npm imports
import { Command } from 'commander';

// local imports
import { A11yTree } from './libs/a11y_tree';
import { A11yQuery } from './libs/a11y_selector';

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
        static readTree(file: string): ReturnType<typeof A11yTree.parse> {
                let content: string;
                try {
                        content = Fs.readFileSync(file, 'utf-8');
                } catch (err) {
                        console.error(`Error reading file: ${file}`);
                        process.exit(1);
                }

                const treeText = MainHelper.stripFileHeader(content);

                try {
                        return A11yTree.parse(treeText);
                } catch (err) {
                        console.error(`Error parsing accessibility tree: ${err instanceof Error ? err.message : String(err)}`);
                        process.exit(1);
                }
        }

        /**
         * Outputs matched nodes to stdout.
         * @param nodes - Array of matched nodes
         * @param withAncestor - If true, outputs ancestor tree; otherwise outputs individual nodes
         */
        static outputNodes(nodes: ReturnType<typeof A11yQuery.querySelectorAll>, withAncestor: boolean): void {
                if (nodes.length === 0) {
                        process.exit(1);
                }
                if (withAncestor) {
                        const ancestorTree = A11yTree.buildAncestorTree(nodes);
                        process.stdout.write(A11yTree.stringify(ancestorTree) + '\n');
                } else {
                        for (const node of nodes) {
                                process.stdout.write(A11yTree.stringifyNode(node) + '\n');
                        }
                }
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
function main(): void {
        const program = new Command();

        program
                .name('a11y_parse')
                .description('Query an accessibility tree file using CSS-inspired selectors')
                .argument('<selector>', 'CSS-inspired selector (role, #uid, [attr*=val], combinators, pseudo-classes)')
                .requiredOption('-f, --file <path>', 'Path to accessibility tree text file')
                .option('-a, --all', 'Return all matches (default: first match only)')
                .option('-w, --with-ancestor', 'Output ancestor tree containing all matched nodes')
                .addHelpText('after', [
                        '',
                        'Examples:',
                        '  npx a11y_parse --file page.a11y.txt button',
                        '  npx a11y_parse --file page.a11y.txt --all \'link[url*="example.com"]\'',
                        '  npx a11y_parse --file page.a11y.txt --all -w heading',
                ].join('\n'))
                .parse(process.argv);

        const opts = program.opts<{ file: string; all: boolean; withAncestor: boolean }>();
        const selector = program.args[0];

        // Read and parse the accessibility tree file
        const root = MainHelper.readTree(opts.file);

        // Query based on --all flag
        if (opts.all) {
                const nodes = A11yQuery.querySelectorAll(root, selector);
                MainHelper.outputNodes(nodes, opts.withAncestor === true);
        } else {
                // Single match mode
                const node = A11yQuery.querySelector(root, selector);
                if (node === undefined) {
                        process.exit(1);
                }
                process.stdout.write(A11yTree.stringifyNode(node) + '\n');
        }
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

main();
