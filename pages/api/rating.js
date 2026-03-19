// pages/api/rating.js
// CyberHome SimpleChat V9.4 rating endpoint with JSONL logging

import { safeAppendJsonLine } from "./_lib/chatLogger";

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
      safeAppendJsonLine("rating_errors.jsonl", {
        kind: "rating_error",
        reason: "invalid_rating",
        sessionId: safeSessionId,
        source: safeSource,
        clientIP,
      });

      return res.status(400).json({ ok: false, error: "Invalid rating" });
    }

    const safeTranscript = Array.isArray(transcript) ? transcript.slice(-80) : [];

    const payload = {
      kind: "rating",
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

    console.log("=== CyberHome Rating Captured V9.4 ===");
    console.log(JSON.stringify(payload, null, 2));

    safeAppendJsonLine("ratings.jsonl", payload);

    return res.status(200).json({ ok: true, saved: true, sessionId: safeSessionId });
  } catch (error) {
    console.error("Rating API error:", error);

    safeAppendJsonLine("rating_errors.jsonl", {
      kind: "rating_error",
      reason: "exception",
      message: error?.message || "Rating submission failed",
    });

    return res.status(500).json({ ok: false, error: "Rating submission failed" });
  }
}
