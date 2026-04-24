export const SAMPLE_TREE_TEXT = [
	'uid=1 WebArea "Main Page"',
	'  uid=2 main',
	'    uid=3 heading "Welcome"',
	'    uid=4 link "Click \\"here\\"" href="https://example.com"',
	'    uid=5 button "Submit" disabled="true"',
	'  uid=6 navigation',
	'    uid=7 link "Home" href="/"',
].join('\n');

export const SIBLINGS_TREE_TEXT = [
	'uid=10 WebArea "Sibling Test"',
	'  uid=11 main',
	'    uid=12 link "First Link" href="/a"',
	'    uid=13 button "Middle"',
	'    uid=14 link "Second Link" href="/b"',
	'    uid=15 link "Third Link" href="/c"',
].join('\n');
