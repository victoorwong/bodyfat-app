require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const sharp = require('sharp');
const { removeBackgroundFromImageBase64 } = require('remove.bg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const REMOVE_BG_KEY = process.env.REMOVE_BG_API_KEY;

/**
 * Normalize exposure/lighting using Sharp:
 * 1. Normalize histogram (auto-levels — stretches darkest to 0, brightest to 255)
 * 2. Slightly boost clarity via mild sharpening
 * 3. Re-encode as JPEG
 */
async function normalizeExposure(base64) {
  const inputBuffer = Buffer.from(base64, 'base64');
  const outputBuffer = await sharp(inputBuffer)
    .normalize()           // auto-levels: fixes under/overexposed images
    .modulate({ brightness: 1.05, saturation: 0.95 }) // slight brightness lift, desaturate slightly for consistency
    .jpeg({ quality: 92 })
    .toBuffer();
  return outputBuffer.toString('base64');
}

/**
 * Remove background via remove.bg API.
 * Returns base64 JPEG with a neutral grey background composited in place of transparency.
 * Falls through silently if REMOVE_BG_API_KEY is not set.
 */
async function removeBackground(base64) {
  if (!REMOVE_BG_KEY) return base64; // skip if no key configured

  try {
    const result = await removeBackgroundFromImageBase64({
      base64img: base64,
      apiKey: REMOVE_BG_KEY,
      size: 'regular',
      type: 'person',
    });

    // result.base64img is a PNG with transparency — composite onto neutral grey
    const pngBuffer = Buffer.from(result.base64img, 'base64');
    const outputBuffer = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 180, g: 180, b: 180 } },
    })
      .composite([{ input: pngBuffer, blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    return outputBuffer.toString('base64');
  } catch (err) {
    console.warn('Background removal failed, using original:', err.message);
    return base64; // fall through gracefully
  }
}

/**
 * Full preprocessing pipeline:
 * 1. Normalize exposure
 * 2. Remove background (if API key present)
 */
async function preprocessImage(base64) {
  let processed = await normalizeExposure(base64);
  processed = await removeBackground(processed);
  return processed;
}

const BODY_FAT_PROMPT = (userProfile, bgRemovalActive) => `
You are a body composition expert trained on thousands of DEXA scan images correlated with visual body photos.

You have been provided TWO images: a front-facing photo and a back-facing photo of the same person.
${bgRemovalActive ? 'The background has been removed from both images — focus entirely on the body.' : ''}
Images have been exposure-normalized for consistent lighting analysis.

FIRST — check both images for a clearly visible human body. If either image does not contain a human body (e.g. it's an object, animal, or the person is not visible), respond with:
{
  "humanDetected": false,
  "error": "No human body detected. Please take a clear full-body photo."
}

If a human body IS detected in both images, perform the analysis and respond with:
{
  "humanDetected": true,
  "bodyFat": <single number with 2 decimal places, e.g. 18.47>,
  "category": "<Essential Fat | Athletes | Fitness | Average | Obese>",
  "visualIndicators": ["<indicator 1>", "<indicator 2>", "..."],
  "healthContext": "<2-3 sentence health context paragraph>",
  "confidence": "<low | medium | high>",
  "recommendations": ["<rec 1>", "<rec 2>", "..."]
}

User metadata for calibration:
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg
- Age: ${userProfile.age}
- Biological sex: ${userProfile.sex}

Use BOTH the front and back photos to assess:
- Muscle definition and vascularity (front and back)
- Fat distribution patterns — waist, abdomen, hips, glutes, limbs
- Skin fold appearance from both angles
- Overall body shape and proportions

The bodyFat value must be a precise single number (e.g. 18.47), not a range.

Body fat category reference ranges (male / female):
- Essential Fat: 2–5% / 10–13%
- Athletes: 6–13% / 14–20%
- Fitness: 14–17% / 21–24%
- Average: 18–24% / 25–31%
- Obese: 25%+ / 32%+

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.
`.trim();

app.post('/api/analyze', async (req, res) => {
  const { frontBase64, backBase64, userProfile } = req.body;

  if (!frontBase64 || !backBase64 || !userProfile) {
    return res.status(400).json({ message: 'frontBase64, backBase64, and userProfile are required.' });
  }

  try {
    console.log('Preprocessing images...');
    const [processedFront, processedBack] = await Promise.all([
      preprocessImage(frontBase64),
      preprocessImage(backBase64),
    ]);
    console.log('Preprocessing done. Sending to Claude...');

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: processedFront },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: processedBack },
            },
            {
              type: 'text',
              text: BODY_FAT_PROMPT(userProfile, !!REMOVE_BG_KEY),
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ message: 'Model returned an unexpected response format.' });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.humanDetected) {
      return res.status(422).json({ message: result.error ?? 'No human body detected in the photos.' });
    }

    return res.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ message });
  }
});

