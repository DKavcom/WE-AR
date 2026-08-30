# ReWear

ReWear is a sustainable wardrobe assistant that helps people buy less, wear more of what they already own, and make better use of neglected clothing.

The prototype combines AI clothing analysis, wardrobe similarity checking, outfit recommendations, side-by-side outfit comparison, and gamification mechanics such as XP, streaks, challenges, and sustainable wardrobe actions.

## The Problem

People often buy clothes without remembering what they already own or knowing whether a new piece adds anything meaningful to their wardrobe.

At the same time, many existing clothes go unworn for long periods.

ReWear tackles both sides of the problem:

- Reduce unnecessary purchases
- Bring neglected clothing back into rotation
- Make sustainable wardrobe habits engaging rather than preachy
- Help users understand and use their existing wardrobe more effectively

The product borrows habit-building ideas from apps such as Duolingo: progress, streaks, XP, challenges, and repeated lightweight interactions.

---

# Core Features

## 1. AI Add to Wardrobe

Users upload a photo of a clothing item they already own.

The backend sends the actual image to an OpenAI vision model and extracts structured clothing attributes such as:

- Broad category
- Garment type / subcategory
- Primary color
- Secondary colors
- Dominant hex color
- Pattern
- Style tags
- Fit
- Sleeve length
- Garment length
- Estimated material
- Formality
- Season
- Condition notes

The app automatically creates the wardrobe item using the extracted metadata.

Manual editing is optional and is mainly used to correct AI mistakes or add extra information.

The user does not need to manually enter basic information such as garment type or color.

### Example flow

```text
Upload clothing photo
        ↓
AI analyzes image
        ↓
Detected metadata shown
        ↓
Optional user corrections
        ↓
Add to Wardrobe
```

---

## 2. Check Before You Buy

Before purchasing a new piece, the user can upload a photo of it.

The application analyzes the clothing and checks whether the user already owns something similar.

### Flow

```text
Upload prospective purchase
        ↓
AI extracts garment attributes
        ↓
Candidate compared against active wardrobe
        ↓
Closest owned item found
        ↓
Similarity score calculated
        ↓
HIGH / MEDIUM / LOW result
```

Similarity considers:

- Broad category
- Garment type
- Color
- Pattern
- Style tags
- Fit
- Formality
- Material

Broad category alone is intentionally not enough to create a strong similarity result.

For example, a grey T-shirt and a green plaid button-up may both be classified as tops, but they should still receive a LOW similarity score.

Each upload is treated as a new analysis transaction so previous results cannot leak into later checks.

---

## 3. Real Digital Wardrobe

The prototype includes a real local wardrobe dataset containing:

- Tops
- Bottoms
- Jackets / outerwear
- Shoes
- Accessories

Users can also add their own clothing through the AI upload flow.

Wardrobe items can store information including:

- Image
- Name
- Category
- AI-extracted metadata
- Wear count
- Last worn date
- Lifecycle status
- Sustainable actions

Prototype data is persisted locally in the browser using guarded `localStorage`.

---

## 4. Home Outfit

Home acts as the user's main daily wardrobe surface.

A suggested outfit is generated entirely from clothing the user actually owns.

Typical outfit slots include:

- Top
- Bottom
- Shoes
- Optional outerwear
- Optional accessory

The generator uses weighted randomness.

Neglected and rarely worn items receive a higher probability of appearing, but they are not supposed to be selected deterministically every time.

Users can:

- Shuffle Fit
- Directly replace clothing using their wardrobe
- Save the exact current outfit
- Confirm that they wore the outfit

Displaying an outfit does not count as wearing it.

Only explicit confirmation updates wardrobe usage.

---

## 5. Compare Fits

Compare Fits is primarily an outfit decision tool.

Users build two outfits side by side using clothing they already own.

For example:

| Look A | Look B |
|---|---|
| Blue T-Shirt | Yellow T-Shirt |
| Black Trousers | Black Trousers |
| White Sneakers | White Sneakers |

Users can duplicate Look A into Look B and then change only one item.

This makes it easy to answer questions such as:

> Does the blue shirt or yellow shirt look better with these trousers and shoes?

When the user selects a preferred look, the application also stores that decision as lightweight style preference data.

This preference data can later influence outfit recommendations.

The primary purpose of Compare Fits is outfit comparison, not explicitly training AI.

---

## 6. AI Outfit Recommendations

The backend exposes an AI outfit recommendation endpoint.

Recommendations:

- Use only clothing supplied from the user's active wardrobe
- Reference wardrobe item IDs rather than inventing clothing
- Support multiple outfit options
- Can incorporate stored Compare Fits preferences
- Can require a specific wardrobe item when styling from a similarity result

Returned wardrobe IDs are validated before being returned to the frontend.

