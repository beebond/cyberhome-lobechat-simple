import fs from "fs";
import path from "path";

function ensureLogDir() {
  const dir = path.join(process.cwd(), "data", "logs");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function stringifyJsonLine(payload) {
  return JSON.stringify(payload).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function appendJsonLine(fileName, payload) {
  const dir = ensureLogDir();
  const filePath = path.join(dir, fileName);
  const line = stringifyJsonLine({
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
