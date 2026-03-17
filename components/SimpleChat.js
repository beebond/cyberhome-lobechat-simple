import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "cyberhome_simplechat_v9_3_1";
const SUPPORT_EMAIL = "support@cyberhome.app";
const BRAND_BLUE = "#19a8e8";
const HEADER_BG = "#07090e";
const SURFACE = "#f3f3f5";
const TEXT = "#1f2937";
const MUTED = "#8a94a6";
const BORDER = "#d9dde5";

const LOGO_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffb800"/>
      <stop offset="25%" stop-color="#ff7a00"/>
      <stop offset="50%" stop-color="#ff2db3"/>
      <stop offset="75%" stop-color="#00d66b"/>
      <stop offset="100%" stop-color="#17b7ff"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="#080a10"/>
  <path d="M64 16c5 0 10 1 15 4l27 16c9 5 14 14 14 24v8c0 10-5 19-14 24L79 108c-10 6-21 6-31 0L21 92C12 87 7 78 7 68v-8c0-10 5-19 14-24l27-16c5-3 10-4 16-4zm0 10c-4 0-7 1-10 2L27 44c-6 4-10 9-10 16v8c0 7 4 13 10 16l27 16c6 4 14 4 20 0l10-6-25-15a8 8 0 0 1 8-14h33V44L74 28c-3-1-6-2-10-2z" fill="url(#g1)"/>
