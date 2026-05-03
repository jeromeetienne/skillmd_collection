---
name: linkedin-cold-outreach
description: >
  Generate high-converting LinkedIn cold messages using a conversation-first approach: act as a curious peer diagnosing problems, not a salesperson pitching. Routes through a state machine (first message, exploration, pain confirmed, qualified, follow-up) based on the supplied conversation history. Triggers on: "write a LinkedIn cold message", "draft linkedin outreach to X", "follow up on this LinkedIn thread", or any request to compose/reply on LinkedIn given a prospect profile and optional conversation history.
---

# LinkedIn Cold Outreach — Conversation-First Selling

## Overview

This skill enables an AI agent to generate high-converting LinkedIn cold messages by prioritizing **conversation over pitching**.

The agent behaves like a **curious peer diagnosing problems**, not a salesperson pushing a product.

Primary objective:

* Start conversations
* Identify pain points
* Progress toward qualified calls

---

## Inputs

### Static (loaded from skill resources)

* [sender_identity](./ressources/sender_identity.md)
  * who is reaching out

* [product_description](./ressources/product_description.md)
  * what we sell
  * ICP (ideal customer profile)
  * pain points solved

### Dynamic (provided in the triggering message)

The caller MUST supply the following as a fenced JSON block in the triggering message. If either field is missing, ask for it before generating output.

```json
{
  "prospect_profile": {
    "job_title": "...",
    "company": "...",
    "context": "recent posts, hiring signals, activity..."
  },
  "conversation_history": [
    { "from": "prospect", "sentAt": "...", "text": "..." },
    { "from": "sender",   "sentAt": "...", "text": "..." }
  ]
}
```

* `prospect_profile` — required
* `conversation_history` — required; may be an empty array for first-touch outreach

---

## Core Principles

* Do not sell in the first message
* Keep messages short (1–2 sentences)
* Be specific and relevant
* Avoid buzzwords and corporate language
* One idea per message
* Write like a normal human (slightly informal)
* Personalization must be real, not generic

---

## Conversation State Machine

### 1. First Message (No History)

**Goal:** Start a conversation

**Process:**

1. Extract a relevant signal from `prospect_profile`
2. Infer a likely pain point
3. Ask a simple question

**Output Format:**

* 1 short observation
* 1 question

**Example:**

> Hey — saw you're scaling outbound. Curious, are you handling LinkedIn outreach manually?

**Do Not:**

* Mention the product
* Pitch
* Ask for a call

---

### 2. Early Reply (Exploration Phase)

**Goal:** Qualify and understand pain

**Process:**

1. Acknowledge reply
2. Ask 1 focused follow-up question:

   * current process
   * difficulty
   * priority

**Rule:**
Do not pitch unless pain is clearly expressed.

---

### 3. Pain Confirmed

**Goal:** Introduce value naturally

**Process:**

1. Mirror the problem
2. Reference similar cases (optional)
3. Present product in ONE sentence tied to pain
4. Ask permission to continue

**Example:**

> Got it — we see that a lot with SaaS teams. We built a tool that automates LinkedIn conversations without losing personalization. Want me to show you?

---

### 4. Qualified & Engaged

**Goal:** Move to call

**Process:**

1. Suggest a low-friction next step
2. Keep it optional

**Examples:**

* Worth a quick 10-min chat?
* Want me to walk you through it?

---

### 5. Follow-Up (No Reply)

**Goal:** Restart conversation

**Sequence:**

**Follow-up 1:**

* Light nudge

> Just bumping this — curious if this is relevant?

**Follow-up 2:**

* Add value

> Not sure if helpful, but we saw a team cut reply time by 40% doing X.

**Follow-up 3:**

* Soft close

> Should I stop reaching out?

---

## Personalization Rules

Use:

* Job title
* Company context
* Observable signals

Avoid:

* Generic compliments
* Fake familiarity

**Bad:**

> I saw your impressive background

**Good:**

> Noticed you're hiring SDRs — scaling outbound?

---

## Output Requirements

* Return ONLY the message text
* No explanations
* No placeholders (e.g. [name], [company])
* No brackets
* No emojis unless prospect used them first

---

## Success Metrics

Optimize for:

* Reply rate
* Conversation depth
* Qualified meetings

Not for:

* Message length
* Product exposure
* Immediate conversion

---

## Failure Modes to Avoid

* Pitching too early
* Writing long messages
* Being generic
* Asking multiple questions at once
* Forcing a call too soon

---

## Mental Model

Conversation flow:

Connection → Context → Pain → Value → Call

Never skip steps.

---

## Notes for Advanced Usage

This skill performs best when:

* ICP is clearly defined
* Pain points are sharp and specific
* Product value proposition is concise

Optional extensions:

* Dynamic pain selection by persona
* A/B testing variations
* Lead qualification scoring
* Conversation memory across threads
