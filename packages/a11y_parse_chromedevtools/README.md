# a11y_parse

A TypeScript library for parsing and querying accessibility trees. Provides a CSS-inspired selector language for navigating AX (Accessibility) tree structures — useful for browser automation, testing, and accessibility analysis.

- originally designed for [fastbrowser_cli](https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/fastbrowser_cli), a SKILL.md which helps AI agents browse the web efficiently by exposing a simplified accessibility tree interface and powerful querying capabilities (aka the CSS-like selector syntax).

## What is an Accessibility Tree?

An accessibility tree is a hierarchical representation of a UI that assistive technologies (screen readers, automation tools) use to interact with an application. Every visible element — buttons, links, headings, form fields — appears as a node with a role, a name, and optional attributes.

References:
- [Accessibility Tree — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree)
- [The Accessibility Tree — web.dev](https://web.dev/articles/the-accessibility-tree)
- [Chrome Accessibility API](https://developer.chrome.com/docs/devtools/accessibility/reference)
- [WAI-ARIA Roles — W3C](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)

---

## Install

```bash
npm install a11y_parse
```

---

## How to Use as a CLI Tool
Good trick to get the accessibility tree of any webpage: use the `fastbrowser_cli` SKILL.md to take a snapshot of the current page's 
accessibility tree, which outputs in the text format that `A11yTree.parse` can consume.

```
npx fastbrowser_cli take_snapshot | tail -n +2 > page.a11y.txt
```

```
npx a11y_parse --file page.a11y.txt 'link[href^="https"]'
```

---

## Build

```bash
npm run build       # compile TypeScript to dist/
npm run typecheck   # type-check without emitting
```

---

## Test

```bash
npm test
```
---
## Example

```typescript
import { A11yTree, A11yQuery } from 'a11y_parse';

const root = A11yTree.parse(`
uid=1 WebArea "Main Page"
  uid=2 main
    uid=3 heading "Welcome"
    uid=4 link "Click here" href="https://example.com"
    uid=5 button "Submit" disabled="true"
  uid=6 navigation
    uid=7 link "Home" href="/"
    uid=8 link "About" href="/about"
`);

// All links anywhere in the tree
A11yQuery.querySelectorAll(root, 'link');

// Only links that are direct children of navigation
A11yQuery.querySelectorAll(root, 'navigation > link');

// Links with an external href
A11yQuery.querySelectorAll(root, 'link[href^="https"]');

// The submit button by name
A11yQuery.querySelector(root, 'button[name="Submit"]');

// Any disabled element
A11yQuery.querySelectorAll(root, '*[disabled="true"]');

// Both headings and buttons in one query
A11yQuery.querySelectorAll(root, 'heading, button');

// A node by its UID
A11yQuery.querySelector(root, '#7');
```

---

## Selector Language

The selector syntax is modelled on CSS selectors, adapted for accessibility tree structures.

The spec is documented in full in [docs/spec_a11y_selector_language.md](./docs/spec_a11y_selector_language.md).

### Role selector

Matches nodes by their accessibility role.

```
button
link
comboxbox
searchbox
heading
WebArea
```

### Universal selector

Matches any node.

```
*
```

### UID selector

Matches a node by its exact unique identifier.

```
#4
#1_3
```

### Attribute selectors

Attribute selectors match values inside `node.attributes`. The special virtual attribute `name` maps to `node.name`.

| Syntax | Semantics |
|--------|-----------|
| `[attr]` | attribute is present |
| `[attr="value"]` | exact match |
| `[attr^="prefix"]` | starts with |
| `[attr$="suffix"]` | ends with |
| `[attr*="sub"]` | contains substring |

```
link[href]
button[disabled="true"]
link[href^="https"]
link[href$=".com"]
link[href*="example"]
heading[name="Welcome"]
link[name="Click \"here\""]
```

### Combinators

| Syntax | Semantics |
|--------|-----------|
| `A B` | B is a descendant of A (any depth) |
| `A > B` | B is a direct child of A |
| `A, B` | union — matches A or B |

```
WebArea link
main > button
heading, button
RootWebArea > link[href^="https"]
```


---

## API

### `A11yTree`

#### `A11yTree.parse(input: string): AxNode`

Parses whitespace-indented accessibility tree text into an `AxNode` tree. Each line follows this format:

```
uid=<id> <role> ["<name>"] [key="value" ...]
```

Indentation level determines parent-child relationships. Quoted names and attribute values support backslash escaping (`\"`).

```typescript
const root = A11yTree.parse(`
uid=1 WebArea "Main Page"
  uid=2 main
    uid=3 heading "Welcome"
    uid=4 link "Click here" href="https://example.com"
    uid=5 button "Submit" disabled="true"
  uid=6 navigation
    uid=7 link "Home" href="/"
`);
```

#### `A11yTree.stringify(root: AxNode): string`

Serializes an `AxNode` tree back to the text format. Round-trips cleanly through `parse`.

```typescript
const text = A11yTree.stringify(root);
```

#### `A11yTree.walk(node: AxNode): Generator<AxNode>`

Depth-first pre-order traversal over all nodes.

```typescript
for (const node of A11yTree.walk(root)) {
        console.log(node.role, node.name);
}
```

#### `A11yTree.findOne(root: AxNode, testFn: AxTreeTestFn): AxNode | undefined`

Returns the first node in walk order that satisfies `testFn`.

#### `A11yTree.findAll(root: AxNode, testFn: AxTreeTestFn): AxNode[]`

Returns all nodes that satisfy `testFn`.

#### `A11yTree.filterByUid(uid: string): AxTreeTestFn`

Returns a test function that matches a node by exact UID.

```typescript
const node = A11yTree.findOne(root, A11yTree.filterByUid('4'));
```

#### `A11yTree.filterByRole(role: string): AxTreeTestFn`

Returns a test function that matches a node by exact role.

```typescript
const links = A11yTree.findAll(root, A11yTree.filterByRole('link'));
```

#### `A11yTree.filterByName(name: string | RegExp): AxTreeTestFn`

Returns a test function that matches a node by name — exact string or regular expression. Nodes with no name are never matched.

```typescript
const welcome = A11yTree.findOne(root, A11yTree.filterByName('Welcome'));
const navLinks = A11yTree.findAll(root, A11yTree.filterByName(/^Home|Back$/));
```

#### `A11yTree.buildAncestorTree(axNodes: AxNode[]): AxNode`

Builds a minimal pruned tree that contains the given nodes and all their ancestors, discarding unrelated siblings. Useful for presenting query results with context. Throws if `axNodes` is empty.

```typescript
const buttons = A11yTree.findAll(root, A11yTree.filterByRole('button'));
const pruned = A11yTree.buildAncestorTree(buttons);
console.log(A11yTree.stringify(pruned));
```

---

### `A11yQuery`

#### `A11yQuery.querySelector(root: AxNode, selector: string): AxNode | undefined`

Returns the first node matching the selector.

```typescript
const submit = A11yQuery.querySelector(root, 'button[name="Submit"]');
```

#### `A11yQuery.querySelectorAll(root: AxNode, selector: string): AxNode[]`

Returns all nodes matching the selector.

```typescript
const externalLinks = A11yQuery.querySelectorAll(root, 'link[href^="https"]');
const interactive   = A11yQuery.querySelectorAll(root, 'button, link');
const navLinks      = A11yQuery.querySelectorAll(root, 'navigation > link');
```

---

### Types

```typescript
interface AxNode {
        uid: string;
        role: string;
        name?: string;
        attributes: Record<string, string>;
        children: AxNode[];
        parent?: AxNode;
}

type AxTreeTestFn = (node: AxNode) => boolean;
```
