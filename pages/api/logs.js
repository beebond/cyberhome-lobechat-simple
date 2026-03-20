// pages/api/logs.js
// CyberHome SimpleChat V9.4.1 log viewer API
// Usage:
//   /api/logs?type=leads
//   /api/logs?type=ratings&limit=20
//   /api/logs?type=uploads&limit=50&offset=0
//
// Optional protection:
//   Set LOGS_API_KEY in Railway Variables
//   Then call /api/logs?type=leads&key=YOUR_KEY

import fs from "fs";
import path from "path";

const ALLOWED_TYPES = new Map([
  ["leads", "leads.jsonl"],
  ["ratings", "ratings.jsonl"],
  ["uploads", "uploads.jsonl"],
  ["lead_errors", "lead_errors.jsonl"],
  ["rating_errors", "rating_errors.jsonl"],
  ["upload_errors", "upload_errors.jsonl"],

  // ✅ V9.4.2 新增
  ["chat", "chat.jsonl"],
  ["chat_errors", "chat_errors.jsonl"],
]);

function sanitizeText(value, max = 100) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function getLogsDir() {
  return path.join(process.cwd(), "data", "logs");
}

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function parsePositiveInt(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function readJsonlFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          kind: "parse_error",
          rawLine: line.slice(0, 1000),
          parseError: error?.message || "Invalid JSONL line",
        };
      }
    });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const clientIP = getClientIP(req);
    const requestedType = sanitizeText(req.query.type || "leads", 50);
    const fileName = ALLOWED_TYPES.get(requestedType);

    if (!fileName) {
      return res.status(400).json({
        ok: false,
        error: "Invalid log type",
        allowedTypes: Array.from(ALLOWED_TYPES.keys()),
      });
    }

    const requiredKey = process.env.LOGS_API_KEY || "";
    const providedKey = sanitizeText(req.query.key || req.headers["x-logs-key"] || "", 200);

    if (requiredKey && providedKey !== requiredKey) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const offset = parsePositiveInt(req.query.offset, 0, 10000);
    const reverse = String(req.query.reverse || "true").toLowerCase() !== "false";
    const includeRawMeta = String(req.query.includeMeta || "false").toLowerCase() === "true";

    const logsDir = getLogsDir();
    const filePath = path.join(logsDir, fileName);

    const items = readJsonlFile(filePath);
    const total = items.length;

    const ordered = reverse ? [...items].reverse() : items;
    const sliced = ordered.slice(offset, offset + limit);

    const response = {
      ok: true,
      type: requestedType,
      fileName,
      total,
      count: sliced.length,
      limit,
      offset,
      reverse,
      items: sliced,
    };

    if (includeRawMeta) {
      response.meta = {
        clientIP,
        logsDir,
        fileExists: fs.existsSync(filePath),
        filePath,
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Logs API error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to read logs",
      message: error?.message || "Unknown error",
    });
  }
}
