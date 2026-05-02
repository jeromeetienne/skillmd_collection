# Three Selector Languages, One Page: A11y, CSS, and Playwright

There are three reasonable ways to point at "the Submit button" on a webpage:

```
CSS:         form#checkout button.btn-primary[type="submit"]
Playwright:  page.getByRole('button', { name: 'Submit' })
a11y:        button[name="Submit"]
```

All three resolve to the same DOM element on the same page, on a good day. They are not interchangeable. They run against different trees, are stable under different kinds of change, and read differently to humans, tools, and LLMs. The interesting comparison is not the syntax — it's what each one is actually querying.

## What Each Language Targets

**CSS selectors** operate on the **DOM**. Tags, classes, ids, attributes, descendant and sibling structure. Standardized by the W3C, implemented in every browser, used everywhere from stylesheets to `document.querySelectorAll`. The vocabulary is "what this element *is* in markup": `div`, `a`, `.btn-primary`, `#main`.

**Playwright locators** operate on a **hybrid**. Under the hood they resolve against the live DOM, but the recommended locator API — `getByRole`, `getByLabel`, `getByText`, `getByAltText`, `getByPlaceholder`, `getByTitle`, `getByTestId` — is computed from accessibility properties. Playwright also accepts raw CSS, XPath, and chained `.filter()` / `.nth()` calls. So the "Playwright selector" is really a layered API with two stories: an accessibility-first story (use roles and names) and a fallback story (use CSS or test ids when the markup is poor).

**The `a11y_parse` selector language** operates on the **accessibility tree** only. No DOM, no styles, no layout. Selectors match by role, name, ARIA attributes, UID, and tree position. The grammar is CSS-shaped — descendant, child, sibling, attribute matchers, unions, `:nth-child`, and the functional pseudo-classes `:is` / `:where` / `:not` / `:has` — but the substrate underneath is the same one screen readers see.

| Language    | Substrate         | Vocabulary                          | Lives where         |
|-------------|-------------------|-------------------------------------|---------------------|
| CSS         | DOM               | tag, class, id, attribute           | every browser       |
| Playwright  | DOM + a11y hybrid | role + name (preferred), CSS (fallback) | Playwright runtime |
| a11y_parse  | accessibility tree | role, name, ARIA attribute         | snapshot string     |

## Side by Side, Same Targets

A handful of common tasks, three syntaxes each.

**A button by visible label.**

```
CSS:         button[aria-label="Submit"]      # or worse: button.cta-primary
Playwright:  page.getByRole('button', { name: 'Submit' })
a11y:        button[name="Submit"]
```

**All external links.**

```
CSS:         a[href^="https://"]
Playwright:  page.locator('a[href^="https://"]')   // CSS fallback
a11y:        link[url^="https"]
```

**The third item in a nav menu.**

```
CSS:         nav > ul > li:nth-child(3) > a
Playwright:  page.getByRole('navigation').getByRole('link').nth(2)   // 0-indexed!
a11y:        navigation link:nth-child(3)                            // 1-indexed
```

**A heading whose text starts with "Learn".**

```
CSS:         (not really possible — CSS can't match text)
Playwright:  page.getByRole('heading', { name: /^Learn/ })
a11y:        heading[name^="Learn"]
```

**A list item that contains an external link.**

```
CSS:         li:has(a[href^="https://"])
Playwright:  page.getByRole('listitem').filter({ has: page.locator('a[href^="https://"]') })
a11y:        listitem:has(link[url^="https"])
```

The pattern: where CSS runs out (text content, semantic role), Playwright and a11y pick up. Where Playwright is verbose chained calls, a11y stays declarative — a single string you can log, ship over the wire, or paste into a CLI.

## Where Each Language Is Strong

**CSS** is strong when you wrote the markup, you control the classes, and the page is yours. It's also unbeatable for things the a11y tree doesn't carry — visual structure, computed styles, pseudo-elements. And it's what CSS was designed for: styling, not scripting. If you're styling, this section is over.

**Playwright locators** are strong when you're driving a live browser. Auto-waiting, retries, and assertions are baked in. The `getByRole` family nudges you toward accessible markup, which is good for both your users and your tests. Chaining is expressive: `page.getByRole('form', { name: 'Checkout' }).getByRole('button', { name: 'Submit' })` reads almost like prose. None of that exists outside the Playwright runtime.

**a11y_parse selectors** are strong when you're consuming a snapshot rather than driving a page. AI agents that emit selectors as text. Offline analysis of captured trees. Diffs between two snapshots of the same page. Anywhere you want a small, declarative, portable string — easy to log, easy to LLM-generate, easy to test. They also win on stability: roles and names change far less often than class names or DOM structure.