If the recommendation API is unavailable, the frontend retains a deterministic local fallback.

### Example flow

```text
Check Before You Buy
        ↓
Similar owned item found
        ↓
Style What I Own
        ↓
AI receives active wardrobe
        ↓
Outfit generated around owned item
```

---

## 7. Saved Fits

Users can save exact outfit combinations.

Saved Fits persist locally and reopen using the same wardrobe item IDs that were originally stored.

The Home outfit also includes a direct:

```text
Save Fit
```

control.

When the exact current combination is already saved, the control changes to:

```text
Saved ✓
```

Changing or shuffling the outfit recalculates whether the new combination is saved.

---

# Gamification

Gamification is a major part of ReWear.

The goal is to make sustainable wardrobe habits rewarding and repeatable instead of relying only on sustainability warnings.

## XP

Users earn XP through confirmed actions such as:

- Wearing an outfit
- Completing wardrobe challenges
- Repurposing clothing
- Donating clothing
- Trading clothing
- Selling clothing

XP and level progress persist locally.

Typical prototype rewards include:

| Action | XP |
|---|---:|
| Confirm outfit worn | +30 XP |
| Neglected item challenge | +50 XP |
| Mix It Up challenge | +60 XP |
| Rotation challenge | +60 XP |
| Repurpose | +80 XP |
| Donate | +100 XP |
| Trade | +90 XP |
| Sell | +80 XP |

Reward values are centralized in the frontend progress system.

---

## Wear Streak

The streak is based on confirmed wardrobe use.

Opening the app or viewing an outfit does not increment the streak.

A calendar day qualifies when the user explicitly confirms that they wore an outfit.

Multiple confirmations on the same calendar day do not artificially increase the streak multiple times.

---

## Challenges

Challenges are generated from the user's actual wardrobe and usage history.

Implemented challenge concepts include:

### Bring It Back

Wear a neglected item.

### Forgotten Favorite

Wear a never-worn or rarely used piece.

### Mix It Up

Wear multiple distinct outfit combinations.

### Rotation Ready

Rotate through different wardrobe items.

### Second Life

Repurpose an item.

### Pass It On

Donate an unused item.

### Trade Up

Trade an item.

### New Home

Sell an unused item rather than discarding it.

Challenge progress and completion persist locally.

---

## Sustainable Wardrobe Actions

Wardrobe items support explicit actions:

- Repurpose
- Donate
- Trade
- Sell

These actions require user confirmation.

The application does not pretend to automatically know that a real-world action happened.

### Repurpose

Repurposed items remain part of the active wardrobe.

### Donate / Trade / Sell

Donated, traded, and sold items are archived.

Archived items are excluded from active wardrobe flows including:

- Home outfit generation
- Home wardrobe selection
- Compare Fits
- AI recommendations
- Check Before You Buy ownership matching

Historical information is preserved instead of permanently deleting the item.

---

# AI Clothing Extraction

## Endpoint

```text
POST /extract-attributes
```

## Request

The endpoint accepts:

```text
multipart/form-data
```

with the file field:

```text
image
```

The actual image file is sent to the backend.

In API mode, filename-derived metadata is not treated as AI analysis.

## Example Response

```json
{
  "success": true,
  "attributes": {
    "category": "top",
    "subcategory": "t-shirt",
    "color": "navy",
    "secondary_colors": [],
    "pattern": "solid",
    "style_tags": ["casual"],
    "fit": "regular",
    "sleeve_length": "short",
    "length": "regular",
    "material_guess": "cotton",
    "formality_score": 1,
    "season": ["spring", "summer"],
    "dominant_hex": "#1F3557",
    "condition_notes": "good condition"
  }
}
```

---

# Outfit Recommendation API

## Endpoint

```text
POST /recommend-outfits
```

The frontend sends structured wardrobe metadata and lightweight style preference signals.

Images and base64 wardrobe photos are not required for recommendation requests.

The backend validates that every recommended item ID belongs to the supplied wardrobe.

A recommendation can also receive a required wardrobe item ID.

This supports flows such as:

```text
Check Before You Buy
        ↓
Closest owned item
        ↓
Style What I Own
        ↓
Generate outfit containing that item
```

---

# Similarity Engine

Check Before You Buy currently uses deterministic structured-attribute matching rather than image embeddings.

The current scoring considers:

| Attribute | Weight |
|---|---:|
| Broad category | 10 |
| Garment type | 30 |
| Color | 20 |
| Pattern | 10 |
| Style tags | 10 |
| Fit | 8 |
| Formality | 7 |
| Material | 5 |

Total:

```text
100 points
```

Current classifications:

```text
HIGH    ≥ 75
MEDIUM  ≥ 45
LOW     < 45
```

