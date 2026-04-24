# A11y Selector Language

`A11yQuery` provides a CSS-inspired selector language for querying accessibility trees (`AxNode`). The API mirrors the DOM's `querySelector` / `querySelectorAll`.

```ts
A11yQuery.querySelector(root, selector)    // first match or undefined
A11yQuery.querySelectorAll(root, selector) // all matches
```

---

## Simple selectors

### Role

Match nodes by their ARIA role (case-sensitive).

```
link
heading
RootWebArea
```

### Wildcard

`*` matches any node regardless of role.

```
*
*[level]
```

### UID

`#uid` matches the node with that exact `uid`.

```
#1_3
```

---

## Attribute filters

Appended to a role (or `*`) inside `[…]`. Multiple filters on the same selector are ANDed.

| Syntax | Meaning |
|---|---|
| `[attr]` | attribute exists |
| `[attr=value]` | attribute equals `value` |
| `[attr^=value]` | attribute starts with `value` |
| `[attr$=value]` | attribute ends with `value` |
| `[attr*=value]` | attribute contains `value` (substring) |
| `[attr~=value]` | attribute contains `value` as a whole space-separated word |

`name` is a virtual attribute that maps to `AxNode.name`; all other names map to `AxNode.attributes`.

String values may be quoted (`"…"`) or unquoted (identifier characters `[a-zA-Z0-9_-]`).

```
heading[level]
link[name="Learn more"]
link[url^="https://iana.org"]
link[url$=".org"]
link[url*="iana"]
button[name~="Submit"]
```

---

## Combinators

### Descendant (space)

`A B` — `B` is anywhere inside `A`.

```
RootWebArea link
RootWebArea StaticText
```

### Direct child (`>`)

`A > B` — `B` is an immediate child of `A`.

```
RootWebArea > heading
RootWebArea > link
```

### Adjacent sibling (`+`)

`A + B` — `B` is the immediately following sibling of `A` (same parent, `A` comes directly before `B` in the children array).

```
label + input
link + button
```

### General sibling (`~`)

`A ~ B` — `B` is any following sibling of `A` (same parent, `A` appears before `B`).

```
link ~ link
heading ~ button
```

---

## Positional pseudo-classes

Positional pseudo-classes narrow a match by position within a parent's children array. Indexing follows CSS convention: the first child is index 1.

| Syntax | Meaning |
|---|---|
| `:first-child` | node is the first child of its parent |
| `:last-child` | node is the last child of its parent |
| `:nth-child(n)` | node is the nth child (1-based integer) |

Multiple pseudo-classes may be stacked on the same selector (ANDed). Nodes with no parent (the root) never match positional pseudo-classes.

```
link:first-child
button:last-child
menuitem:nth-child(2)
link:first-child:nth-child(1)
```

---

## Union (`,`)

`A, B` — matches nodes that satisfy `A` **or** `B`. Evaluated left-to-right; results preserve document order.

```
heading, link
heading[level="1"], link[url*="iana"]
```

---

## Combining everything

Selectors compose freely:

```
RootWebArea > link[url*="iana"]
heading[level], link[name^="Learn"]
RootWebArea > heading[level="1"]
main > link + button
link ~ link[href^="/"]
nav > menuitem:nth-child(2)
```

---

## Error messages

Parse errors include the original selector string and a column pointer to the offending character.

```
Unexpected character '%' at column 4:
  link%
      ^
```

---

## Quick reference

```
role                     match by role
#uid                     match by uid
*                        any role

role[attr]               attribute exists
role[attr=val]           attribute equals
role[attr^=val]          attribute starts with
role[attr$=val]          attribute ends with
role[attr*=val]          attribute contains (substring)
role[attr~=val]          attribute contains whole word val
role[name="…"]           node name (virtual attribute)

A B                      B is a descendant of A
A > B                    B is a direct child of A
A + B                    B is the immediately following sibling of A
A ~ B                    B is any following sibling of A
A, B                     union (A or B)

role:first-child         node is the first child of its parent
role:last-child          node is the last child of its parent
role:nth-child(n)        node is the nth child (1-based)
```