## Where Each Language Breaks Down

**CSS** breaks on class soup. `div.css-1gx4k7c > div.css-9p2kqr > a.css-7bz3wn` is a selector that won't survive next Tuesday's deploy. CSS also has no notion of role or accessible name and can't match by visible text — the two things agents and tests usually want most.

**Playwright locators** are only as accessible-first as the page they're pointing at. On a poorly-marked-up app, `getByRole('button', { name: 'Submit' })` finds nothing because the "button" is a `<div onclick>`. You fall back to CSS or `getByTestId`, and the accessibility-first promise quietly weakens. There's also a runtime constraint: locators are JavaScript objects, not strings. You can't put one in a JSON payload, ship it to another process, or hand it to an LLM as plain text.

**a11y_parse selectors** are only as good as the accessibility tree. Custom components with bad ARIA expose junk. Canvas-rendered UIs are invisible. Heavily dynamic content can lag behind. There's no `:hover`, no computed styles, no pseudo-elements — the tree doesn't carry that information. For some tasks (most agent tasks) this is fine; for some (visual regression testing) it isn't.

## The Substrate Argument

The syntactic differences between these three languages are surface noise. The interesting question is *what tree are you querying?*

The DOM is faithful and complete. It is also noisy, deeply nested, and unstable across visual redesigns. Class names rotate. Layout `div`s come and go. A selector built on it is a hostage to fortune.

The accessibility tree is pruned and semantic. Roles and names are a contract between the page author and assistive tech. They survive redesigns that shatter DOM-based selectors. They're also lossy — decorative elements vanish, custom components can be misrepresented — but for the questions agents and tests actually ask, that's a feature, not a bug.

Both Playwright's `getByRole` family and `a11y_parse` are bets that the accessibility tree is the right substrate for *finding* things, even when you eventually act on the DOM. They differ in where they place the bet:

- **Playwright** bets at runtime, against a live browser, with the DOM right there as a fallback.
- **a11y_parse** bets at the snapshot layer — once the tree is serialized to a string, the DOM is gone.

That makes them complements rather than competitors. Playwright drives the page; `a11y_parse` queries the snapshot you took with it (or with `fastbrowser_cli`, or any other tool that emits the same text format).

## A Note on LLM-Legibility

There's one axis where a11y selectors quietly win, and it's worth a short detour.

A 60-character a11y selector fits in a function-call argument:

```
'navigation link[url^="https"]'
```

A Playwright locator chain is multi-line code that has to round-trip through a JavaScript runtime:

```js
page.getByRole('navigation')
    .getByRole('link')
    .filter({ hasNot: page.locator('[href^="/"]') })
```

A CSS selector built from class soup is unreadable to a model and brittle when it tries:

```
nav.css-1gx4k7c > ul.css-9p2kqr > li > a.css-7bz3wn--external
```

LLMs generating selectors do better when three things hold:

- The vocabulary is small (roles, names, a few attributes). a11y wins.
- The grammar is one they've seen a million times in training (CSS-shaped). CSS and a11y win, Playwright loses.
- The target is stable across deploys (semantics, not classes). Playwright `getByRole` and a11y win, CSS loses.

`a11y_parse` is deliberately CSS *shape* over accessibility *semantics*: familiar grammar, stable vocabulary. That intersection is the sweet spot for agents.

## Quick Decision Guide

- **Driving a live browser, writing tests?** → Playwright locators, with `getByRole` first, CSS fallback when forced.
- **Querying a snapshot, building an AI agent, doing offline analysis?** → a11y selectors.
- **Styling, or you control the markup and need structural matching?** → CSS.
- **Mix and match.** Use Playwright to capture, `a11y_parse` to query, CSS only when the a11y tree truly doesn't have what you need.

## Takeaways

Three languages, three substrates, three different stability guarantees. CSS is the lingua franca of styling and a workable scripting fallback. Playwright locators are the right tool for live-browser automation. a11y selectors are the right tool when the page has already been reduced to a tree and you just need to point at things in it.

"Which selector language should I use?" is the wrong first question. "Which tree am I querying?" is the right one. Pick the substrate, and the syntax mostly picks itself.

Pointers:

- [Playwright Locators](https://playwright.dev/docs/locators)
- [MDN — CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [`a11y_parse` selector spec](https://github.com/jeromeetienne/skillmd_collection/blob/main/packages/a11y_parse/docs/spec_a11y_selector_language.md)