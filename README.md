# Re-Wear

A sustainable clothing app that helps people avoid unnecessary purchases and rediscover their existing wardrobe — built with fun, daily engagement mechanics (streaks, XP, leaderboard) to keep the habit sticky.

## Problem

People often buy clothes without knowing if the new piece actually works with what they already own. This leads to unnecessary purchases and underused, wasted clothing. Sustainability nudges alone don't work well because people become desensitized to them — this is an **engagement problem**, not just a data problem. Re-Wear borrows the "Duolingo model" (streaks, XP, social competition) to turn sustainable wardrobe habits into a daily habit rather than a one-off decision.

## What the app does

1. **Add to closet** — take a photo of a clothing item, and GPT-4o mini vision automatically extracts its category, color, style tags, and condition, and saves it straight to your digital closet.
2. **Buy Check** — before purchasing something new, scan it. The app compares it against your existing closet and flags if you already own something similar, with a secondhand search link offered as an alternative. Skipping the purchase, or choosing secondhand, is treated as a "smart choice" and awards XP.
3. **Avatar & Today's Outfit** — a customizable avatar wears a daily outfit auto-generated from your closet. Selection is biased toward items that haven't been worn in a while, so neglected pieces get surfaced more often, while a rule-based compatibility check (category/color/tag matching) avoids obviously clashing combinations. Confirming you wore the suggested outfit awards XP and updates your streak.
4. **Wardrobe nudges & challenges** — items unworn for 2+ months are flagged on the closet grid. A flagged item triggers a 5-day challenge: wear it, or start a trade/sell/donate flow instead. Completing a challenge — whichever outcome — is a "smart choice" and awards XP.
5. **XP, streaks & leaderboard** — the core habit engine. XP is earned specifically through *smart choices*: confirming the daily outfit was worn, skipping a purchase or buying secondhand in Buy Check, completing a wardrobe challenge, and donating/selling/repurposing an item. XP feeds into a streak counter and a leaderboard, giving the app a social, competitive layer.

## Screens

| Screen | Purpose |
|---|---|
| Home / Closet Grid | Shows your scanned wardrobe, streak, XP total, and a leaderboard snippet. Stale items show a nudge badge. |
| Add Item | Scan a new clothing item; confirm the AI-extracted attributes; save to closet. |
| Avatar / Today's Outfit | Shows your avatar wearing today's auto-generated outfit; confirming "worn it" awards XP and updates streak. |
| Buy Check | Scan a prospective purchase; see if it matches something you own; get a secondhand link; skipping/buying secondhand awards XP. |
| Challenges | Lists active 5-day challenges on neglected items; lets the user mark an item as worn, or start a trade/sell/donate flow — either way awards XP. |
| Leaderboard | Ranked list of users by XP. |

## How it works (technical overview)

- **Vision extraction (backend):** clothing photos are sent to GPT-4o mini vision with a strict prompt requesting JSON-only output (category, color, style_tags, condition_notes). Malformed JSON responses are stripped of markdown fences and re-parsed; a retry is used if parsing still fails.
- **Data layer:** PostgreSQL via Supabase (chosen for built-in Auth, Storage for item photos, and Row-Level Security so users can only see their own closet). Three tables:
  - `users` — id, name, xp, streak_count, last_checkin_date
  - `items` — id, user_id, image_url, category, color, style_tags, date_added, last_worn_fake, condition_notes, tags_source (`ai` or `manual`)
  - `challenges` — id, user_id, item_id, type (`wear`/`trade`/`sell`/`donate`), deadline, status
- **Matching logic:** a rule-based similarity score (category match = 50pts, color match = 30pts, up to 20pts for overlapping style tags) is used in Buy Check to compare a prospective purchase against the closet and surface the closest existing match.
- **Neglect detection:** items with `last_worn_fake` older than 2 months are surfaced as nudges and are eligible to have a 5-day challenge created against them.
- **XP awarding events:** confirming today's outfit was worn; skipping a purchase or buying secondhand in Buy Check; resolving a challenge (any outcome — wear, trade, sell, or donate); marking a worn-out item as donated/sold/repurposed.
- **Core backend functions:** `getClosetItems`, `addItem` (AI tagging), `checkSimilarity`, `checkin` (invoked via the Today's Outfit confirmation), `buycheckResult`, `getLeaderboard`, `getNeglectedItems`, `createChallenge`, `resolveChallenge`, `generateSecondhandLink`, `flagWornOut`.
- **Frontend:** connects to the data layer across the five screens above, with the smart-choice → XP → streak → leaderboard loop as the core habit hook.

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
- **Person B (data & logic):** database schema, similarity/matching logic, XP/streak/leaderboard engine, neglect detection & challenge lifecycle, secondhand link generation.
- **Person C (frontend):** app screens (including avatar rendering), wiring to both APIs, overall UX polish.

## Scope notes / known limitations

- The avatar is a 2D layered "paper doll" (fixed body base + clothing image layers per slot), not a photorealistic try-on — full virtual try-on models are out of scope for the timeframe.
- Wear-tracking ("last worn") is currently seeded/simulated for demo purposes rather than tracked from real ongoing usage.
- Secondhand marketplace integration is a pre-formed search link (e.g. Carousell), not a live API integration.
- Matching in Buy Check uses rule-based attribute comparison rather than image embeddings, to keep it buildable within the hackathon timeframe.

---

_Built for [hackathon name] — add final pitch framing, team names, and any demo links here before submission._
