// pages/api/logs.js
// CyberHome SimpleChat V9.5 log viewer API
// Usage examples:
//   /api/logs?type=leads
//   /api/logs?type=ratings&limit=20
//   /api/logs?type=uploads&limit=50&offset=0
//   /api/logs?type=chat&search=lid
//   /api/logs?type=chat&sessionId=sc_xxx
//   /api/logs?type=chat&stats=fallback
//   /api/logs?type=chat&stats=top_questions
//   /api/logs?type=chat&export=csv
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
  ["chat", "chat.jsonl"],
  ["chat_errors", "chat_errors.jsonl"],
]);

function sanitizeText(value, max = 200) {
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

function toSearchableText(item) {
  return [
    item?.sessionId || "",
    item?.userMessage || "",
    item?.response || "",
    item?.feedback || "",
    item?.email || "",
    item?.note || "",
    item?.source || "",
    item?.pageUrl || "",
    item?.meta?.reason || "",
  ]
    .join(" ")
    .toLowerCase();
}

function toCSV(items) {
  const header = ["loggedAt", "sessionId", "userMessage", "response", "source", "reason"];

  const rows = items.map((item) => [
    item?.loggedAt || "",
    item?.sessionId || "",
    String(item?.userMessage || "").replace(/"/g, '""'),
    String(item?.response || "").replace(/"/g, '""'),
    item?.source || "",
    item?.meta?.reason || "",
  ]);

  return [
    header.join(","),
    ...rows.map((row) => `"${row.join('","')}"`),
  ].join("\n");
}

function applyFilters(items, req) {
  let filtered = [...items];

  const search = sanitizeText(req.query.search || "", 200).toLowerCase();
  if (search) {
    filtered = filtered.filter((item) => toSearchableText(item).includes(search));
  }

  const sessionId = sanitizeText(req.query.sessionId || "", 200);
  if (sessionId) {
    filtered = filtered.filter((item) => String(item?.sessionId || "") === sessionId);
  }

  const source = sanitizeText(req.query.source || "", 200);
  if (source) {
    filtered = filtered.filter((item) => String(item?.source || "") === source);
  }

  const reason = sanitizeText(req.query.reason || "", 200);
  if (reason) {
    filtered = filtered.filter((item) => String(item?.meta?.reason || "") === reason);
  }

  return filtered;
}

function buildFallbackStats(items) {
  const stats = {};

  for (const item of items) {
    const fallbackTriggered =
      Boolean(item?.fallbackTriggered) || Boolean(item?.meta?.fallbackTriggered);

    if (!fallbackTriggered) continue;

    const reason = item?.meta?.reason || "unknown";
    stats[reason] = (stats[reason] || 0) + 1;
  }

  return stats;
}

function buildTopQuestions(items) {
  const counts = {};

  for (const item of items) {
    const q = String(item?.userMessage || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 160);

    if (!q) continue;
    counts[q] = (counts[q] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([question, count]) => ({ question, count }));
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

    const limit = parsePositiveInt(req.query.limit, 50, 500);
    const offset = parsePositiveInt(req.query.offset, 0, 10000);
    const reverse = String(req.query.reverse || "true").toLowerCase() !== "false";
    const includeRawMeta = String(req.query.includeMeta || "false").toLowerCase() === "true";
    const statsMode = sanitizeText(req.query.stats || "", 50);
    const exportMode = sanitizeText(req.query.export || "", 20).toLowerCase();

    const logsDir = getLogsDir();
    const filePath = path.join(logsDir, fileName);

    const items = readJsonlFile(filePath);
    const filtered = applyFilters(items, req);
    const total = filtered.length;

    if (statsMode === "fallback") {
      return res.status(200).json({
        ok: true,
        type: requestedType,
        stats: buildFallbackStats(filtered),
        total,
      });
    }

    if (statsMode === "top_questions") {
      return res.status(200).json({
        ok: true,
        type: requestedType,
        top: buildTopQuestions(filtered),
        total,
      });
    }

    if (exportMode === "csv") {
      const orderedForExport = reverse ? [...filtered].reverse() : filtered;
      const slicedForExport = orderedForExport.slice(offset, offset + Math.min(limit, 500));
      const csv = toCSV(slicedForExport);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${requestedType}-${Date.now()}.csv"`
      );
      return res.status(200).send(csv);
    }

    const ordered = reverse ? [...filtered].reverse() : filtered;
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
      filters: {
        search: sanitizeText(req.query.search || "", 200),
        sessionId: sanitizeText(req.query.sessionId || "", 200),
        source: sanitizeText(req.query.source || "", 200),
        reason: sanitizeText(req.query.reason || "", 200),
      },
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