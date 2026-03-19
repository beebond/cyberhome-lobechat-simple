// pages/api/upload.js
// CyberHome SimpleChat V9.4 upload endpoint with JSONL logging
// Suitable for early testing. For production, replace local disk with S3 / Supabase / Cloudinary.

import fs from "fs";
import path from "path";
import { safeAppendJsonLine } from "./_lib/chatLogger";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeText(value, max = 300) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function ensureUploadsDir() {
  const dir = path.join(process.cwd(), "public", "uploads", "chat");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeFileName(originalName = "file") {
  const ext = path.extname(originalName || "").slice(0, 20);
  const base = path
    .basename(originalName || "file", ext)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 80);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base || "file"}-${stamp}${ext}`;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIP = getClientIP(req);

  try {
    const {
      name = "",
      mimeType = "",
      base64 = "",
      source = "simple_chat_v9",
    } = req.body || {};

    const safeName = sanitizeText(name, 200);
    const safeMimeType = sanitizeText(mimeType, 200);
    const safeSource = sanitizeText(source, 100);
    const safeBase64 = String(base64 || "").trim();

    if (!safeName || !safeMimeType || !safeBase64) {
      safeAppendJsonLine("upload_errors.jsonl", {
        kind: "upload_error",
        reason: "missing_file_data",
        clientIP,
        source: safeSource,
        name: safeName,
        mimeType: safeMimeType,
      });

      return res.status(400).json({ ok: false, error: "Missing file data" });
    }

    if (!ALLOWED_MIME_TYPES.has(safeMimeType)) {
      safeAppendJsonLine("upload_errors.jsonl", {
        kind: "upload_error",
        reason: "file_type_not_allowed",
        clientIP,
        source: safeSource,
        name: safeName,
        mimeType: safeMimeType,
      });

      return res.status(400).json({ ok: false, error: "File type not allowed" });
    }

    const buffer = Buffer.from(safeBase64, "base64");
    if (!buffer.length) {
      safeAppendJsonLine("upload_errors.jsonl", {
        kind: "upload_error",
        reason: "invalid_file_content",
        clientIP,
        source: safeSource,
        name: safeName,
        mimeType: safeMimeType,
      });

      return res.status(400).json({ ok: false, error: "Invalid file content" });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      safeAppendJsonLine("upload_errors.jsonl", {
        kind: "upload_error",
        reason: "file_too_large",
        clientIP,
        source: safeSource,
        name: safeName,
        mimeType: safeMimeType,
        size: buffer.length,
      });

      return res.status(400).json({ ok: false, error: "File too large" });
    }

    const uploadsDir = ensureUploadsDir();
    const fileName = makeFileName(safeName);
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.RAILWAY_STATIC_URL ||
      "https://cyberhome-ai-simplechat-production.up.railway.app";

    const publicUrl = `${baseUrl}/api/file/chat/${fileName}`;

    const payload = {
      kind: "upload",
      name: safeName,
      mimeType: safeMimeType,
      size: buffer.length,
      fileName,
      publicUrl,
      source: safeSource,
      clientIP,
    };

    console.log("=== CyberHome Upload Captured V9.4 ===");
    console.log(JSON.stringify(payload, null, 2));

    safeAppendJsonLine("uploads.jsonl", payload);

    return res.status(200).json({
      ok: true,
      id: fileName,
      name: safeName,
      url: publicUrl,
      mimeType: safeMimeType,
      size: buffer.length,
    });
  } catch (error) {
    console.error("Upload API error:", error);

    safeAppendJsonLine("upload_errors.jsonl", {
      kind: "upload_error",
      reason: "exception",
      clientIP,
      message: error?.message || "Upload failed",
    });

    return res.status(500).json({ ok: false, error: "Upload failed" });
  }
}
