---
name: linkedin-coldmessage
description: >
  Conduct cold-outreach conversations on LinkedIn DMs from the command line: open the
  messaging page, list existing conversations, send the initial cold message, fetch
  the thread transcript to see if the prospect replied, and follow up with the next
  message in the cadence. Drives the LinkedIn UI through `linkedin_cli.ts`, which talks
  to a live browser via FastBrowser. Use this skill whenever the user wants to "send a
  cold DM on LinkedIn", "follow up with <prospect>", "check if <prospect> replied",
  "read my LinkedIn DM thread with <person>", "run a cold outreach sequence on
  LinkedIn", or any reference to LinkedIn DM cold messaging.
---

# linkedin-coldmessage Skill

Drive a real LinkedIn session to run cold-message conversations end-to-end:
land on the messaging page, send the opener, poll the thread for a reply, and send
the follow-up. Backed by `linkedin_cli.ts`, which uses FastBrowser to control an
already-authenticated Chrome session — there is no LinkedIn API key, the script
acts on the logged-in user's behalf.

---

## Prerequisites

- A Chrome session already logged into LinkedIn (FastBrowser drives the live browser).
- The FastBrowser daemon is running (the script auto-starts it via `FastBrowserHelper.run('check')`).
- `npx tsx` available (the script's shebang is `#!/usr/bin/env npx tsx`).

---

## Invocation

All commands are run from this skill's directory and invoke the bundled script:

```bash
npx tsx ../../src/linkedin_cli.ts <command> [args...]
```

The script path is relative to the skill folder
(`packages/fastbrowser_cli/contribs/linkedin_cli/skills/linkedin-coldmessage/`).

---

## Quick Reference

| Goal                                    | Command                                                          |
|-----------------------------------------|------------------------------------------------------------------|
| Open the messaging page (do this first) | `npx tsx ../../src/linkedin_cli.ts dm_page`                      |
| List people you have conversations with | `npx tsx ../../src/linkedin_cli.ts dm_list`                      |
| Send a message in a conversation        | `npx tsx ../../src/linkedin_cli.ts dm_send '<name>' '<message>'` |
| Read the full thread with someone       | `npx tsx ../../src/linkedin_cli.ts dm_thread '<name>'`           |

`<name>` is the conversation heading as it appears in the LinkedIn left rail
(typically the person's full display name). Matching is prefix-based — passing
the first word of the name is usually enough but ambiguous prefixes will pick
the first match.

---

## Cold-Message Workflow

A typical cold-outreach cycle looks like this:

1. **Land on the messaging page.** Required before any `dm_*` command.
   ```bash
   npx tsx ../../src/linkedin_cli.ts dm_page
   ```

2. **(Optional) See who you currently have a thread with.**
   ```bash
   npx tsx ../../src/linkedin_cli.ts dm_list
   ```
   The list comes from the conversation rail — only people you already have a
   thread with appear. To start a brand-new conversation, the thread must
   already exist (e.g. accept their connection request first).

3. **Send the opener.**
   ```bash
   npx tsx ../../src/linkedin_cli.ts dm_send 'Jane Doe' \
     'Hi Jane — saw your post on agent evals last week and wanted to reach out…'
   ```

4. **Wait, then check for a reply.** Re-run `dm_page` if the page may have
   navigated away, then read the transcript:
   ```bash
   npx tsx ../../src/linkedin_cli.ts dm_page
   npx tsx ../../src/linkedin_cli.ts dm_thread 'Jane Doe'
   ```

5. **Follow up based on the transcript.** Decide whether to send the next message
   in the cadence, answer their question, or stop.
   ```bash
   npx tsx ../../src/linkedin_cli.ts dm_send 'Jane Doe' \
     'Thanks for the quick reply — do you have 15 min next week?'
   ```

---

## Command Details

### `dm_page`
Navigates the live browser to `https://www.linkedin.com/messaging/`. Run this
before `dm_list`, `dm_send`, or `dm_thread` — those commands assume you are
already on the messaging page.

### `dm_list`
Prints one conversation name per line (the heading as shown in the left rail).
Use the output to pick the exact `<name>` to pass to `dm_send` / `dm_thread`.

### `dm_send <target_user> <message>`
Selects the conversation whose heading starts with `<target_user>` and sends
`<message>` in the composer. Always quote both arguments. Newlines and
punctuation in `<message>` are preserved.

### `dm_thread <target_user>`
Selects the conversation and prints the full message transcript to stdout
(parsed from the accessibility tree by `LinkedinThreadHelper`). Use this to
see whether the prospect has replied since your last message.

---

## Tips for Cold Outreach

- **Personalize the opener.** Reference something specific — a recent post,
  a shared connection, a project on their profile.
- **Keep it short.** First message under ~400 characters tends to read better
  in the LinkedIn DM pane.
- **Pace follow-ups.** Wait at least a few business days between
  `dm_send` calls to the same person. Use `dm_thread` to confirm they have
  not already replied before sending another follow-up.
- **Stop on negative signals.** If `dm_thread` shows a "not interested" or
  "please remove" reply, do not send a follow-up.
- **Match the tone of their reply.** If the prospect replies casually, drop
  the formal template; if they reply formally, stay formal.