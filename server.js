require('dotenv').config();

const path = require('path');
const express = require('express');
const OpenAIModule = require('openai');
const OpenAI = OpenAIModule.default || OpenAIModule;

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const MAX_IMAGES_PER_REQUEST = Math.min(Number(process.env.MAX_IMAGES_PER_REQUEST || 4), 10);
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = Number(process.env.MAX_REQUESTS_PER_WINDOW || 10);
const requestLog = new Map();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    maxImagesPerRequest: MAX_IMAGES_PER_REQUEST
  });
});

app.post('/api/generate-image', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'OPENAI_API_KEY is missing',
        message: 'Add your OpenAI API key to .env, then restart the server.'
      });
    }

    const limited = checkRateLimit(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    if (limited) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please wait a little before generating more images.'
      });
    }

    const payload = validatePayload(req.body);
    const finalPrompt = buildFinalPrompt(payload);

    const result = await openai.images.generate({
      model: MODEL,
      prompt: finalPrompt,
      n: payload.count,
      size: mapImageSize(payload.ratio),
      quality: mapQuality(payload.quality),
      output_format: 'png'
    });

    const images = (result.data || [])
      .map((item, index) => item.b64_json ? ({
        src: `data:image/png;base64,${item.b64_json}`,
        filename: `pixelforge-ai-${Date.now()}-${index + 1}.png`,
        label: `${payload.style} #${index + 1}`
      }) : null)
      .filter(Boolean);

    if (!images.length) {
      return res.status(502).json({
        error: 'No image returned',
        message: 'The image API completed but did not return image data.'
      });
    }

    res.json({
      ok: true,
      model: MODEL,
      count: images.length,
      images
    });
  } catch (error) {
    const status = error.status || (error.code === 'insufficient_quota' ? 402 : 500);
    console.error('Image generation error:', error);
    res.status(status).json({
      error: 'Image generation failed',
      message: cleanErrorMessage(error)
    });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PixelForge AI running at http://localhost:${PORT}`);
  console.log(`Image model: ${MODEL}`);
  console.log(`API key configured: ${Boolean(process.env.OPENAI_API_KEY)}`);
});

function validatePayload(body) {
  const prompt = String(body.prompt || '').trim();
  if (prompt.length < 3) throw makeBadRequest('Prompt is too short.');
  if (prompt.length > 1800) throw makeBadRequest('Prompt is too long. Keep it under 1800 characters.');

  const style = safeChoice(body.style, [
    'Cinematic Realistic', 'Anime Art', '3D Render', 'Cyberpunk',
    'Logo Concept', 'Poster Design', 'Product Mockup', 'Fantasy Art'
  ], 'Cinematic Realistic');

  const ratio = safeChoice(body.ratio, ['square', 'portrait', 'landscape'], 'square');
  const quality = safeChoice(body.quality, ['Standard', 'HD', 'Ultra 4K'], 'Standard');
  const negativePrompt = String(body.negativePrompt || '').trim().slice(0, 400);
  const requestedCount = Number(body.count || 1);
  const count = Math.max(1, Math.min(MAX_IMAGES_PER_REQUEST, Number.isFinite(requestedCount) ? requestedCount : 1));

  return { prompt, style, ratio, quality, negativePrompt, count };
}

function buildFinalPrompt({ prompt, style, ratio, quality, negativePrompt }) {
  const styleLine = `Style: ${style}. Quality target: ${quality}. Aspect ratio: ${ratio}.`;
  const productionLine = 'Create a polished, professional, high-detail image with clean composition, strong lighting, no watermark, and no unreadable random text unless the user specifically asks for text.';
  const negativeLine = negativePrompt ? `Avoid: ${negativePrompt}.` : '';
  return [prompt, styleLine, productionLine, negativeLine].filter(Boolean).join('\n');
}

function mapImageSize(ratio) {
  if (ratio === 'portrait') return '1024x1536';
  if (ratio === 'landscape') return '1536x1024';
  return '1024x1024';
}

function mapQuality(quality) {
  if (quality === 'Ultra 4K') return 'high';
  if (quality === 'HD') return 'medium';
  return 'low';
}

function safeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function makeBadRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function cleanErrorMessage(error) {
  if (error.status === 400) return error.message;
  if (error.status === 401) return 'Invalid API key. Check OPENAI_API_KEY in your .env file.';
  if (error.status === 403) return 'Your OpenAI organization may need image model access or verification.';
  if (error.status === 429) return 'Rate limit reached. Try again later or reduce image count/quality.';
  if (error.code === 'insufficient_quota') return 'Your API account has no available quota or billing is not active.';
  return error.message || 'Unexpected server error.';
}
