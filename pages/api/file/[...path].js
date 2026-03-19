import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const { path: filePathArr } = req.query;

    if (!filePathArr || !Array.isArray(filePathArr)) {
      return res.status(400).send("Invalid path");
    }

    // 构建文件路径：/public/uploads/chat/xxx
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      ...filePathArr
    );

    // 防止路径穿越攻击
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.join(process.cwd(), "public", "uploads"))) {
      return res.status(403).send("Forbidden");
    }

    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).send("File not found");
    }

    const fileBuffer = fs.readFileSync(normalizedPath);

    // 简单 MIME 处理
    const ext = path.extname(normalizedPath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".txt") contentType = "text/plain";
    else if (ext === ".doc") contentType = "application/msword";
    else if (ext === ".docx")
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    res.send(fileBuffer);
  } catch (error) {
    console.error("File serve error:", error);
    res.status(500).send("Internal server error");
  }
}