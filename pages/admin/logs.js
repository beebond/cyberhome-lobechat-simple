
import { useState } from "react";

export default function LogsAdmin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  const [type, setType] = useState("chat");
  const [sessionId, setSessionId] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  const BASE = typeof window !== "undefined" ? window.location.origin : "";

  const handleLogin = () => {
    const correct = process.env.NEXT_PUBLIC_ADMIN_LOGS_PASSWORD || "cyberhome_admin";
    if (password === correct) setAuthed(true);
    else alert("Wrong password");
  };

  const buildQuery = () => {
    const params = new URLSearchParams({
      type,
      limit: String(limit),
    });
    if (sessionId) params.append("sessionId", sessionId);
    if (search) params.append("search", search);
    return params.toString();
  };

  const handleCSV = () => {
    const url = `${BASE}/api/logs/download?${buildQuery()}`;
    window.open(url, "_blank");
  };

  const handleJSON = () => {
    const url = `${BASE}/api/logs?${buildQuery()}`;
    window.open(url, "_blank");
  };

  if (!authed) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Admin Login</h2>
        <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" />
        <button onClick={handleLogin}>Enter</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h2>CyberHome Logs Admin</h2>

      <div style={{ marginBottom: 20 }}>
        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="chat">chat</option>
          <option value="leads">leads</option>
          <option value="uploads">uploads</option>
        </select>

        <input placeholder="sessionId" value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
        <input placeholder="keyword" value={search} onChange={(e)=>setSearch(e.target.value)} />
        <input type="number" value={limit} onChange={(e)=>setLimit(e.target.value)} />

        <button onClick={handleCSV}>Download CSV</button>
        <button onClick={handleJSON}>View JSON</button>
      </div>
    </div>
  );
}
