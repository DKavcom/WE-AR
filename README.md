# Re-Wear

A sustainable clothing app that helps people avoid unnecessary purchases and rediscover their existing wardrobe — built with fun, daily engagement mechanics (streaks, XP, leaderboard) to keep the habit sticky.

## Problem

People often buy clothes without knowing if the new piece actually works with what they already own. This leads to unnecessary purchases and underused, wasted clothing. Sustainability nudges alone don't work well because people become desensitized to them — this is an **engagement problem**, not just a data problem. Re-Wear borrows the "Duolingo model" (streaks, XP, social competition) to turn sustainable wardrobe habits into a daily habit rather than a one-off decision.

## What the app does

1. **Scan your closet** — take a photo of a clothing item, and GPT-4o mini vision automatically extracts its category, color, style tags, and condition, saving it to your digital closet. Before saving, the item is checked against your existing closet for likely duplicates (rule-based match on category + color + tags); if a strong match is found, you're prompted to confirm it's actually a new item before it's added.
2. **Should I Buy This?** ("Buy Check") — before purchasing something new, scan it. The app compares it against your existing closet and flags if you already own something similar, with a secondhand search link offered as an alternative to buying new. Skipping the purchase, or choosing secondhand, awards bonus XP.
3. **Avatar & Today's Outfit** — a customizable 2D avatar wears a daily outfit auto-generated from your closet. Selection is biased toward items that haven't been worn in a while, so neglected pieces get surfaced more often, while a rule-based compatibility check (category/color/tag matching) avoids obviously clashing combinations. Confirming you wore the suggested outfit is what awards XP and updates your streak — this replaces a separate manual check-in step.
4. **XP, streaks & leaderboard** — XP is earned by confirming your daily outfit was worn, from skipping a purchase or choosing secondhand in the Buy Check flow, and from completing wardrobe challenges (see below). Points feed into a streak counter and a leaderboard, giving the app a social, competitive layer.
5. **Wardrobe nudges & challenges** — items unworn for 2+ months are flagged on the closet grid. A flagged item triggers a 5-day challenge: wear it, or start a trade/sell/donate flow instead. Completing the "wear it" challenge awards bonus XP; choosing trade/sell/donate routes the item into the secondhand flow below.
6. **Secondhand & end-of-life routing** — for challenge items being let go, or items marked worn-out, the app generates a pre-formed secondhand marketplace search link (e.g. Carousell) built from the item's category/color/tags, so users can list or search for a replacement without a live marketplace integration.

## Screens

| Screen | Purpose |
|---|---|
| Home / Closet Grid | Shows your scanned wardrobe, streak, XP total, and a leaderboard snippet. Stale items show a nudge badge. |
| Add Item | Scan a new clothing item; confirm the AI-extracted attributes; resolves any duplicate-match warning; save to closet. |
| Avatar / Today's Outfit | Shows your avatar wearing today's auto-generated outfit; confirming "worn it" awards XP and updates streak. |
| Buy Check | Scan a prospective purchase; see if it matches something you own; get a secondhand link; skipping/buying secondhand awards bonus XP. |
| Challenges | Lists active 5-day challenges on neglected items; lets the user mark an item as worn, or start a trade/sell/donate flow. |
| Leaderboard | Ranked list of users by XP. |

## How it works (technical overview)

- **Vision extraction (backend):** clothing photos are sent to GPT-4o mini vision with a strict prompt requesting JSON-only output (category, color, style_tags, condition_notes). Malformed JSON responses are stripped of markdown fences and re-parsed; a retry is used if parsing still fails.
- **Data layer:** PostgreSQL via Supabase (chosen for built-in Auth, Storage for item photos, and Row-Level Security so users can only see their own closet). Three tables:
  - `users` — id, name, xp, streak_count, last_checkin_date
  - `items` — id, user_id, image_url, category, color, style_tags, date_added, last_worn_fake, condition_notes, tags_source (`ai` or `manual`), is_duplicate_of
  - `challenges` — id, user_id, item_id, type (`wear`/`trade`/`sell`/`donate`), deadline, status
- **Matching & duplicate logic:** a rule-based similarity score (category match = 50pts, color match = 30pts, up to 20pts for overlapping style tags) is used for two purposes — comparing a prospective purchase against the closet in Buy Check, and flagging likely duplicates when adding a new item (score ≥ 80 triggers a confirmation prompt rather than blocking the add).
- **Neglect detection:** items with `last_worn_fake` older than 2 months are surfaced as nudges and are eligible to have a 5-day challenge created against them.
- **Core backend functions:** `getClosetItems`, `addItem` (AI tagging + duplicate check), `checkSimilarity`, `checkin` (invoked via the Today's Outfit confirmation), `buycheckResult`, `getLeaderboard`, `getNeglectedItems`, `createChallenge`, `resolveChallenge`, `generateSecondhandLink`, `flagWornOut`.
- **Frontend:** connects to the data layer across the five screens above, with the daily-outfit-confirmation → XP → streak → leaderboard loop as the core habit hook.

## Example: extracted attributes JSON

```json
{
  "category": "top",
  "color": "navy",
  "style_tags": ["casual", "smart-casual", "cotton"],
  "condition_notes": "minor fraying at cuff"
}
```

## API contract (backend → frontend)

**Endpoint:** `POST http://localhost:3001/extract-attributes`

**Request:** `multipart/form-data`
- key: `image` (type: File)

**Response (success):**
```json
{ "success": true, "attributes": { ...as above... } }
```

**Response (failure):**
```json
{ "success": false, "error": "Failed to extract attributes. Please try again." }
```

## Tech stack

- Backend: Node.js, Express, Multer, Sharp, OpenAI SDK (GPT-4o mini vision)
- Data: PostgreSQL via Supabase (Auth, Storage, Row-Level Security)
- Frontend: React Native (Expo) — proposed for camera access + cross-platform demo; not yet confirmed by Person C

## Project structure

```
closet-check/
├── backend/     # vision extraction API (Person A)
├── data/        # database, matching logic, XP/streak/leaderboard engine (Person B)
├── frontend/    # UI screens (Person C)
└── README.md
```

## Setup

```bash
# Backend
cd backend
npm install
# create a .env file with:
#   OPENAI_API_KEY=your-key-here
#   PORT=3001
node index.js
```

_(Person B and Person C: add your own setup instructions here for the data layer and frontend.)_

## Team & workload split

- **Person A (backend/vision):** GPT-4o mini extraction endpoint, image handling, JSON parsing/retry logic.
- **Person B (data & logic):** database schema, similarity/duplicate/matching logic, XP/streak/leaderboard engine, neglect detection & challenge lifecycle, secondhand link generation.
- **Person C (frontend):** app screens (including avatar rendering), wiring to both APIs, overall UX polish.

## Scope notes / known limitations

- The avatar is a 2D layered "paper doll" (fixed body base + clothing image layers per slot), not a photorealistic try-on — full virtual try-on models are out of scope for the timeframe.
- Wear-tracking ("last worn") is currently seeded/simulated for demo purposes rather than tracked from real ongoing usage.
- Secondhand marketplace integration is a pre-formed search link (e.g. Carousell), not a live API integration.
- Similarity/duplicate matching uses rule-based attribute comparison rather than image embeddings, to keep it buildable within the hackathon timeframe. The duplicate-detection threshold (80/100) is a starting point and may need tuning against real seeded data.

---

_Built for [hackathon name] — add final pitch framing, team names, and any demo links here before submission._
_Built for [hackathon name] — add final pitch framing, team names, and any demo links here before submission._
