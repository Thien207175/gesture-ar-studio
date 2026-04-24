// ============================================================================
// api/health.js — Health check endpoint
// Kiểm tra server đang chạy + env variables đã config đúng chưa
// ============================================================================

export default function handler(req, res) {
    return res.status(200).json({
        ok:        true,
        timestamp: new Date().toISOString(),
        region:    process.env.VERCEL_REGION || 'local',
        env: {
            hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
            nodeVersion:       process.version,
        },
    });
}
