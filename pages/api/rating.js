// pages/api/rating.js
// CyberHome SimpleChat V9 rating endpoint

function sanitizeText(value, max = 5000) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientIP = getClientIP(req);
    const {
      sessionId = "",
      rating = 0,
      feedback = "",
      source = "simple_chat_v9",
      pageUrl = "",
      submittedAt = new Date().toISOString(),
      transcript = [],
    } = req.body || {};

    const safeSessionId = sanitizeText(sessionId, 200);
    const safeFeedback = sanitizeText(feedback, 3000);
    const safeSource = sanitizeText(source, 200);
    const safePageUrl = sanitizeText(pageUrl, 2000);
    const safeSubmittedAt = sanitizeText(submittedAt, 100);
    const numericRating = Math.max(1, Math.min(5, Number(rating || 0)));

    if (!numericRating) {
      return res.status(400).json({ ok: false, error: "Invalid rating" });
    }

    const safeTranscript = Array.isArray(transcript) ? transcript.slice(-20) : [];

    const payload = {
      sessionId: safeSessionId,
      rating: numericRating,
      feedback: safeFeedback,
      source: safeSource,
      pageUrl: safePageUrl,
      submittedAt: safeSubmittedAt,
      clientIP,
      transcriptCount: safeTranscript.length,
      transcript: safeTranscript,
    };

    console.log("=== CyberHome Rating Captured V9 ===");
    console.log(JSON.stringify(payload, null, 2));

    return res.status(200).json({ ok: true, saved: true, sessionId: safeSessionId });
  } catch (error) {
    console.error("Rating API error:", error);
    return res.status(500).json({ ok: false, error: "Rating submission failed" });
  }
}
