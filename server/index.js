require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BODY_FAT_PROMPT = (userProfile) => `
You are a body composition expert trained on thousands of DEXA scan images correlated with visual body photos.

You have been provided TWO images: a front-facing photo and a back-facing photo of the same person.

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
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: frontBase64 },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: backBase64 },
            },
            {
              type: 'text',
              text: BODY_FAT_PROMPT(userProfile),
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`BodyComp AI server running on port ${PORT}`);
});
