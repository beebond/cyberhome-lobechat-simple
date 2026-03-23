import { useEffect, useMemo, useState } from "react";

const AUTH_KEY = "cyberhome_admin_logs_authed_v1";

export default function AdminLogsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  const [type, setType] = useState("chat");
  const [sessionId, setSessionId] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(window.sessionStorage.getItem(AUTH_KEY) === "1");
    }
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("limit", String(limit || 50));
    if (sessionId.trim()) params.set("sessionId", sessionId.trim());
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [type, sessionId, search, limit]);

  async function handleLogin(e) {
    e?.preventDefault?.();
    setChecking(true);
    setAuthError("");

    try {
      const response = await fetch("/api/admin/check-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setAuthError(data?.error || "Login failed");
        setAuthed(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(AUTH_KEY, "1");
      }
      setAuthed(true);
      setPassword("");
    } catch (error) {
      setAuthError(error?.message || "Login failed");
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_KEY);
    }
    setAuthed(false);
    setPassword("");
    setAuthError("");
  }

  function openCsv() {
    const url = `/api/logs/download?${queryString}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openJson() {
    const url = `/api/logs?${queryString}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7fb",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}>
        <form
          onSubmit={handleLogin}
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 28,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            CyberHome Logs Admin
          </div>
          <div style={{ color: "#555", fontSize: 15, marginBottom: 20 }}>
            Enter your admin password to access log tools.
          </div>

          <label style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 44,
              borderRadius: 10,
              border: "1px solid #d7dbe7",
              padding: "0 12px",
              fontSize: 15,
              marginBottom: 12,
            }}
          />

          {authError ? (
            <div style={{
              color: "#b42318",
              background: "#fef3f2",
              border: "1px solid #fecdca",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              marginBottom: 12,
            }}>
              {authError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={checking}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: checking ? "not-allowed" : "pointer",
              opacity: checking ? 0.7 : 1,
            }}
          >
            {checking ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f7fb",
      fontFamily: "Arial, sans-serif",
      padding: 24,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: 24,
          borderBottom: "1px solid #eceff5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>CyberHome Logs Admin</div>
            <div style={{ marginTop: 6, color: "#667085", fontSize: 14 }}>
              Filter logs and export CSV without exposing LOGS_API_KEY.
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid #d0d5dd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}>
            <div>
              <div style={{ fontSize: 13, color: "#667085", marginBottom: 6 }}>Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #d7dbe7",
                  padding: "0 12px",
                  fontSize: 14,
                  background: "#fff",
                }}
              >
                <option value="chat">chat</option>
                <option value="leads">leads</option>
                <option value="uploads">uploads</option>
                <option value="ratings">ratings</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#667085", marginBottom: 6 }}>Session ID</div>
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="sc_xxx"
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #d7dbe7",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#667085", marginBottom: 6 }}>Keyword</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="yogurt / chopper / amazon"
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #d7dbe7",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#667085", marginBottom: 6 }}>Limit</div>
              <input
                type="number"
                min="1"
                max="500"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #d7dbe7",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={openCsv}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Download CSV
            </button>

            <button
              onClick={openJson}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid #d0d5dd",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              View JSON
            </button>
          </div>

          <div style={{
            marginTop: 18,
            background: "#f9fafb",
            border: "1px solid #eaecf0",
            borderRadius: 12,
            padding: 14,
            color: "#475467",
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            <div><strong>Current query</strong></div>
            <div style={{ marginTop: 6, wordBreak: "break-all" }}>
              /api/logs/download?{queryString}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
