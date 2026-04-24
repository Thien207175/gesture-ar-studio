// ============================================================================
// api/stylize.js — Vercel Serverless Function
// Nhận 1 ảnh base64 + tên phong cách → gọi Replicate → trả URL ảnh đã stylize
// ============================================================================

// Giới hạn kích thước body cho Vercel (ảnh base64 có thể to)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
    maxDuration: 60,
};

// Các phong cách hỗ trợ — key sẽ được map sang prompt
const STYLE_PROMPTS = {
    'van-gogh':    'oil painting in the style of Vincent van Gogh, swirling thick brushstrokes, vibrant yellow blue and orange, post-impressionist masterpiece',
    'anime':       'anime illustration, Studio Ghibli style, soft warm lighting, detailed background, cinematic composition',
    'cyberpunk':   'cyberpunk aesthetic, neon pink and cyan lights, blade runner atmosphere, rain reflections, futuristic city',
    'watercolor':  'soft watercolor painting, delicate wet washes, loose brushwork, paper texture visible',
    'oil':         'classical oil painting, Renaissance masters, rich chiaroscuro, detailed texture',
    'sketch':      'pencil sketch, hand-drawn line art, detailed cross-hatching, monochrome',
    'pixel-art':   '16-bit pixel art, retro video game style, limited color palette, clean pixels',
    'ink-wash':    'Chinese ink wash painting, sumi-e style, minimal brush strokes, negative space',
};

// Model SDXL img2img trên Replicate — version hash có thể thay đổi theo thời gian
// Xem model mới nhất: https://replicate.com/stability-ai/sdxl
const REPLICATE_MODEL_VERSION = '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc';

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { imageBase64, style = 'van-gogh', strength = 0.55 } = req.body || {};

    // ---- Validate input ----
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid imageBase64 (must be data URL or base64 string)' });
    }
    if (!STYLE_PROMPTS[style]) {
        return res.status(400).json({
            error: `Unknown style "${style}"`,
            availableStyles: Object.keys(STYLE_PROMPTS),
        });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
        return res.status(500).json({
            error: 'Server not configured: REPLICATE_API_TOKEN missing. Add it in Vercel dashboard → Settings → Environment Variables.',
        });
    }

    const prompt = STYLE_PROMPTS[style];

    try {
        // ---- Bước 1: Tạo prediction ----
        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                version: REPLICATE_MODEL_VERSION,
                input: {
                    image:               imageBase64,
                    prompt:              prompt,
                    negative_prompt:     'blurry, low quality, distorted, ugly, watermark',
                    prompt_strength:     clamp(strength, 0.3, 0.85),
                    num_inference_steps: 25,
                    guidance_scale:      7.5,
                    scheduler:           'K_EULER',
                    refine:              'expert_ensemble_refiner',
                    high_noise_frac:     0.8,
                },
            }),
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            console.error('Replicate create error:', errText);
            return res.status(502).json({ error: `Replicate API error: ${errText.slice(0, 200)}` });
        }

        const prediction = await createRes.json();
        const pollUrl = prediction.urls?.get;

        if (!pollUrl) {
            return res.status(502).json({ error: 'No poll URL returned from Replicate' });
        }

        // ---- Bước 2: Poll kết quả (tối đa ~50 giây) ----
        let result = prediction;
        const maxAttempts = 25;
        const pollInterval = 2000;

        for (let i = 0; i < maxAttempts; i++) {
            if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
                break;
            }

            await sleep(pollInterval);

            const pollRes = await fetch(pollUrl, {
                headers: { 'Authorization': `Token ${token}` },
            });

            if (!pollRes.ok) {
                console.warn('Poll attempt failed:', pollRes.status);
                continue;
            }

            result = await pollRes.json();
        }

        if (result.status !== 'succeeded') {
            return res.status(504).json({
                error: result.error || `Generation ${result.status} or timed out`,
                status: result.status,
            });
        }

        // output có thể là string hoặc array URL
        const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

        return res.status(200).json({
            ok:            true,
            imageUrl,
            style,
            predictionId:  prediction.id,
            processingMs:  result.metrics?.predict_time ? Math.round(result.metrics.predict_time * 1000) : null,
        });

    } catch (err) {
        console.error('Stylize handler exception:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}

// ---- helpers ----
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || min)); }
