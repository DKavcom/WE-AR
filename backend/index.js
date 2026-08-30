require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EXTRACTION_PROMPT = `You are a clothing attribute extractor for a wardrobe app.
Look at the clothing item in the image and return ONLY a JSON object, with no markdown formatting, no backticks, and no extra text before or after it.

The JSON must have exactly this shape:
{
  "category": "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessory",
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
  const response = await openai.chat.completions.create({
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));