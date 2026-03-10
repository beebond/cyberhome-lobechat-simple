// pages/api/lead.js

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

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

function formatTranscript(transcript = []) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return "No transcript available.";
  }

  return transcript
    .map((item, index) => {
      const role = item?.role || "unknown";
      const content = sanitizeText(item?.content || "", 4000);
      const createdAt = item?.createdAt || "";
      const products = Array.isArray(item?.products)
        ? item.products
            .map((p) => p?.title || p?.model || p?.handle || "")
            .filter(Boolean)
            .join(", ")
        : "";

      return [
        `#${index + 1}`,
        `Role: ${role}`,
        createdAt ? `Time: ${createdAt}` : "",
        content ? `Content: ${content}` : "",
        products ? `Products: ${products}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n----------------------\n\n");
}

function extractTokenUsage(transcript = []) {
  let totalInput = 0;
  let totalOutput = 0;
  let totalAll = 0;

  for (const item of transcript) {
    const meta = item?.meta || {};
    totalInput += Number(meta.inputTokens || 0);
    totalOutput += Number(meta.outputTokens || 0);
    totalAll += Number(meta.totalTokens || 0);
  }

  return {
    inputTokens: totalInput,
    outputTokens: totalOutput,
    totalTokens: totalAll,
  };
}

async function sendViaResend({
  to,
  from,
  subject,
  html,
  text,
  apiKey,
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Resend API error: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientIP = getClientIP(req);

    const {
      sessionId = "",
      name = "",
      email = "",
      note = "",
      transcript = [],
      source = "simple_chat_v5",
      submittedAt = new Date().toISOString(),
    } = req.body || {};

    const safeSessionId = sanitizeText(sessionId, 200);
    const safeName = sanitizeText(name, 200);
    const safeEmail = normalizeEmail(email);
    const safeNote = sanitizeText(note, 3000);
    const safeSource = sanitizeText(source, 200);
    const safeSubmittedAt = sanitizeText(submittedAt, 100);

    if (!safeEmail || !isValidEmail(safeEmail)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid email address",
      });
    }

    const safeTranscript = Array.isArray(transcript) ? transcript.slice(-50) : [];
    const transcriptText = formatTranscript(safeTranscript);
    const tokenUsage = extractTokenUsage(safeTranscript);

    const payload = {
      sessionId: safeSessionId,
      name: safeName,
      email: safeEmail,
      note: safeNote,
      source: safeSource,
      submittedAt: safeSubmittedAt,
      clientIP,
      tokenUsage,
      transcriptCount: safeTranscript.length,
      transcript: safeTranscript,
    };

    console.log("=== CyberHome Lead Captured ===");
    console.log(JSON.stringify(payload, null, 2));

    const resendApiKey = process.env.RESEND_API_KEY || "";
    const leadToEmail =
      process.env.LEAD_TO_EMAIL || process.env.CONTACT_TO_EMAIL || "";
    const resendFrom =
      process.env.RESEND_FROM_EMAIL || "CyberHome AI <onboarding@resend.dev>";

    let emailSent = false;
    let resendResult = null;

    if (resendApiKey && leadToEmail) {
      const subject = `New Shopify AI Lead - ${safeEmail}`;

      const html = `
        <h2>New Shopify AI Lead</h2>
        <p><strong>Name:</strong> ${escapeHtml(safeName || "(empty)")}</p>
        <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
        <p><strong>Session ID:</strong> ${escapeHtml(safeSessionId || "(empty)")}</p>
        <p><strong>Source:</strong> ${escapeHtml(safeSource)}</p>
        <p><strong>Submitted At:</strong> ${escapeHtml(safeSubmittedAt)}</p>
        <p><strong>Client IP:</strong> ${escapeHtml(clientIP)}</p>
        <p><strong>Input Tokens:</strong> ${tokenUsage.inputTokens}</p>
        <p><strong>Output Tokens:</strong> ${tokenUsage.outputTokens}</p>
        <p><strong>Total Tokens:</strong> ${tokenUsage.totalTokens}</p>
        <hr />
        <p><strong>Note:</strong></p>
        <pre>${escapeHtml(safeNote || "(empty)")}</pre>
        <hr />
        <p><strong>Transcript:</strong></p>
        <pre>${escapeHtml(transcriptText)}</pre>
      `;

      const text = [
        "New Shopify AI Lead",
        `Name: ${safeName || "(empty)"}`,
        `Email: ${safeEmail}`,
        `Session ID: ${safeSessionId || "(empty)"}`,
        `Source: ${safeSource}`,
        `Submitted At: ${safeSubmittedAt}`,
        `Client IP: ${clientIP}`,
        `Input Tokens: ${tokenUsage.inputTokens}`,
        `Output Tokens: ${tokenUsage.outputTokens}`,
        `Total Tokens: ${tokenUsage.totalTokens}`,
        "",
        "Note:",
        safeNote || "(empty)",
        "",
        "Transcript:",
        transcriptText,
      ].join("\n");

      resendResult = await sendViaResend({
        to: leadToEmail,
        from: resendFrom,
        subject,
        html,
        text,
        apiKey: resendApiKey,
      });

      emailSent = true;
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      emailSent,
      sessionId: safeSessionId,
      resendId: resendResult?.id || null,
    });
  } catch (error) {
    console.error("Lead API error:", error);

    return res.status(500).json({
      ok: false,
      error: "Lead submission failed",
    });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}