# Selector Language — Analysis & Migration Plan

## What's good

**Familiar mental model.** CSS selector syntax is universally known. Any developer reading `link[url*="iana"]` or `RootWebArea > heading` immediately understands the intent — zero learning curve.

**Clean internal representation.** The three-layer IR (`SimpleSelector` → `CompoundSelector` parts → groups) maps directly to the grammar. The right-to-left matching in `matchCompound` is a correct and efficient approach for ancestor checks — it avoids materialising the full ancestor path.

**`name` as a virtual attribute** is a nice ergonomic choice. `link[name="Learn more"]` reads naturally; having to write `link` and then separately check the name field would feel clunky.

**Tokeniser separates concerns properly.** Whitespace normalisation (strip leading/trailing/consecutive ws tokens) happens in one place, keeping the parser clean.

---

## What's not so good

**`*` is tokenised in two incompatible places.** The `*=` operator check consumes `*` when followed by `=`, but the wildcard `*` path is a separate dead-code block below it. The flow is brittle and a latent tokeniser bug.

**No `~=` (word-match) operator.** ARIA `name` fields are natural-language strings. `[name~="submit"]` (contains whole word) would be far more useful than `[name*="submit"]` (substring), which false-positives on "resubmit".

**Role matching is case-sensitive with no normalisation.** ARIA roles are lowercase (`link`, `button`), but real browser accessibility trees often emit mixed case (`StaticText`, `RootWebArea`). Callers must know the exact case of each role — `link` works but `Link` silently matches nothing.

**No sibling combinators.** "Find the label immediately preceding this input" is a common accessibility query with no expression in the current language.

**`[attr]` existence check silently discards a value with no operator.** The parser allows `[attr "value"]` (ident followed by string with no op token) without error — it silently discards the value. This should be a parse error.

**`uid` combined with attribute filters is undocumented.** `#1_3[name="foo"]` parses without error but the semantics are unspecified.

**Error messages give no position context.** `Unexpected character 'X' at 12` is hard to act on for long selectors. A `^` pointer into the original string would make debugging actionable.

---

## Proposed changes

### Fix the `*` tokeniser ambiguity (bug fix)

Handle `*=` with a look-ahead that does not consume `*` unless the next char is `=`, so wildcard and operator come from a single unambiguous code path.

### Add `~=` word-match operator

```
link[name~="submit"]      // matches "Submit form" but not "Resubmit"
```

### Case-insensitive role matching

Either lowercase all roles at parse time, or document and enforce an exact case contract. Silently matching nothing on a casing mismatch is the worst outcome.

### Add `+` and `~` sibling combinators

`parent.children` is already available on every `AxNode`, so sibling traversal is O(n) on sibling count.

```
label + input             // input immediately after a label
label ~ input             // any input after a label among siblings
```

### Add positional pseudo-classes

See dedicated section below.

### Tighten `[attr value]` parse error

If a value token appears inside `[…]` without an operator, throw rather than silently discarding it.

### Improve error messages

Include the original selector string and a column pointer:

```
Unexpected character at column 12:
  RootWebArea >> heading
              ^
```

---

## Positional pseudo-classes

### The case for them

Sometimes **position within a parent** is the only reliable discriminator:

- A toolbar with multiple unlabelled `button` nodes — you want the third one
- A table where all `row` nodes have no distinguishing name
- A list where `listitem` nodes are identical except for position
- Navigation menus where items share the same role and name pattern

Without positional selectors the only workaround is `querySelectorAll("button")` and indexing into the result array in calling code — which leaks structural knowledge out of the selector.

### The case against (lower priority)

Accessibility trees are semantically richer than HTML. Every node *should* have a meaningful `name`. If you reach for `:nth-child`, it often signals the tree is poorly labelled — and `[name="Submit"]` is more robust anyway.

Positional selectors are also the most brittle selectors in CSS: a UI change that adds a button breaks `:nth-child(3)`. Name-based selectors survive layout changes.

The `uid` already solves the one-off case — if you need exactly one specific node, `#1_3` is more stable than a position.

### Recommendation

Add them in limited form, in priority order:

| Pseudo | Priority | Reason |
|---|---|---|
| `:first-child` | High | Simple to implement, very common need |
| `:last-child` | High | Symmetric with first, same cost |
| `:nth-child(n)` | Medium | Integer-only; covers 95% of real use cases |
| `:nth-of-type(n)` | Low | Useful in mixed-role parents, but adds parsing complexity |

Hold off on the full CSS `An+B` formula (`2n+1`, `odd`, `even`) — significant parser complexity for marginal gain in this domain.

### Examples

```
link:first-child
button:last-child
menuitem:nth-child(2)
listitem:nth-of-type(2)     // second listitem among siblings, ignoring other roles
```

### Implementation note

Positional pseudo-classes need access to siblings, which `matchSimple` currently does not have. The change is small: compute the node's index on demand via `node.parent?.children.indexOf(node)` — `parent` is already on every `AxNode`. Cost is O(n) on sibling count, acceptable.

`:nth-of-type` counts only siblings of the same role, requiring a filtered index: `node.parent?.children.filter(c => c.role === node.role).indexOf(node)`.
