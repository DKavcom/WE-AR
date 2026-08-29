require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const upload = multer({ storage: multer.memoryStorage() });
let openai;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const EXTRACTION_PROMPT = `You are a clothing attribute extractor for a wardrobe app.
Look at the clothing item in the image and return ONLY a JSON object, with no markdown formatting, no backticks, and no extra text before or after it.

The JSON must have exactly this shape:
{
  "category": "top" | "bottom" | "outerwear" | "shoes" | "accessory",
  "subcategory": "<specific type, e.g. 'button-up shirt', 'skinny jeans', 'ankle boots'>",
  "color": "<primary color, one or two words>",
  "secondary_colors": ["<any other visible colors, empty array if none>"],
  "pattern": "solid" | "striped" | "checked" | "floral" | "graphic" | "other",
  "style_tags": ["<2-4 short lowercase tags, e.g. casual, denim, formal, summer>"],
  "fit": "slim" | "regular" | "loose" | "oversized" | "unknown",
  "sleeve_length": "sleeveless" | "short" | "long" | "n/a",
  "length": "<e.g. 'cropped', 'hip-length', 'knee-length', 'full-length', 'n/a'>",
  "material_guess": "<best guess, e.g. 'cotton', 'denim', 'leather', 'unknown'>",
  "formality_score": <integer 1-5, 1=very casual, 5=very formal>,
  "season": ["<any of: spring, summer, fall, winter>"],
  "dominant_hex": "<hex color code of the primary color, e.g. '#1B2A4A'>",
  "condition_notes": "<one short sentence on visible wear/damage, or 'good condition' if none visible>"
}

If a field doesn't clearly apply (e.g. sleeve_length for shoes), use "n/a". If the image does not clearly show a single clothing item, do your best guess but keep the same JSON shape. Return ONLY the JSON object.`;

// Helper: downscale image to keep cost/latency low
async function prepareImage(buffer) {
  return sharp(buffer)
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// Helper: call GPT-4o vision and parse JSON, with one retry on bad JSON
async function extractAttributes(base64Image, attempt = 1) {
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',   // was 'gpt-4o'
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    max_tokens: 300
  });

  const raw = response.choices[0].message.content.trim();

  try {
    // strip accidental markdown fences just in case
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    if (attempt === 1) {
      console.warn('Bad JSON from model, retrying once...');
      return extractAttributes(base64Image, 2);
    }
    throw new Error('Model did not return valid JSON after retry: ' + raw);
  }
}

// Main endpoint
app.post('/extract-attributes', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded. Send as form-data field "image".' });
    }

    const resizedBuffer = await prepareImage(req.file.buffer);
    const base64Image = resizedBuffer.toString('base64');

    const attributes = await extractAttributes(base64Image);

    res.json({ success: true, attributes });
  } catch (err) {
    console.error('Extraction error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to extract attributes. Please try again.' });
  }
});

const WARDROBE_CATEGORIES = new Set([
  'top',
  'bottom',
  'shoes',
  'outerwear',
  'accessory',
]);
const ENTRY_CONTEXTS = new Set(['home-avatar', 'similarity', 'saved-fit', 'comparison']);

function shortString(value, maxLength = 100) {
  return typeof value === 'string' && value.trim() && value.length <= maxLength ? value.trim() : undefined;
}

