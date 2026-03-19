// pages/api/lead.js
// CyberHome SimpleChat V9.4 lead endpoint with JSONL logging

import { safeAppendJsonLine } from "./_lib/chatLogger";

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function sanitizeAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .slice(0, 10)
    .map((item) => ({
      id: sanitizeText(item?.id, 200),
      name: sanitizeText(item?.name, 300),
      url: sanitizeText(item?.url, 2000),
      mimeType: sanitizeText(item?.mimeType, 200),
      size: Number(item?.size || 0),
    }))
    .filter((item) => item.name || item.url);
}

function formatTranscript(transcript = []) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return "No transcript available.";
  }

  return transcript
    .map((item, index) => {
      const role = item?.role || "unknown";
      const content = sanitizeText(item?.content || item?.text || "", 4000);
      const createdAt = item?.createdAt || "";
      const products = Array.isArray(item?.products)
        ? item.products
            .map((p) => p?.title || p?.model || p?.handle || "")
            .filter(Boolean)
            .join(", ")
        : "";
      const attachments = Array.isArray(item?.attachments)
        ? item.attachments
            .map((a) => a?.name || a?.url || "")
            .filter(Boolean)
            .join(", ")
        : "";

      return [
        `#${index + 1}`,
        `Role: ${role}`,
        createdAt ? `Time: ${createdAt}` : "",
        content ? `Content: ${content}` : "",
        products ? `Products: ${products}` : "",
        attachments ? `Attachments: ${attachments}` : "",
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

async function sendViaResend({ to, from, subject, html, text, apiKey, attachments = [] }) {
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
      attachments,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function convertAttachmentsForResend(attachments = []) {
  return [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIP = getClientIP(req);

  try {
    const {
      sessionId = "",
      email = "",
      note = "",
      transcript = [],
      attachments = [],
      source = "simple_chat_v9",
      fallbackReason = "",
      pageUrl = "",
      submittedAt = new Date().toISOString(),
    } = req.body || {};

    const safeSessionId = sanitizeText(sessionId, 200);
    const safeEmail = normalizeEmail(email);
    const safeNote = sanitizeText(note, 3000);
    const safeSource = sanitizeText(source, 200);
    const safeFallbackReason = sanitizeText(fallbackReason, 200);
    const safePageUrl = sanitizeText(pageUrl, 2000);
    const safeSubmittedAt = sanitizeText(submittedAt, 100);

    if (!safeEmail || !isValidEmail(safeEmail)) {
      safeAppendJsonLine("lead_errors.jsonl", {
        kind: "lead_error",
        reason: "invalid_email",
        clientIP,
        sessionId: safeSessionId,
        email: safeEmail,
        source: safeSource,
        pageUrl: safePageUrl,
      });

      return res.status(400).json({ ok: false, error: "Invalid email address" });
    }

    const safeTranscript = Array.isArray(transcript) ? transcript.slice(-80) : [];
    const transcriptText = formatTranscript(safeTranscript);
    const tokenUsage = extractTokenUsage(safeTranscript);
    const safeAttachments = sanitizeAttachments(attachments);

    const payload = {
      sessionId: safeSessionId,
      email: safeEmail,
      note: safeNote,
      source: safeSource,
      fallbackReason: safeFallbackReason,
      pageUrl: safePageUrl,
      submittedAt: safeSubmittedAt,
      clientIP,
      tokenUsage,
      transcriptCount: safeTranscript.length,
      attachmentCount: safeAttachments.length,
      attachments: safeAttachments,
      transcript: safeTranscript,
    };

    console.log("=== CyberHome Lead Captured V9.4 ===");
    console.log(JSON.stringify(payload, null, 2));

    const resendApiKey = process.env.RESEND_API_KEY || "";
    const leadToEmail = process.env.LEAD_TO_EMAIL || process.env.CONTACT_TO_EMAIL || "";
    const resendFrom = process.env.RESEND_FROM_EMAIL || "CyberHome AI <onboarding@resend.dev>";

    let emailSent = false;
    let resendResult = null;
    let emailError = "";

    if (resendApiKey && leadToEmail) {
      const subject = `New CyberHome AI Lead - ${safeEmail}`;

      const attachmentListHtml = safeAttachments.length
        ? `<ul>${safeAttachments
            .map(
              (a) =>
                `<li><strong>${escapeHtml(a.name || "Attachment")}</strong>${
                  a.mimeType ? ` (${escapeHtml(a.mimeType)})` : ""
                }${a.url ? ` - <a href="${escapeHtml(a.url)}">Open file</a>` : ""}</li>`
            )
            .join("")}</ul>`
        : "<p>(No attachments)</p>";

      const attachmentListText = safeAttachments.length
        ? safeAttachments
            .map((a) => `- ${a.name || "Attachment"}${a.mimeType ? ` (${a.mimeType})` : ""}${a.url ? ` - ${a.url}` : ""}`)
            .join("\n")
        : "(No attachments)";

      const html = `
        <h2>New CyberHome AI Lead</h2>
        <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
        <p><strong>Session ID:</strong> ${escapeHtml(safeSessionId || "(empty)")}</p>
        <p><strong>Source:</strong> ${escapeHtml(safeSource)}</p>
        <p><strong>Fallback Reason:</strong> ${escapeHtml(safeFallbackReason || "(empty)")}</p>
        <p><strong>Page URL:</strong> ${escapeHtml(safePageUrl || "(empty)")}</p>
        <p><strong>Submitted At:</strong> ${escapeHtml(safeSubmittedAt)}</p>
        <p><strong>Client IP:</strong> ${escapeHtml(clientIP)}</p>
        <p><strong>Input Tokens:</strong> ${tokenUsage.inputTokens}</p>
        <p><strong>Output Tokens:</strong> ${tokenUsage.outputTokens}</p>
        <p><strong>Total Tokens:</strong> ${tokenUsage.totalTokens}</p>
        <hr />
        <p><strong>User Message:</strong></p>
        <pre>${escapeHtml(safeNote || "(empty)")}</pre>
        <hr />
        <p><strong>Attachments:</strong></p>
        ${attachmentListHtml}
        <hr />
        <p><strong>Transcript:</strong></p>
        <pre>${escapeHtml(transcriptText)}</pre>
      `;

      const text = [
        "New CyberHome AI Lead",
        `Email: ${safeEmail}`,
        `Session ID: ${safeSessionId || "(empty)"}`,
        `Source: ${safeSource}`,
        `Fallback Reason: ${safeFallbackReason || "(empty)"}`,
        `Page URL: ${safePageUrl || "(empty)"}`,
        `Submitted At: ${safeSubmittedAt}`,
        `Client IP: ${clientIP}`,
        `Input Tokens: ${tokenUsage.inputTokens}`,
        `Output Tokens: ${tokenUsage.outputTokens}`,
        `Total Tokens: ${tokenUsage.totalTokens}`,
        "",
        "User Message:",
        safeNote || "(empty)",
        "",
        "Attachments:",
        attachmentListText,
        "",
        "Transcript:",
        transcriptText,
      ].join("\n");

      try {
        resendResult = await sendViaResend({
          to: leadToEmail,
          from: resendFrom,
          subject,
          html,
          text,
          apiKey: resendApiKey,
          attachments: convertAttachmentsForResend(safeAttachments),
        });
        emailSent = true;
      } catch (error) {
        emailError = error?.message || "Email send failed";
      }
    } else {
      emailError = "Missing RESEND_API_KEY or LEAD_TO_EMAIL";
    }

    safeAppendJsonLine("leads.jsonl", {
      kind: "lead",
      ...payload,
      emailSent,
      emailError,
      resendId: resendResult?.id || "",
    });

    if (!emailSent && emailError) {
      return res.status(500).json({ ok: false, error: emailError });
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      sessionId: safeSessionId,
      emailSent,
      attachmentCount: safeAttachments.length,
      transcriptCount: safeTranscript.length,
      resendId: resendResult?.id || "",
    });
  } catch (error) {
    console.error("Lead API error:", error);

    safeAppendJsonLine("lead_errors.jsonl", {
      kind: "lead_error",
      reason: "exception",
      clientIP,
      message: error?.message || "Lead submission failed",
    });

    return res.status(500).json({ ok: false, error: "Lead submission failed" });
  }
}