const COMPARISON_PROMPT = (before, after) => `
You are a body composition expert. You are comparing two photos of the same person taken at different points in time.

The FIRST two images are the BEFORE photos (front and back).
The LAST two images are the AFTER photos (front and back).

Known measurements:
BEFORE — Body Fat: ${before.bodyFat}%, Category: ${before.category}, Weight: ${before.weight}kg
AFTER  — Body Fat: ${after.bodyFat}%, Category: ${after.category}, Weight: ${after.weight}kg

Analyze the visible changes in body composition between the before and after photos. Respond ONLY with valid JSON:

{
  "summary": "<2-3 sentence overall summary of the transformation>",
  "metrics": [
    {
      "label": "Body Fat %",
      "before": "${before.bodyFat}%",
      "after": "${after.bodyFat}%",
      "change": "<e.g. -2.3% or +1.5%>",
      "improved": <true if body fat decreased>
    },
    {
      "label": "Lean Mass (est.)",
      "before": "<estimated kg based on weight and body fat>",
      "after": "<estimated kg>",
      "change": "<e.g. +1.2 kg or -0.5 kg>",
      "improved": <true if lean mass increased>
    },
    {
      "label": "Fat Mass (est.)",
      "before": "<estimated kg>",
      "after": "<estimated kg>",
      "change": "<e.g. -2.1 kg>",
      "improved": <true if fat mass decreased>
    },
    {
      "label": "Muscle Definition",
      "before": "<visual description e.g. 'Minimal'>",
      "after": "<visual description e.g. 'Moderate'>",
      "change": "<e.g. 'Improved' or 'Decreased'>",
      "improved": <true or false>
    },
    {
      "label": "Vascularity",
      "before": "<e.g. 'Not visible'>",
      "after": "<e.g. 'Slightly visible'>",
      "change": "<description>",
      "improved": <true or false>
    },
    {
      "label": "Waist Appearance",
      "before": "<e.g. 'Soft'>",
      "after": "<e.g. 'More defined'>",
      "change": "<description>",
      "improved": <true or false>
    }
  ],
  "observations": [
    "<specific visual observation 1>",
    "<specific visual observation 2>",
    "<specific visual observation 3>"
  ]
}

Base the lean mass and fat mass estimates on the known weights and body fat percentages. Use both front and back photos for the visual assessments.
`.trim();

app.post('/api/compare', async (req, res) => {
  const { beforeFrontBase64, beforeBackBase64, afterFrontBase64, afterBackBase64, beforeResult, afterResult, userProfile } = req.body;

  if (!beforeFrontBase64 || !afterFrontBase64 || !beforeResult || !afterResult) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const content = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: beforeFrontBase64 } },
    ];
    if (beforeBackBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: beforeBackBase64 } });
    }
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: afterFrontBase64 } });
    if (afterBackBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: afterBackBase64 } });
    }
    content.push({
      type: 'text',
      text: COMPARISON_PROMPT(
        { bodyFat: beforeResult.bodyFat, category: beforeResult.category, weight: userProfile?.weight ?? '?' },
        { bodyFat: afterResult.bodyFat, category: afterResult.category, weight: userProfile?.weight ?? '?' }
      ),
    });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ message: 'Unexpected response format.' });

    return res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Comparison error:', err);
    return res.status(500).json({ message: err instanceof Error ? err.message : 'Internal server error' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`NattyAI server running on port ${PORT}`);
  console.log(`Background removal: ${REMOVE_BG_KEY ? 'ENABLED' : 'DISABLED (add REMOVE_BG_API_KEY to .env to enable)'}`);
});
