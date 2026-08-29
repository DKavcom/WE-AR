# Closet Check

A sustainable clothing app that helps people avoid unnecessary purchases and rediscover their existing wardrobe — built with fun, daily engagement mechanics (streaks, XP, leaderboard) to keep the habit sticky.

## Problem

People often buy clothes without knowing if the new piece actually works with what they already own. This leads to unnecessary purchases and underused, wasted clothing. Sustainability nudges alone don't work well because people become desensitized to them — this is an **engagement problem**, not just a data problem. Closet Check borrows the "Duolingo model" (streaks, XP, social competition) to turn sustainable wardrobe habits into a daily habit rather than a one-off decision.

## What the app does

1. **Scan your closet** — take a photo of a clothing item, and GPT-4o vision automatically extracts its category, color, pattern, style tags, and condition, saving it to your digital closet.
2. **Should I Buy This?** — before purchasing something new, scan it. The app compares it against your existing closet and flags if you already own something similar, with a secondhand search link offered as an alternative to buying new.
3. **Daily check-in** — each day, tap a few items from your closet grid that you're wearing today. This takes under 30 seconds and awards XP + increments your streak.
4. **XP, streaks & leaderboard** — XP is earned from daily check-ins and from skipping a purchase or choosing secondhand in the Buy Check flow. Points feed into a streak counter and a leaderboard, giving the app a social, competitive layer.
5. **Wardrobe nudges** — items unworn for an extended period are flagged on the closet grid with a prompt to donate or repurpose them.

## Screens

| Screen | Purpose |
|---|---|
| Home / Closet Grid | Shows your scanned wardrobe, streak, XP total, and a leaderboard snippet. Stale items show a nudge badge. |
| Add Item | Scan a new clothing item; confirm the AI-extracted attributes; save to closet. |
| Daily Check-in | Tap the items you're wearing today; instant XP + streak feedback. |
| Buy Check | Scan a prospective purchase; see if it matches something you own; get a secondhand link. |
| Leaderboard | Ranked list of users by XP. |

## How it works (technical overview)

- **Vision extraction (backend):** a Node.js/Express endpoint (`POST /extract-attributes`) accepts a clothing photo, downscales it with `sharp`, and sends it to GPT-4o vision with a strict prompt requesting JSON-only output. Includes one retry if the model returns malformed JSON.
- **Data & matching logic:** items and users are stored in a simple database (category, color, pattern, style tags, last-worn date, condition notes for items; XP, streak count, last check-in date for users). A rule-based similarity score (category + color + overlapping style tags) compares a prospective purchase against the closet. A secondhand search link is generated from the item's attributes (e.g. a pre-formed Carousell search URL).
- **Frontend:** connects the two APIs across the five screens above, with the daily check-in → XP → streak → leaderboard loop as the core habit hook.

## Example: extracted attributes JSON

```json
{
  "category": "top",
  "subcategory": "button-up shirt",
  "color": "navy",
  "secondary_colors": ["white"],
  "pattern": "striped",
  "style_tags": ["casual", "smart-casual", "cotton"],
  "fit": "regular",
  "sleeve_length": "long",
  "length": "hip-length",
  "material_guess": "cotton blend",
  "formality_score": 3,
  "season": ["spring", "fall"],
  "dominant_hex": "#1B2A4A",
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

- Backend: Node.js, Express, Multer, Sharp, OpenAI SDK (GPT-4o vision)
- Data: [Person B to fill in — e.g. Supabase / Firebase / SQLite]
- Frontend: [Person C to fill in — e.g. React / etc.]

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

- **Person A (backend/vision):** GPT-4o extraction endpoint, image handling, JSON parsing/retry logic.
- **Person B (data & logic):** database schema, similarity/matching logic, XP/streak/leaderboard engine, secondhand link generation.
- **Person C (frontend):** five app screens, wiring to both APIs, overall UX polish.

## Scope notes / known limitations

- The avatar "dress-up" concept was simplified to a closet grid rather than a fully composited outfit visualization, due to time constraints.
- Wear-tracking ("last worn") is currently seeded/simulated for demo purposes rather than tracked from real ongoing usage.
- Secondhand marketplace integration is a pre-formed search link (e.g. Carousell), not a live API integration.
- Similarity matching uses rule-based attribute comparison rather than image embeddings, to keep it buildable within the hackathon timeframe.

---

_Built for [hackathon name] — add final pitch framing, team names, and any demo links here before submission._
