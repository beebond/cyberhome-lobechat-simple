export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const password = String(req.body?.password || "");
    const expected = String(process.env.ADMIN_LOGS_PASSWORD || "cyberhome_admin");

    if (!password) {
      return res.status(400).json({ ok: false, error: "Password required" });
    }

    if (password !== expected) {
      return res.status(401).json({ ok: false, error: "Invalid password" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Password check failed",
      message: error?.message || "Unknown error",
    });
  }
}