Category mismatches are gated so unrelated garments do not receive inflated scores simply because they share properties such as color.

For example:

```text
Blue T-Shirt vs Blue Denim Jacket
→ LOW
```

rather than incorrectly receiving a strong result just because both items are blue.

---

# Frontend Architecture

The frontend is built with:

- React
- TypeScript
- Vite
- Tailwind CSS

Major screens include:

- Home
- Wardrobe
- Add to Wardrobe
- Check Before You Buy
- Analysis
- Similarity Result
- Compare Fits
- Saved Fits
- Styling / Recommendations
- Reward / Progress

Shared frontend services separate UI logic from storage and API logic.

Services include:

- Wardrobe service
- Saved Fits service
- Preference service
- Attribute extraction service
- Similarity analysis service
- Outfit recommendation service
- Progress service
- Home outfit generation service

---

# Data Modes

The frontend supports two modes.

## API Mode

API mode uses the real backend.

Create:

```text
frontend/.env
```

with:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:3001
```

Real image extraction and AI recommendations require the backend and OpenAI API access.

---

## Local Mode

Local mode can be enabled with:

```env
VITE_DATA_MODE=local
```

Local mode keeps the prototype usable without backend/API access using deterministic fallback behavior.

---

# Running Locally

## 1. Clone the Repository

```bash
git clone https://github.com/DKavcom/WE-AR.git
cd WE-AR
```

---

## 2. Backend

```bash
cd backend
npm install
```

Create:

```text
backend/.env
```

with:

```env
OPENAI_API_KEY=your_openai_api_key
PORT=3001
```

Then run:

```bash
node index.js
```

The backend runs at:

```text
http://localhost:3001
```

Health endpoint:

```text
GET http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env
```

For the full AI-enabled prototype:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:3001
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite.

It will normally look similar to:

```text
http://localhost:5173
```

The exact port may change if another local process is already using that port.

---

# Environment Safety

Real `.env` files are ignored by Git.

Never commit:

```text
backend/.env
frontend/.env
```

Only example environment files should be committed.

---

# Current Persistence

The hackathon prototype currently uses browser `localStorage` for interactive user state.

Persisted state includes:

- Wardrobe
- AI clothing metadata
- User-added items
- Saved Fits
- Style preferences
- Wear history
- XP
- Level
- Streak
- Challenges
- Sustainable action history
- Archived wardrobe status

Storage parsing is guarded so malformed or missing local data does not crash the application.

---

# Supabase

The repository contains an early Supabase schema and wardrobe/data-layer experimentation.

However, the current interactive frontend prototype does not depend on Supabase for runtime persistence.

Moving browser-local state into authenticated Supabase accounts is a future production step.

---

# Validation

During development the prototype has been checked with:

```bash
npm run build
npx tsc --noEmit
```

Major browser flows validated include:

- AI Add to Wardrobe
- Sequential Check Before You Buy uploads
- Similarity matching
- Compare Fits
- AI recommendations
- Saved Fits
- Home outfit customization
- Shuffle Fit
- Confirmed wear
- XP
- Levels
- Streak
- Wardrobe challenges
- Donate
- Trade
- Sell
- Repurpose
- Persistence after browser refresh

---

# Project Structure

```text
WE-AR/
├── backend/
│   ├── index.js
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/
└── README.md
```

---

# Known Prototype Limitations

- User accounts and authentication are not yet connected.
- Persistent multi-user storage is not yet connected to the frontend.
- Supabase integration remains future work.
- Similarity currently uses extracted structured garment attributes rather than visual embeddings.
- Similarity quality can vary depending on lighting, cropping, angle, and model interpretation.
- Outfit visualization is still prototype-level rather than a true virtual try-on.
- Sustainable real-world actions rely on explicit user confirmation.
- API mode requires OpenAI API access and available API credits.
- Leaderboard/social competition is not yet implemented in the active prototype.

---

# Future Work

Potential next steps include:

- Authenticated Supabase persistence
- Supabase Storage for wardrobe images
- Multi-device synchronization
- Visual embedding-based clothing similarity
- Improved similarity calibration using larger validation datasets
- Stronger personalized outfit recommendations
- Social leaderboard features
- Secondhand marketplace integration
- Richer outfit visualization
- Virtual try-on
- Push notifications
- Recurring wardrobe challenges
- Improved recommendation diversity
- More advanced wardrobe analytics

---

# Hackathon Scope

WE-AR focuses on proving the complete behavioral loop:

```text
Understand what I own
        ↓
Avoid unnecessary purchases
        ↓
Style what I already have
        ↓
Bring neglected clothing back into use
        ↓
Reward sustainable behavior
        ↓
Build a repeatable wardrobe habit
```

The prototype prioritizes a functional end-to-end experience over production infrastructure or photorealistic virtual try-on.
