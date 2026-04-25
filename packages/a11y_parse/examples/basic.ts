import Assert from 'node:assert';
import { fileURLToPath } from 'node:url';

import { A11yTree } from '../src/libs/a11y_tree.js';
import { A11yQuery } from '../src/libs/a11y_selector.js';

async function usageExample() {
	const treeText = [
		// '## Latest page snapshot',
		'uid=1_0 RootWebArea "Example Domain" url="https://www.example.com/"',
		'  uid=1_1 heading "Example Domain" level="1"',
		'  uid=1_2 StaticText "This domain is for use in documentation examples without needing permission. Avoid use in operations."',
		'  uid=1_3 link "Learn more" url="https://iana.org/domains/example"',
		'    uid=1_4 StaticText "Learn more"',
		'',
	].join('\n');
	console.log("Expected snapshot text content:");
	console.log(treeText);

	console.log('-----')

	const axTree = A11yTree.parse(treeText);

	// By role
	// const axnodes = A11yQuery.querySelectorAll(axTree, "link");
	// debugger

	// // By uid
	// querySelector(tree, "#1_3");

	// // Attribute equals
	// querySelector(tree, 'link[name="Learn more"]');

	// // Attribute starts-with
	// querySelectorAll(tree, 'link[url^="https://iana.org"]');

	// // Attribute exists
	// querySelectorAll(tree, "heading[level]");

	// // Descendant
	// querySelectorAll(tree, "RootWebArea link");

	// // Direct child
	// querySelectorAll(tree, "RootWebArea > heading");

	// // Union
	// querySelectorAll(tree, "heading, link");

	// // Mixed
	// querySelector(tree, 'RootWebArea > link[url*="iana"]');

	// Select
	const linkNode = A11yTree.findOne(axTree, A11yTree.filterByRole("link"));
	Assert.ok(linkNode, "Link node not found");
	console.log(linkNode?.name, linkNode?.attributes.url);
	console.log(linkNode)

	// Write (mutate)
	const headingNode = A11yTree.findOne(axTree, A11yTree.filterByUid("1_1"));
	if (headingNode !== undefined) {
		headingNode.name = "New Heading";
	}

	// Serialize back
	const treeTextNew = A11yTree.stringify(axTree);
	console.log("Serialized tree:");
	console.log(treeTextNew);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	void usageExample();
}