function stringList(value, maxItems = 8, maxLength = 40) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => shortString(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function sanitizeWardrobe(value) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = new Set();
  const items = [];
  for (const candidate of value) {
    const id = shortString(candidate?.id, 100);
    const name = shortString(candidate?.name, 100);
    const category = shortString(candidate?.category, 20);
    if (!id || !name || !WARDROBE_CATEGORIES.has(category) || ids.has(id)) return null;
    ids.add(id);
    const metadata = candidate?.metadata && typeof candidate.metadata === 'object' ? candidate.metadata : {};
    items.push({
      id,
      name,
      category,
      color: shortString(candidate?.color, 40),
      subcategory: shortString(metadata.subcategory, 60),
      styleTags: stringList(metadata.styleTags),
      pattern: shortString(metadata.pattern, 40),
      fit: shortString(metadata.fit, 40),
      formalityScore: Number.isFinite(metadata.formalityScore) ? Math.min(5, Math.max(1, Math.round(metadata.formalityScore))) : undefined,
      secondaryColors: stringList(metadata.secondaryColors),
      materialGuess: shortString(metadata.materialGuess, 60),
      seasons: stringList(metadata.seasons, 4),
      dominantHex: shortString(metadata.dominantHex, 10),
      wearCount: Number.isFinite(candidate?.wearCount) ? Math.max(0, Math.round(candidate.wearCount)) : 0,
      lastWornAt: shortString(candidate?.lastWornAt, 40),
    });
  }
  return items;
}

function sanitizeCandidate(value) {
  if (!value || typeof value !== 'object') return null;
  const category = shortString(value.category, 20);
  if (!category || !WARDROBE_CATEGORIES.has(category)) return null;
  return {
    category,
    subcategory: shortString(value.subcategory, 60),
    color: shortString(value.color, 40),
    secondaryColors: stringList(value.secondaryColors ?? value.secondary_colors),
    pattern: shortString(value.pattern, 40),
    styleTags: stringList(value.styleTags ?? value.style_tags),
    fit: shortString(value.fit, 40),
    materialGuess: shortString(value.materialGuess ?? value.material_guess, 60),
    formalityScore: Number.isFinite(value.formalityScore ?? value.formality_score) ? Math.min(5, Math.max(1, Math.round(value.formalityScore ?? value.formality_score))) : undefined,
    seasons: stringList(value.seasons ?? value.season, 4),
    dominantHex: shortString(value.dominantHex ?? value.dominant_hex, 10),
  };
}

const COMPARISON_LEVELS = new Set(['high', 'medium', 'low']);
const DECISION_TYPES = new Set(['rewear_existing', 'consider_if_needed', 'useful_gap', 'low_utility']);

function comparisonSchema() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'wardrobe_item_comparison',
      strict: true,
      schema: {
        type: 'object', additionalProperties: false, required: ['duplicateRisk', 'wardrobeUtility', 'decision'],
        properties: {
          duplicateRisk: { type: 'object', additionalProperties: false, required: ['level', 'closestItemId', 'reasons'], properties: { level: { type: 'string', enum: ['high', 'medium', 'low'] }, closestItemId: { type: ['string', 'null'] }, reasons: { type: 'array', maxItems: 3, items: { type: 'string' } } } },
          wardrobeUtility: { type: 'object', additionalProperties: false, required: ['level', 'compatibleItemIds', 'reasons', 'gapSummary'], properties: { level: { type: 'string', enum: ['high', 'medium', 'low'] }, compatibleItemIds: { type: 'array', maxItems: 8, items: { type: 'string' } }, reasons: { type: 'array', maxItems: 3, items: { type: 'string' } }, gapSummary: { type: 'string' } } },
          decision: { type: 'object', additionalProperties: false, required: ['type', 'summary'], properties: { type: { type: 'string', enum: ['rewear_existing', 'consider_if_needed', 'useful_gap', 'low_utility'] }, summary: { type: 'string' } } },
        },
      },
    },
  };
}

