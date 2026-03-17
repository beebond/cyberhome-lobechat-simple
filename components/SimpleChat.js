import { useEffect, useMemo, useRef, useState } from "react";

const BRAND_BLUE = "#19a8e8";
const HEADER_BG = "#07090e";
const SURFACE = "#f3f3f5";
const TEXT = "#1f2937";
const MUTED = "#8a94a6";
const BORDER = "#d9dde5";

const SIMPLECHAT_VERSION = "";
const STORAGE_PREFIX = "cyberhome_simplechat_v9_1_3";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const DEFAULT_FALLBACK_TEXT =
  "As an AI assistant, I can’t answer this question accurately right now. Please email support@cyberhome.app or leave your message below, and our colleague will get back to you soon.";

const LOGO_LIGHT_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAQABAADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+9CiiigAooooAKKKKACiiigAooooA";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function todayLabel() {
  const d = new Date();
  return `Today · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function storageKey(suffix) {
  return `${STORAGE_PREFIX}_${suffix}`;
}

export default function SimpleChat() {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey("messages")) : null;
    if (saved) return JSON.parse(saved);
    return [
      { id: uid(), role: "assistant", text: "Hi, I’m CyberHome AI. Ask me anything about CyberHome appliances, shipping, usage, or support.", time: nowLabel(), sender: "CyberHome AI", kind: "message" },
    ];
  });
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const bodyRef = useRef(null);
  const idleRef = useRef(null);

  useEffect(() => { localStorage.setItem(storageKey("messages"), JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, showLeadForm, showRating]);
  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleRef.current); }, []);

  function resetIdleTimer() {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      if (!showLeadForm && !showRating) setShowRating(true);
    }, IDLE_TIMEOUT_MS);
  }
  function onUserActivity() { resetIdleTimer(); }
  function pushMessage(msg) { setMessages((prev) => [...prev, msg]); }

  async function sendMessage() {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    onUserActivity();
    pushMessage({ id: uid(), role: "user", text: text || "[Attachment sent]", time: nowLabel(), kind: "message" });
    setInput("");
    setAttachments([]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text || "[Attachment sent]" }),
      });
      const data = await res.json();
      pushMessage({
        id: uid(), role: "assistant", text: data?.response || DEFAULT_FALLBACK_TEXT, time: nowLabel(), sender: "CyberHome AI", kind: "message", products: data?.products || [],
      });
      if (data?.meta?.fallbackTriggered || data?.meta?.showContactForm) {
        setLeadMessage(`Customer asked: ${text || "[Attachment sent]"}`);
        setShowLeadForm(true);
      }
    } catch {
      pushMessage({ id: uid(), role: "assistant", text: DEFAULT_FALLBACK_TEXT, time: nowLabel(), sender: "CyberHome AI", kind: "message" });
      setLeadMessage(`Customer asked: ${text || "[Attachment sent]"}`);
      setShowLeadForm(true);
    }
  }

  function submitLead() {
    setShowLeadForm(false);
    pushMessage({ id: uid(), role: "assistant", text: "Thank you. Your contact information has been received, and our colleague will get back to you soon.", time: nowLabel(), sender: "CyberHome AI", kind: "message" });
  }
  function submitRating() {
    setShowRating(false);
    pushMessage({ id: uid(), role: "assistant", text: "Thanks for your feedback.", time: nowLabel(), sender: "CyberHome AI", kind: "message" });
  }
  function onAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachments((prev) => [...prev, file]);
    onUserActivity();
  }

  return (
    <>
      {!isOpen && (
        <button className="sc-launcher" onClick={() => setIsOpen(true)} aria-label="Open chat">
          <img src={LOGO_LIGHT_URL} alt="CyberHome" />
          <span>CHAT</span>
        </button>
      )}

      {isOpen && (
        <div className={`sc-shell ${isExpanded ? "expanded" : ""}`} onMouseMove={onUserActivity} onKeyDown={onUserActivity}>
          <div className="sc-header">
            <div className="sc-header-left">
              <img className="sc-header-logo" src={LOGO_LIGHT_URL} alt="CyberHome" />
              <div className="sc-header-title">CyberHome Support</div>
            </div>
            <div className="sc-header-actions">
              <button className="sc-header-btn" onClick={() => setIsExpanded((v) => !v)} aria-label="Expand">{isExpanded ? "❐" : "▢"}</button>
              <button className="sc-header-btn" onClick={() => setIsOpen(false)} aria-label="Minimize">−</button>
            </div>
          </div>

          <div className="sc-body" ref={bodyRef}>
            <div className="sc-date-divider">{todayLabel()}</div>
            {messages.map((m) => (
              <div key={m.id} className={`sc-row ${m.role}`}>
                {m.role === "assistant" && (
                  <div className="sc-avatar-wrap">
                    <div className="sc-avatar"><img src={LOGO_LIGHT_URL} alt="CyberHome" /><span>AI</span></div>
                  </div>
                )}
                <div className={`sc-content ${m.role}`}>
                  {m.role === "assistant" && <div className="sc-sender">{m.sender || "CyberHome AI"}</div>}
                  <div className={`sc-bubble ${m.role}`}>{m.text}</div>
                  <div className="sc-time">{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          {showLeadForm && (
            <div className="sc-overlay-panel">
              <div className="sc-overlay-body">
                <input className="sc-field" type="email" placeholder="you@example.com" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
                <textarea className="sc-field sc-textarea" rows={4} placeholder="Your message..." value={leadMessage} onChange={(e) => setLeadMessage(e.target.value)} />
              </div>
              <div className="sc-action-row">
                <label className="sc-action-btn sc-attach">📎<input type="file" hidden onChange={onAttach} /></label>
                <button className="sc-action-btn sc-cancel" onClick={() => setShowLeadForm(false)}>Cancel</button>
                <button className="sc-action-btn sc-send" onClick={submitLead}>↑</button>
              </div>
            </div>
          )}

          {showRating && (
            <div className="sc-overlay-panel">
              <div className="sc-overlay-body">
                <div className="sc-rating-row">
                  {["😞","😐","🙂","😊","😍"].map((e, idx) => (
                    <button key={e} className={`sc-rating-btn ${rating === idx + 1 ? "active" : ""}`} onClick={() => setRating(idx + 1)}>{e}</button>
                  ))}
                </div>
                <textarea className="sc-field sc-textarea" rows={4} placeholder="Your feedback..." value={ratingText} onChange={(e) => setRatingText(e.target.value)} />
              </div>
              <div className="sc-action-row">
                <div className="sc-action-spacer" />
                <button className="sc-action-btn sc-cancel" onClick={() => setShowRating(false)}>Cancel</button>
                <button className="sc-action-btn sc-send" onClick={submitRating}>↑</button>
              </div>
            </div>
          )}

          {!showLeadForm && !showRating && (
            <div className="sc-footer">
              <textarea
                className="sc-main-input"
                rows={2}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => { setInput(e.target.value); onUserActivity(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <div className="sc-action-row">
                <label className="sc-action-btn sc-attach">📎<input type="file" hidden onChange={onAttach} /></label>
                <button className="sc-action-btn sc-end" onClick={() => setShowRating(true)}>End Chat</button>
                <button className="sc-action-btn sc-send" onClick={sendMessage}>↑</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .sc-shell { position: fixed; right: 18px; bottom: 18px; width: min(430px, calc(100vw - 24px)); height: min(820px, calc(100dvh - 24px)); background: ${SURFACE}; border-radius: 28px; overflow: hidden; z-index: 2147483645; box-shadow: 0 24px 60px rgba(0,0,0,.24); border: 1px solid rgba(0,0,0,.06); display: flex; flex-direction: column; }
        .sc-shell.expanded { right: 20px; bottom: 20px; width: min(1100px, calc(100vw - 40px)); height: min(920px, calc(100dvh - 40px)); border-radius: 30px; }
        .sc-header { background: ${HEADER_BG}; color: #fff; padding: 16px 18px 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .sc-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sc-header-logo { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; }
        .sc-header-title { font-size: 16px; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sc-header-actions { display: flex; gap: 8px; }
        .sc-header-btn { width: 42px; height: 42px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #fff; font-size: 24px; cursor: pointer; }
        .sc-body { flex: 1; overflow-y: auto; padding: 16px 14px 18px; background: ${SURFACE}; }
        .sc-date-divider { width: fit-content; margin: 0 auto 16px; font-size: 12px; color: ${MUTED}; background: rgba(255,255,255,0.55); padding: 10px 16px; border-radius: 999px; }
        .sc-row { display: flex; gap: 12px; margin-bottom: 18px; align-items: flex-start; }
        .sc-row.user { justify-content: flex-end; }
        .sc-avatar-wrap { flex: 0 0 auto; padding-top: 6px; }
        .sc-avatar { width: 34px; height: 34px; position: relative; border-radius: 999px; overflow: hidden; background: #091731; }
        .sc-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sc-avatar span { position: absolute; right: -2px; bottom: -2px; width: 14px; height: 14px; border-radius: 999px; background: #29d391; color: #fff; font-size: 7px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid ${SURFACE}; }
        .sc-content { max-width: min(78%, 740px); }
        .sc-content.user { display: flex; flex-direction: column; align-items: flex-end; max-width: min(78%, 640px); }
        .sc-sender { font-size: 12px; color: ${MUTED}; margin: 2px 0 6px 8px; }
        .sc-bubble { border-radius: 24px; padding: 16px 18px; font-size: 17px; line-height: 1.55; word-break: break-word; box-shadow: 0 3px 12px rgba(0,0,0,0.03); }
        .sc-bubble.assistant { background: #fff; color: ${TEXT}; }
        .sc-bubble.user { background: ${BRAND_BLUE}; color: #fff; border-bottom-right-radius: 10px; }
        .sc-time { font-size: 12px; color: ${MUTED}; margin-top: 8px; padding: 0 8px; }
        .sc-footer, .sc-overlay-panel { border-top: 1px solid rgba(0,0,0,0.06); background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); }
        .sc-overlay-body { display: flex; flex-direction: column; gap: 10px; }
        .sc-field, .sc-main-input { width: 100%; border: 1px solid ${BORDER}; border-radius: 18px; padding: 14px 16px; font-size: 16px; color: ${TEXT}; background: #fff; box-sizing: border-box; }
        .sc-main-input { min-height: 72px; max-height: 180px; resize: none; }
        .sc-textarea { min-height: 110px; resize: vertical; }
        .sc-action-row { margin-top: 10px; display: grid; grid-template-columns: 58px 1fr 58px; gap: 10px; }
        .sc-action-spacer { min-height: 1px; }
        .sc-action-btn { height: 54px; border-radius: 18px; border: 1px solid ${BORDER}; background: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; color: ${TEXT}; cursor: pointer; }
        .sc-attach { font-size: 26px; }
        .sc-send { background: ${BRAND_BLUE}; color: #fff; border-color: transparent; font-size: 28px; }
        .sc-rating-row { display: flex; gap: 10px; margin-bottom: 10px; }
        .sc-rating-btn { width: 52px; height: 52px; border-radius: 16px; border: 1px solid ${BORDER}; background: #fff; font-size: 24px; cursor: pointer; }
        .sc-rating-btn.active { border-color: ${BRAND_BLUE}; box-shadow: inset 0 0 0 2px ${BRAND_BLUE}; }
        .sc-launcher { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; height: 56px; border: none; border-radius: 999px; background: ${BRAND_BLUE}; box-shadow: 0 16px 38px rgba(0,0,0,.18); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 18px 0 12px; color: white; font-weight: 800; }
        .sc-launcher img { width: 24px; height: 24px; border-radius: 8px; }
        .sc-launcher span { font-size: 16px; line-height: 1; }
        @media (max-width: 768px) {
          .sc-launcher { right: 14px; bottom: 14px; height: 52px; padding: 0 16px 0 12px; }
          .sc-launcher img { width: 22px; height: 22px; }
          .sc-launcher span { font-size: 15px; }
          .sc-shell, .sc-shell.expanded { inset: 0; width: 100vw; height: 100dvh; max-width: 100vw; max-height: 100dvh; right: 0; bottom: 0; border-radius: 0; border: none; }
          .sc-header { padding: 12px; }
          .sc-header-logo { width: 18px; height: 18px; }
          .sc-header-title { font-size: 15px; }
          .sc-header-btn { width: 38px; height: 38px; border-radius: 12px; }
          .sc-body { padding: 12px 10px 14px; }
          .sc-avatar { width: 28px; height: 28px; }
          .sc-avatar span { width: 14px; height: 14px; font-size: 7px; }
          .sc-content { max-width: 82%; }
          .sc-bubble { font-size: 15px; padding: 14px 16px; border-radius: 20px; }
          .sc-footer, .sc-overlay-panel { padding: 10px calc(10px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left)); }
          .sc-field, .sc-main-input { border-radius: 16px; padding: 12px 14px; }
          .sc-main-input { min-height: 84px; }
          .sc-action-row { grid-template-columns: 56px 1fr 56px; gap: 8px; }
          .sc-action-btn { height: 56px; border-radius: 16px; }
        }
      `}</style>
    </>
  );
}
