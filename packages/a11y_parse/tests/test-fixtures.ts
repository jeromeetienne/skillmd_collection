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

export const RELATIVE_HAS_TREE_TEXT = [
	'uid=1 WebArea "Relative Has"',
	'  uid=2 main',
	'    uid=3 heading "H"',
	'    uid=4 link "L1" href="/a"',
	'    uid=5 button "B1"',
	'  uid=6 navigation',
	'    uid=7 link "L2" href="/b"',
	'    uid=8 group',
	'      uid=9 button "B2"',
].join('\n');