app.post('/compare-item', async (req, res) => {
  try {
    const candidate = sanitizeCandidate(req.body?.candidate);
    const wardrobe = sanitizeWardrobe(req.body?.wardrobe);
    if (!candidate || !wardrobe) return res.status(400).json({ success: false, error: 'Invalid comparison payload.' });
    if (!wardrobe.length) return res.json({ success: true, comparison: { duplicateRisk: { level: 'low', closestItemId: null, reasons: ['No owned items to compare yet'] }, wardrobeUtility: { level: 'low', compatibleItemIds: [], reasons: ['Add wardrobe pieces to assess styling potential'], gapSummary: 'There is not enough wardrobe context to assess utility yet.' }, decision: { type: 'consider_if_needed', summary: 'Build out your wardrobe record before relying on this check.' } } });
    const prompt = {
      task: 'Compare one candidate garment with the supplied active wardrobe. Separately assess duplicate risk and wardrobe utility.',
      rules: [
        'Use only supplied wardrobe IDs. Never invent items, metadata, wear history, prices, purchases, or sustainability claims.',
        'Duplicate risk depends primarily on garment type/subcategory, then color, pattern, fit, style, material, and formality. Broad category alone is weak evidence.',
        'Different broad categories cannot be medium or high duplicates. Shared color alone never makes items duplicates.',
        'Understand common aliases such as tee/t-shirt, pants/trousers, trainers/sneakers, button-up/button-down, gray/grey, and navy/dark blue.',
        'Utility means realistic outfit compatibility. Favor complementary categories that can be worn with the candidate; do not count same-category pieces merely because they exist.',
        'Keep reasons concise, consumer-facing, and strictly supported by supplied data.',
      ],
      candidate,
      wardrobe,
    };
    const response = await getOpenAIClient().chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'system', content: 'You are a careful wardrobe comparison assistant. Follow the schema and supplied-ID constraints exactly.' }, { role: 'user', content: JSON.stringify(prompt) }], response_format: comparisonSchema(), max_tokens: 700 });
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    const wardrobeById = new Map(wardrobe.map(item => [item.id, item]));
    let closestItemId = wardrobeById.has(parsed.duplicateRisk?.closestItemId) ? parsed.duplicateRisk.closestItemId : null;
    let duplicateLevel = COMPARISON_LEVELS.has(parsed.duplicateRisk?.level) ? parsed.duplicateRisk.level : 'low';
    if (closestItemId && wardrobeById.get(closestItemId).category !== candidate.category) { closestItemId = null; duplicateLevel = 'low'; }
    const compatibleItemIds = stringList(parsed.wardrobeUtility?.compatibleItemIds, 8, 100).filter(id => wardrobeById.has(id) && wardrobeById.get(id).category !== candidate.category);
    const utilityLevel = COMPARISON_LEVELS.has(parsed.wardrobeUtility?.level) ? parsed.wardrobeUtility.level : 'low';
    const decisionType = DECISION_TYPES.has(parsed.decision?.type) ? parsed.decision.type : 'consider_if_needed';
    res.json({ success: true, comparison: { duplicateRisk: { level: duplicateLevel, closestItemId, reasons: stringList(parsed.duplicateRisk?.reasons, 3, 100) }, wardrobeUtility: { level: utilityLevel, compatibleItemIds, reasons: stringList(parsed.wardrobeUtility?.reasons, 3, 140), gapSummary: shortString(parsed.wardrobeUtility?.gapSummary, 300) || 'Consider how this works with pieces you already own.' }, decision: { type: decisionType, summary: shortString(parsed.decision?.summary, 300) || 'Consider whether this fills a real wardrobe need.' } } });
  } catch (err) {
    console.error('Comparison error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to compare this item. Please try again.' });
  }
});

function sanitizePreferenceSignals(value) {
  const signals = value && typeof value === 'object' ? value : {};
  return {
    colors: stringList(signals.colors),
    styleTags: stringList(signals.styleTags),
    fits: stringList(signals.fits),
    categoryCombinations: stringList(signals.categoryCombinations),
    averageFormality: Number.isFinite(signals.averageFormality) ? Math.min(5, Math.max(1, Math.round(signals.averageFormality))) : undefined,
  };
}

