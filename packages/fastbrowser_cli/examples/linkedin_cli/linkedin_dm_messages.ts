import { Command } from 'commander';
import Fs from 'fs';

import { A11yDisplay, A11yQuery, A11yTree, AxNode } from 'a11y_parse';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

class MainHelper {
	// TODO find the javascript DOM name and put it in a11y_parse
	static async nextSibling(axNode: AxNode): Promise<AxNode | null> {
		if (axNode.parent === undefined) return null;
		const axNodeParent = axNode.parent;
		const index = axNodeParent.children.findIndex((child) => child.uid === axNode.uid);
		if (index === -1 || index === axNodeParent.children.length - 1) return null;
		return axNodeParent.children[index + 1];
	}

	static async getAxNodeThread(axTree: AxNode): Promise<AxNode> {
		const axNodeConvList: AxNode | undefined = A11yQuery.querySelector(axTree, 'list[name="Conversation List"]')
		if (axNodeConvList === undefined) throw new Error('Could not find conversation list node');

		console.log('axNodeConvList:', A11yDisplay.stringifyNode(axNodeConvList));
		const axNodeConvListParent = axNodeConvList.parent
		if (axNodeConvListParent === undefined) throw new Error('Conversation list node has no parent');

		console.log('axNodeConvListParent:', A11yDisplay.stringifyNode(axNodeConvListParent));

		// goto next sibling of conv list parent, which is the "Conversation details" container
		const axNodeConvDetails: AxNode | null = await MainHelper.nextSibling(axNodeConvListParent);
		if (axNodeConvDetails === null) throw new Error('Could not find conversation details node');

		console.log('axNodeConvDetails:', A11yDisplay.stringifyNode(axNodeConvDetails));

		// console.log('Conversation List node:', axNodeConvList);
		console.log('axNodeConvDetails:')
		// console.log(A11yDisplay.stringifyTree(axNodeConvDetails));

		const axNodeThread = A11yQuery.querySelector(axNodeConvDetails, 'list');
		if (axNodeThread === undefined) throw new Error('Could not find thread node');

		return axNodeThread;
	}

	static async parseMessagesThread(axNodeThread: AxNode): Promise<void> {
		// each child of the thread node is a message, print the role and name of each message
		for (const axNodeMessage of axNodeThread.children) {
			const messageIndex = axNodeThread.children.findIndex((child) => child.uid === axNodeMessage.uid);
			// if there is no children, skip it
			if (axNodeMessage.children.length === 0) continue;

			console.log('--------------------------')
			console.log(`Message node: ${messageIndex}: ${A11yDisplay.stringifyNode(axNodeMessage)}`);
			const axNodeParagraph = A11yQuery.querySelector(axNodeMessage, 'paragraph');
			if (axNodeParagraph !== undefined) {
				debugger
				if (axNodeParagraph.attributes['value'] !== undefined) {
					console.log(`paragraph node: ${axNodeParagraph.attributes['value']}`);
				}
			}

			const axNodeSender = A11yQuery.querySelector(axNodeMessage, 'staticText[name="Sender"]');

			const axNodeTimes = A11yQuery.querySelectorAll(axNodeMessage, 'time');
			for (const axNodeTime of axNodeTimes) {
				console.log(`time node: ${axNodeTime.attributes['value']}`);
			}
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	const program = new Command();

	program
		.name('linkedin_dm_messages')
		.description('Linkedin DM messages CLI')
		.requiredOption('-f, --a11y_file <a11y_path>', 'path to the a11y file')
		.parse(process.argv);

	const options = program.opts<{
		a11y_file: string;
	}>();

	console.log('Options:', options);

	// Get and parse the whole snapshot tree, then find the relevant subtree for the messages thread container and print it
	const fileContent = await Fs.promises.readFile(options.a11y_file, 'utf-8');
	const axTree = A11yTree.parse(fileContent);
	const axNodeThread = await MainHelper.getAxNodeThread(axTree);
	// console.log('axNodeThread:', A11yDisplay.stringifyTree(axNodeThread));

	await MainHelper.parseMessagesThread(axNodeThread);

}


void main()