</svg>
`);
const LOGO_URL = `data:image/svg+xml;charset=utf-8,${LOGO_SVG}`;

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function nowIso() { return new Date().toISOString(); }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function formatTime(input) {
  const d = new Date(input);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateDivider(input) {
  const d = new Date(input);
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return sameDay ? `Today · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` :
    d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function appendDateDividers(items) {
  const out = [];
  let prevDay = "";
  for (const item of items) {
    const d = new Date(item.createdAt || Date.now());
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== prevDay) {
      out.push({ id: uid("date"), role: "system", type: "date-divider", text: formatDateDivider(d), createdAt: d.toISOString() });
      prevDay = dayKey;
    }
    out.push(item);
  }
  return out;
}
function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function persistState(payload) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
}
function normalizeProducts(products = []) {
  return safeArray(products).map((p) => ({
    id: p.id || p.handle || uid("prod"),
    title: p.title || "Product",
    model: p.model || "",
    handle: p.handle || "",
    url: p.url || "",
    image: p.image || p.image_url || (Array.isArray(p.images) ? p.images[0] : "") || "",
  }));
}
function buildInitialMessages() {
  const ts = nowIso();
  return [{
    id: uid("assistant"),
    role: "assistant",
    senderType: "ai",
    text: "Hi, I’m CyberHome AI. Ask me anything about CyberHome appliances, shipping, usage, or support.",
    createdAt: ts,
    products: [],
    attachments: [],
    meta: { source: "system_welcome" },
  }];
}

function Avatar({ type = "ai" }) {
  return (
    <div className={`sc-avatar ${type}`}>
      <img src={LOGO_URL} alt="CyberHome" />
      <span className="sc-avatar-badge">{type === "human" ? "H" : "AI"}</span>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <div className="sc-product-card">
      <div className="sc-product-thumb">
        {product.image ? <img src={product.image} alt={product.title} /> : null}
      </div>
      <div className="sc-product-content">
        <div className="sc-product-title">{product.title}</div>
        {product.model ? <div className="sc-product-model">Model: {product.model}</div> : null}
        {product.url ? (
          <a className="sc-product-btn" href={product.url} target="_blank" rel="noreferrer">View Details</a>
        ) : (
          <button className="sc-product-btn" type="button">View Details</button>
        )}
      </div>
    </div>
  );
}

function LeadSheet({ email, setEmail, note, setNote, attachments, onFileChange, removeAttachment, onSubmit, onCancel, submitting }) {
  return (
    <div className="sc-sheet-card">
      <div className="sc-sheet-copy">
        As an AI assistant, I can’t answer this question accurately right now. Please email <strong>{SUPPORT_EMAIL}</strong> or leave your message below, and our colleague will get back to you soon.
      </div>

      <input className="sc-sheet-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <textarea className="sc-sheet-textarea" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your message..." />

      {attachments.length > 0 ? (
        <div className="sc-chip-list">
          {attachments.map((file) => (
            <div className="sc-chip" key={file.id}>
              <span>{file.name}</span>
              <button type="button" onClick={() => removeAttachment(file.id)}>×</button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="sc-sheet-actions">
        <label className="sc-attach-btn">
          📎
          <input type="file" hidden onChange={onFileChange} />
        </label>
        <button type="button" className="sc-end-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="sc-send-btn" onClick={onSubmit} disabled={submitting}>{submitting ? "…" : "↑"}</button>
      </div>
    </div>
  );
}

function RatingSheet({ rating, setRating, feedback, setFeedback, onSubmit, onCancel, submitting }) {
  const options = ["😞","😐","🙂","😊","😍"];
  return (
    <div className="sc-sheet-card">
      <div className="sc-rating-row">
        {options.map((emoji, idx) => (
          <button key={emoji} type="button" className={`sc-rating-btn ${rating === idx + 1 ? "active" : ""}`} onClick={() => setRating(idx + 1)}>
            {emoji}
          </button>
        ))}
      </div>
      <textarea className="sc-sheet-textarea" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Your feedback..." />
      <div className="sc-sheet-actions">
        <button type="button" className="sc-end-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="sc-send-btn" onClick={onSubmit} disabled={submitting}>{submitting ? "…" : "↑"}</button>
      </div>
    </div>
  );
}

export default function SimpleChat() {
  const restored = useMemo(() => restoreState(), []);
  const [sessionId] = useState(restored?.sessionId || uid("sess"));
  const [messages, setMessages] = useState(restored?.messages?.length ? restored.messages : buildInitialMessages());
  const [isOpen, setIsOpen] = useState(restored?.isOpen ?? true);
  const [isExpanded, setIsExpanded] = useState(restored?.isExpanded ?? false);
  const [input, setInput] = useState("");
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadEmail, setLeadEmail] = useState(restored?.leadEmail || "");
  const [leadNote, setLeadNote] = useState(restored?.leadNote || "");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [lastFallbackReason, setLastFallbackReason] = useState("");
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);

  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);
  const overlayMode = showLeadForm || showRatingCard;

  useEffect(() => {
    persistState({ sessionId, messages, isOpen, isExpanded, leadEmail, leadNote });
  }, [sessionId, messages, isOpen, isExpanded, leadEmail, leadNote]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, showLeadForm, showRatingCard]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.max(72, Math.min(textareaRef.current.scrollHeight, 180))}px`;
  }, [input]);

  const renderedMessages = useMemo(() => appendDateDividers(messages), [messages]);

  function pushMessage(msg) {
    setMessages((prev) => [...prev, msg]);
  }
  function pushAssistant(text, extra = {}) {
    pushMessage({ id: uid("assistant"), role: "assistant", senderType: extra.senderType || "ai", text, createdAt: nowIso(), products: extra.products || [], attachments: extra.attachments || [], meta: extra.meta || {} });
  }
  function pushUser(text, extra = {}) {
    pushMessage({ id: uid("user"), role: "user", senderType: "user", text, createdAt: nowIso(), products: [], attachments: extra.attachments || [], meta: extra.meta || {} });
  }

  async function uploadFile(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataUrl: reader.result }),
          });
          const data = await res.json();
          if (!res.ok || !data?.success) return reject(new Error(data?.error || "Upload failed"));
          resolve(data.file);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }
  async function handleComposerAttachmentChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await uploadFile(file);
      setComposerAttachments((prev) => [...prev, uploaded]);
    } catch (e2) { alert(e2.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  }
  function removeComposerAttachment(id) {
    setComposerAttachments((prev) => prev.filter((f) => f.id !== id));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text && composerAttachments.length === 0) return;
    if (sending) return;

    const attachmentsForMessage = [...composerAttachments];
    if (text) pushUser(text, { attachments: attachmentsForMessage });
    else if (attachmentsForMessage.length) pushUser("[Attachment sent]", { attachments: attachmentsForMessage });

    setInput("");
    setComposerAttachments([]);
    setSending(true);

    try {
      const payloadHistory = messages.filter((m) => m.type !== "date-divider").map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text || "",
        meta: m.meta || {},
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text || "[Attachment sent]", history: payloadHistory, sessionId, attachments: attachmentsForMessage }),
      });
      const data = await res.json();
      const reply = data?.response || "Sorry, something went wrong.";
      const products = normalizeProducts(data?.products || []);
      pushAssistant(reply, { products, meta: data?.meta || {} });

      if (data?.meta?.fallbackTriggered || data?.meta?.showContactForm) {
        setShowLeadForm(true);
        setLeadNote(`Customer asked: ${text || "[Attachment sent]"}`);
        setLastFallbackReason(data?.meta?.reason || "");
      }
    } catch {
      pushAssistant("Sorry, there was a temporary issue. Please try again or leave us a message below.", { meta: { fallbackTriggered: true, reason: "client_error" } });
      setShowLeadForm(true);
      setLeadNote(`Customer asked: ${text || "[Attachment sent]"}`);
      setLastFallbackReason("client_error");
    } finally {
      setSending(false);
    }
  }

  async function submitLead() {
    if (!leadEmail.trim()) return alert("Please enter your email.");
    try {
      setLeadSubmitting(true);
      const transcript = messages.filter((m) => m.type !== "date-divider").map((m) => ({ role: m.role, content: m.text, createdAt: m.createdAt, meta: m.meta || {} }));
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, email: leadEmail.trim(), note: leadNote.trim(), attachments: composerAttachments,
          transcript, fallbackReason: lastFallbackReason, pageUrl: typeof window !== "undefined" ? window.location.href : "", source: "simple_chat_v9_3_1",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Submit failed");
      setShowLeadForm(false);
      pushAssistant("Thank you. Your contact information has been received, and our colleague will get back to you soon.");
    } catch (e) { alert(e.message || "Submit failed"); }
    finally { setLeadSubmitting(false); }
  }

  async function submitRating() {
    if (!ratingValue) return alert("Please select a rating.");
    try {
      setRatingSubmitting(true);
      const res = await fetch("/api/rating", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, rating: ratingValue, feedback: ratingFeedback.trim(), pageUrl: typeof window !== "undefined" ? window.location.href : "", source: "simple_chat_v9_3_1" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Rating submit failed");
      setShowRatingCard(false);
      setConversationEnded(true);
      pushAssistant("Thanks for your feedback.");
    } catch (e) { alert(e.message || "Rating submit failed"); }
    finally { setRatingSubmitting(false); }
  }

  function renderMessage(message) {
    if (message.type === "date-divider") return <div className="sc-date-divider" key={message.id}>{message.text}</div>;
    const isUser = message.role === "user";
    const products = normalizeProducts(message.products);
    return (
      <div className={`sc-row ${isUser ? "user" : "assistant"}`} key={message.id}>
        {!isUser ? <div className="sc-left-col"><Avatar type={message.senderType || "ai"} /></div> : null}
        <div className={`sc-bubble-wrap ${isUser ? "user" : "assistant"}`}>
          {!isUser ? <div className="sc-sender-name">{message.senderType === "human" ? "CyberHome Support" : "CyberHome AI"}</div> : null}
          {message.text ? <div className={`sc-bubble ${isUser ? "user" : "assistant"}`}>{message.text}</div> : null}

          {safeArray(message.attachments).length > 0 ? (
            <div className="sc-msg-attachments">
              {message.attachments.map((att) => (
                <a className="sc-msg-attachment" key={att.id || att.url} href={att.url} target="_blank" rel="noreferrer">
                  {att.mimeType?.startsWith("image/") ? <img src={att.url} alt={att.name || "attachment"} /> : <span>📎</span>}
                  <span>{att.name || "Attachment"}</span>
                </a>
              ))}
            </div>
          ) : null}

          {products.length > 0 ? (
            <div className="sc-products-block">
              <div className="sc-products-label">Products Available</div>
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
              {message.meta?.moreLink ? (
                <a className="sc-more-products-btn" href={message.meta.moreLink} target="_blank" rel="noreferrer">{message.meta.moreLinkLabel || "More products"}</a>
              ) : null}
            </div>
          ) : null}
          <div className="sc-time">{formatTime(message.createdAt)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOpen ? (
        <button className="sc-launcher" onClick={() => setIsOpen(true)} aria-label="Open chat">
          <img src={LOGO_URL} alt="CyberHome" />
        </button>
      ) : null}

      {isOpen ? (
        <div className={`sc-shell ${isExpanded ? "expanded" : ""}`}>
          <div className="sc-header">
            <div className="sc-header-left">
              <img src={LOGO_URL} alt="CyberHome" className="sc-header-logo" />
              <div className="sc-header-title">CyberHome Support</div>
            </div>
            <div className="sc-header-actions">
              <button className="sc-header-btn" type="button" onClick={() => setIsExpanded((v) => !v)} aria-label="Expand">{isExpanded ? "❐" : "▢"}</button>
              <button className="sc-header-btn" type="button" onClick={() => setIsOpen(false)} aria-label="Minimize">−</button>
            </div>
          </div>

          <div className="sc-body" ref={scrollerRef}>
            {renderedMessages.map(renderMessage)}
            {conversationEnded ? <div className="sc-ended-label">Conversation ended.</div> : null}
          </div>

          {showLeadForm ? (
            <div className="sc-bottom-sheet">
              <LeadSheet
                email={leadEmail}
                setEmail={setLeadEmail}
                note={leadNote}
                setNote={setLeadNote}
                attachments={composerAttachments}
                onFileChange={handleComposerAttachmentChange}
                removeAttachment={removeComposerAttachment}
                onSubmit={submitLead}
                onCancel={() => setShowLeadForm(false)}
                submitting={leadSubmitting}
              />
            </div>
          ) : null}

          {showRatingCard ? (
            <div className="sc-bottom-sheet">
              <RatingSheet
                rating={ratingValue}
                setRating={setRatingValue}
                feedback={ratingFeedback}
                setFeedback={setRatingFeedback}
                onSubmit={submitRating}
                onCancel={() => setShowRatingCard(false)}
                submitting={ratingSubmitting}
              />
            </div>
          ) : null}

          {!overlayMode ? (
            <div className="sc-footer">
              {composerAttachments.length > 0 ? (
                <div className="sc-chip-list composer">
                  {composerAttachments.map((file) => (
                    <div className="sc-chip" key={file.id}>
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeComposerAttachment(file.id)}>×</button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="sc-composer">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <div className="sc-composer-actions">
                  <label className="sc-attach-btn">
                    📎
                    <input type="file" hidden onChange={handleComposerAttachmentChange} />
                  </label>
                  <button className="sc-end-btn" type="button" onClick={() => setShowRatingCard(true)}>End Chat</button>
                  <button className="sc-send-btn" type="button" onClick={sendMessage} disabled={sending || uploading}>↑</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .sc-launcher {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 2147483646;
          width: 58px;
          height: 58px;
          border: none;
          border-radius: 999px;
          background: ${BRAND_BLUE};
          box-shadow: 0 16px 38px rgba(0,0,0,.18);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .sc-launcher img { width: 24px; height: 24px; border-radius: 8px; }

        .sc-shell {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: min(430px, calc(100vw - 24px));
          height: min(820px, calc(100dvh - 24px));
          background: ${SURFACE};
          border-radius: 28px;
          overflow: hidden;
          z-index: 2147483645;
          box-shadow: 0 24px 60px rgba(0,0,0,.24);
          border: 1px solid rgba(0,0,0,.06);
          display: flex;
          flex-direction: column;
        }
        .sc-shell.expanded {
          right: 20px; bottom: 20px;
          width: min(1100px, calc(100vw - 40px));
          height: min(920px, calc(100dvh - 40px));
          border-radius: 30px;
        }
        .sc-header {
          background: ${HEADER_BG};
          color: #fff;
          padding: 16px 18px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .sc-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sc-header-logo { width: 28px; height: 28px; border-radius: 8px; }
        .sc-header-title {
          font-size: 16px; font-weight: 800; line-height: 1.1; letter-spacing: -0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sc-header-actions { display: flex; gap: 8px; }
        .sc-header-btn {
          width: 42px; height: 42px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #fff; font-size: 24px; cursor: pointer;
        }

        .sc-body {
          flex: 1; overflow-y: auto; padding: 16px 14px 18px; background: ${SURFACE};
        }
        .sc-date-divider {
          width: fit-content; margin: 0 auto 16px;
          font-size: 12px; color: ${MUTED};
          background: rgba(255,255,255,0.55);
          padding: 10px 16px; border-radius: 999px;
        }
        .sc-row { display: flex; gap: 12px; margin-bottom: 18px; align-items: flex-start; }
        .sc-row.user { justify-content: flex-end; }
        .sc-left-col { flex: 0 0 auto; padding-top: 6px; }
        .sc-avatar {
          width: 34px; height: 34px; position: relative; border-radius: 999px; overflow: hidden; background: #091731;
        }
        .sc-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sc-avatar-badge {
          position: absolute; right: -2px; bottom: -2px; width: 14px; height: 14px;
          border-radius: 999px; background: #29d391; color: #fff; font-size: 7px;
          font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid ${SURFACE};
        }
        .sc-bubble-wrap { max-width: min(78%, 740px); }
        .sc-bubble-wrap.user { display: flex; flex-direction: column; align-items: flex-end; max-width: min(78%, 640px); }
        .sc-sender-name { font-size: 12px; color: ${MUTED}; margin: 2px 0 6px 8px; }
        .sc-bubble {
          border-radius: 24px; padding: 16px 18px; font-size: 17px; line-height: 1.55; word-break: break-word;
          box-shadow: 0 3px 12px rgba(0,0,0,0.03);
        }
        .sc-bubble.assistant { background: #fff; color: ${TEXT}; }
        .sc-bubble.user { background: ${BRAND_BLUE}; color: #fff; border-bottom-right-radius: 10px; }
        .sc-time { font-size: 12px; color: ${MUTED}; margin-top: 8px; padding: 0 8px; }
        .sc-bubble-wrap.user .sc-time { text-align: right; }

        .sc-msg-attachments { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
        .sc-msg-attachment {
          display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.86);
          border: 1px solid ${BORDER}; border-radius: 14px; padding: 8px 10px; color: ${TEXT};
          text-decoration: none; width: fit-content; max-width: 100%;
        }
        .sc-msg-attachment img { width: 34px; height: 34px; border-radius: 8px; object-fit: cover; }

        .sc-products-block { margin-top: 12px; }
        .sc-products-label {
          font-size: 12px; display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px;
          background: #d6f8de; color: #128a47; font-weight: 700;
        }
        .sc-product-card {
          background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 16px;
          display: grid; grid-template-columns: 72px 1fr; gap: 14px; margin-top: 12px;
        }
        .sc-product-thumb {
          width: 72px; height: 72px; background: #f6f7f9; border-radius: 14px; overflow: hidden;
        }
        .sc-product-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .sc-product-title { font-size: 16px; font-weight: 800; line-height: 1.35; color: #111827; }
        .sc-product-model { margin-top: 8px; color: ${MUTED}; font-size: 14px; }
        .sc-product-btn, .sc-more-products-btn {
          appearance: none; text-decoration: none; border: none; cursor: pointer;
        }
        .sc-product-btn {
          display: inline-flex; align-items: center; justify-content: center; margin-top: 12px; padding: 11px 16px;
          border-radius: 14px; background: #2162f3; color: #fff; font-weight: 800;
        }
        .sc-more-products-btn {
          display: inline-flex; align-items: center; justify-content: center; margin-top: 12px; padding: 11px 16px;
          border-radius: 14px; background: #081733; color: #fff; font-weight: 800;
        }

        .sc-bottom-sheet {
          border-top: 1px solid rgba(0,0,0,0.06);
          background: rgba(255,255,255,0.96);
          padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
          box-shadow: 0 -8px 30px rgba(0,0,0,0.08);
        }
        .sc-sheet-card {
          background: transparent;
        }
        .sc-sheet-copy {
          color: #475467; line-height: 1.55; font-size: 14px; margin-bottom: 10px;
        }
        .sc-sheet-input, .sc-sheet-textarea {
          width: 100%; border: 1px solid ${BORDER}; border-radius: 18px; padding: 14px 16px;
          font-size: 16px; color: ${TEXT}; background: #fff; box-sizing: border-box;
        }
        .sc-sheet-textarea { margin-top: 10px; min-height: 110px; resize: vertical; }
        .sc-sheet-actions {
          margin-top: 10px;
          display: grid; grid-template-columns: 58px 1fr 58px; gap: 10px;
        }

        .sc-chip-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .sc-chip-list.composer { padding: 0 2px 8px; }
        .sc-chip {
          background: #fff; border: 1px solid ${BORDER}; border-radius: 999px; padding: 8px 12px;
          display: inline-flex; align-items: center; gap: 8px; font-size: 13px; max-width: 100%;
        }
        .sc-chip button { border: none; background: transparent; cursor: pointer; color: #667085; font-size: 16px; }

        .sc-rating-row { display: flex; gap: 10px; margin-bottom: 10px; }
        .sc-rating-btn {
          width: 52px; height: 52px; border-radius: 16px; border: 1px solid ${BORDER}; background: #fff; font-size: 24px; cursor: pointer;
        }
        .sc-rating-btn.active { border-color: ${BRAND_BLUE}; box-shadow: inset 0 0 0 2px ${BRAND_BLUE}; }

        .sc-footer {
          border-top: 1px solid rgba(0,0,0,0.06);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
        }
        .sc-composer textarea {
          width: 100%; min-height: 72px; max-height: 160px; resize: none;
          border-radius: 20px; border: 1px solid ${BORDER}; padding: 14px 16px; font-size: 16px; color: ${TEXT}; background: #fff; box-sizing: border-box;
        }
        .sc-composer-actions {
          margin-top: 10px; display: grid; grid-template-columns: 58px 1fr 58px; gap: 10px;
        }
        .sc-attach-btn, .sc-end-btn, .sc-send-btn {
          height: 54px; border-radius: 18px; border: 1px solid ${BORDER}; background: #fff;
          display: inline-flex; align-items: center; justify-content: center; font-weight: 800; color: ${TEXT}; cursor: pointer;
        }
        .sc-attach-btn { font-size: 26px; }
        .sc-send-btn { background: ${BRAND_BLUE}; color: #fff; border-color: transparent; font-size: 28px; }

        .sc-ended-label { color: ${MUTED}; text-align: center; font-size: 13px; margin-top: 10px; }

        @media (max-width: 768px) {
          .sc-launcher { right: 14px; bottom: 14px; width: 56px; height: 56px; }
          .sc-launcher img { width: 22px; height: 22px; }
          .sc-shell, .sc-shell.expanded {
            inset: 0; width: 100vw; height: 100dvh; max-width: 100vw; max-height: 100dvh;
            right: 0; bottom: 0; border-radius: 0; border: none;
          }
          .sc-header { padding: 12px; }
          .sc-header-logo { width: 18px; height: 18px; }
          .sc-header-title { font-size: 15px; }
          .sc-header-btn { width: 38px; height: 38px; border-radius: 12px; }
          .sc-body { padding: 12px 10px 14px; }
          .sc-avatar { width: 28px; height: 28px; }
          .sc-avatar-badge { width: 14px; height: 14px; font-size: 7px; }
          .sc-bubble-wrap { max-width: 82%; }
          .sc-bubble { font-size: 15px; padding: 14px 16px; border-radius: 20px; }
          .sc-product-card { grid-template-columns: 66px 1fr; gap: 12px; padding: 14px; border-radius: 18px; }
          .sc-product-thumb { width: 66px; height: 66px; border-radius: 12px; }
          .sc-product-title { font-size: 15px; }
          .sc-product-model { font-size: 13px; }
          .sc-bottom-sheet, .sc-footer { padding: 10px calc(10px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left)); }
          .sc-sheet-copy { font-size: 13px; }
          .sc-sheet-input, .sc-sheet-textarea { border-radius: 16px; padding: 12px 14px; }
          .sc-composer textarea { min-height: 84px; border-radius: 18px; }
          .sc-sheet-actions, .sc-composer-actions { grid-template-columns: 56px 1fr 56px; gap: 8px; }
          .sc-attach-btn, .sc-end-btn, .sc-send-btn { height: 56px; border-radius: 16px; }
        }
      `}</style>
    </>
  );
}