function recommendationSchema(count) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'wardrobe_outfit_recommendations',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['outfits'],
        properties: {
          outfits: {
            type: 'array',
            minItems: 1,
            maxItems: count,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'itemIds', 'name', 'rationale', 'styleTags'],
              properties: {
                id: { type: 'string' },
                itemIds: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
                name: { type: 'string' },
                rationale: { type: 'string' },
                styleTags: { type: 'array', maxItems: 5, items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  };
}

app.post('/recommend-outfits', async (req, res) => {
  try {
    const wardrobe = sanitizeWardrobe(req.body?.wardrobe);
    if (!wardrobe) return res.status(400).json({ success: false, error: 'Invalid wardrobe payload.' });
    if (!wardrobe.length) return res.json({ success: true, outfits: [] });

    const count = Number.isInteger(req.body?.count) ? Math.min(5, Math.max(1, req.body.count)) : 3;
    const entryContext = ENTRY_CONTEXTS.has(req.body?.entryContext) ? req.body.entryContext : 'home-avatar';
    const requiredItemId = shortString(req.body?.requiredItemId, 100);
    const wardrobeIds = new Set(wardrobe.map(item => item.id));
    const requiredCategories = ['top', 'bottom', 'shoes'].filter(category => wardrobe.some(item => item.category === category));
    if (requiredItemId && !wardrobeIds.has(requiredItemId)) return res.status(400).json({ success: false, error: 'requiredItemId is not in the supplied wardrobe.' });

    const excluded = Array.isArray(req.body?.excludeItemCombinations)
      ? req.body.excludeItemCombinations.slice(0, 20).map(ids => stringList(ids, 5, 100).sort()).filter(ids => ids.length)
      : [];
    const preferenceSignals = sanitizePreferenceSignals(req.body?.preferenceSignals);
    const prompt = {
      task: 'Recommend distinct outfits made only from the supplied wardrobe item IDs.',
      rules: [
        'Never invent an item ID.',
        `Every outfit must include one item from each available core category: ${requiredCategories.join(', ')}.`,
        'Partial outfits are valid only when a core category is absent from the supplied wardrobe.',
        'Avoid excluded combinations.',
        requiredItemId ? `Every outfit must include item ID ${requiredItemId}.` : 'No item is mandatory.',
      ],
      entryContext,
      desiredCount: count,
      wardrobe,
      preferenceSignals,
      excludedItemCombinations: excluded,
    };

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a wardrobe stylist. Follow the JSON schema exactly and use only supplied wardrobe IDs.' },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
      response_format: recommendationSchema(count),
      max_tokens: 900,
    });
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    if (!Array.isArray(parsed.outfits)) throw new Error('Model returned an invalid recommendation shape.');

    const seen = new Set();
    const outfits = parsed.outfits.flatMap((outfit, index) => {
      if (!Array.isArray(outfit.itemIds) || !outfit.itemIds.length || outfit.itemIds.some(id => !wardrobeIds.has(id))) return [];
      const itemIds = [...new Set(outfit.itemIds)];
      if (requiredItemId && !itemIds.includes(requiredItemId)) return [];
      const itemCategories = new Set(itemIds.map(id => wardrobe.find(item => item.id === id)?.category));
      if (requiredCategories.some(category => !itemCategories.has(category))) return [];
      const key = [...itemIds].sort().join('|');
      if (seen.has(key) || excluded.some(ids => ids.join('|') === key)) return [];
      seen.add(key);
      return [{
        id: shortString(outfit.id, 100) || `ai-outfit-${index + 1}`,
        itemIds,
        name: shortString(outfit.name, 100) || `Wardrobe outfit ${index + 1}`,
        rationale: shortString(outfit.rationale, 300) || 'Styled from items already in your wardrobe.',
        styleTags: stringList(outfit.styleTags, 5),
      }];
    });
    if (!outfits.length) return res.status(502).json({ success: false, error: 'AI returned no valid wardrobe-only recommendations.' });
    res.json({ success: true, outfits });
  } catch (err) {
    console.error('Recommendation error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to recommend outfits. Please try again.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

