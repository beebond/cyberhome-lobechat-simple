// pages/api/_lib/chatLogger.js
// CyberHome V9.6.2 persistent-preferred JSONL logger

import fs from "fs";
import path from "path";

const PERSISTENT_ROOT = process.env.LOGS_ROOT_DIR || "/data";
const FALLBACK_ROOT = path.join(process.cwd(), "data");

function canUseDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const testFile = path.join(dirPath, ".write-test");
    fs.writeFileSync(testFile, "ok", "utf8");
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

export function getPreferredLogsDir() {
  const persistentDir = path.join(PERSISTENT_ROOT, "logs");
  if (canUseDir(persistentDir)) {
    return persistentDir;
  }

  const fallbackDir = path.join(FALLBACK_ROOT, "logs");
  fs.mkdirSync(fallbackDir, { recursive: true });
  return fallbackDir;
}

function stringifyJsonLine(payload) {
  return JSON.stringify(payload)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function appendJsonLine(fileName, payload) {
  const dir = getPreferredLogsDir();
  const filePath = path.join(dir, fileName);
  const line =
    stringifyJsonLine({
      loggedAt: new Date().toISOString(),
      ...payload,
    }) + "\n";

  fs.appendFileSync(filePath, line, "utf8");
  return filePath;
}

export function safeAppendJsonLine(fileName, payload) {
  try {
    return appendJsonLine(fileName, payload);
  } catch (error) {
    console.error(`JSONL log write failed for ${fileName}:`, error);
    return null;
  }
}
