// pages/api/upload.js
// CyberHome SimpleChat V9 upload endpoint (lightweight filesystem version)

import fs from "fs";
import path from "path";

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
      return res.status(400).json({ ok: false, error: "Missing file data" });
    }

    if (!ALLOWED_MIME_TYPES.has(safeMimeType)) {
      return res.status(400).json({ ok: false, error: "File type not allowed" });
    }

    const buffer = Buffer.from(safeBase64, "base64");
    if (!buffer.length) {
      return res.status(400).json({ ok: false, error: "Invalid file content" });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ ok: false, error: "File too large" });
    }

    const uploadsDir = ensureUploadsDir();
    const fileName = makeFileName(safeName);
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // ✅ 核心修复：生成绝对URL（用于邮件）
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.RAILWAY_STATIC_URL ||
      "https://cyberhome-ai-simplechat-production.up.railway.app";

    const publicUrl = `${baseUrl}/api/file/uploads/chat/${fileName}`;

    console.log("=== CyberHome Upload Captured V9.3 FIX ===");
    console.log(
      JSON.stringify(
        {
          name: safeName,
          mimeType: safeMimeType,
          size: buffer.length,
          fileName,
          publicUrl,
          source: safeSource,
        },
        null,
        2
      )
    );

    return res.status(200).json({
      ok: true,
      id: fileName,
      name: safeName,
      url: publicUrl, // ✅ 返回绝对URL
      mimeType: safeMimeType,
      size: buffer.length,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return res.status(500).json({ ok: false, error: "Upload failed" });
  }
}