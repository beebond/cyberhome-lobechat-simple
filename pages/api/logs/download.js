export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { sessionId = "", search = "", limit = "", type = "chat" } = req.query || {};

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.RAILWAY_STATIC_URL ||
      "https://cyberhome-ai-simplechat-production.up.railway.app";

    const logsApiKey = process.env.LOGS_API_KEY || "";

    if (!logsApiKey) {
      return res.status(500).json({ ok: false, error: "Missing LOGS_API_KEY" });
    }

    const params = new URLSearchParams({
      type: String(type || "chat"),
      format: "csv",
      key: logsApiKey,
    });

    if (sessionId) params.append("sessionId", String(sessionId));
    if (search) params.append("search", String(search));
    if (limit) params.append("limit", String(limit));

    const url = `${String(baseUrl).replace(/\/+$/, "")}/api/logs?${params.toString()}`;

    const response = await fetch(url);
    const body = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Failed to fetch logs CSV",
        details: body.slice(0, 1000),
      });
    }

    const safeType = String(type || "chat").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeSessionId = String(sessionId || "all").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeType}-${safeSessionId}.csv"`
    );

    return res.status(200).send(body);
  } catch (error) {
    console.error("Logs download error:", error);
    return res.status(500).json({ ok: false, error: "Download failed" });
  }
}
