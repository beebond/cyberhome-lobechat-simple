import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V6.5";
const USER_AVATAR = "You";
const ASSISTANT_AVATAR = "AI";
const IDLE_TIMEOUT_MS = 60 * 1000;

function formatTime(value) {
  try {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function createSessionId() {
  return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildProductUrl(product) {
  if (!product) return "#";
  if (product.url) return product.url;
  if (product.handle) {
    return `https://www.cyberhome.app/products/${product.handle}`;
  }
  return "#";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function sanitizeLeadText(value, max = 3000) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function Avatar({ role }) {
  const isUser = role === "user";

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        background: isUser ? "#dbeafe" : "#111827",
        color: isUser ? "#1d4ed8" : "#ffffff",
        border: isUser ? "1px solid #bfdbfe" : "1px solid #1f2937",
      }}
      title={isUser ? "You" : "CyberHome AI"}
    >
      {isUser ? USER_AVATAR : ASSISTANT_AVATAR}
    </div>
  );
}

function DetailLinkButton({ href, label }) {
  if (!href) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          background: "#2563eb",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.2,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {label || "View Details"}
      </a>
    </div>
  );
}

function ProductCard({ product }) {
  if (!product) return null;

  const title = product.title || "Product";
  const image = product.image || product.image_url || "";
  const price = product.price ?? "";
  const model = product.model || product.product_id || "";
  const url = buildProductUrl(product);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        display: "flex",
        gap: 16,
        background: "#fff",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 12,
          overflow: "hidden",
          background: "#f3f4f6",
          flexShrink: 0,
        }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.35,
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        {model ? (
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Model: {model}
          </div>
        ) : null}

        {price !== "" ? (
          <div
            style={{
              fontSize: 16,
              color: "#d97706",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {price}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#374151",
              width: 34,
              height: 34,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function LeadForm({
  title,
  subtitle,
  submitting,
  submitted,
  error,
  form,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div>
      {subtitle ? (
        <div
          style={{
            color: "#4b5563",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Name
          </div>
          <input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Your name"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Email
          </div>
          <input
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="you@example.com"
            type="email"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Message
          </div>
          <textarea
            value={form.note}
            onChange={(e) => onChange("note", e.target.value)}
            placeholder="Tell us what you need help with."
            rows={4}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {submitted ? (
        <div
          style={{
            marginTop: 14,
            color: "#166534",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          Thanks. Your message has been sent to our support team.
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onClose}
          type="button"
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            padding: "10px 16px",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          type="button"
          style={{
            border: "none",
            background: submitting ? "#9ca3af" : "#111827",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 12,
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {submitting ? "Sending..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

export default function SimpleChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [sessionId] = useState(() => createSessionId());

  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadFormReason, setLeadFormReason] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    note: "",
  });

  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);

  const bottomRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hasTriggeredIdleRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: "Welcome to CyberHome Support! How can we help you today?",
        createdAt: new Date().toISOString(),
        products: [],
        meta: {},
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const transcriptForLead = useMemo(() => {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      products: Array.isArray(m.products) ? m.products : [],
      meta: m.meta || {},
    }));
  }, [messages]);

  function resetIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (!idlePromptEnabled || hasTriggeredIdleRef.current) return;
    if (leadSubmitted) return;

    idleTimerRef.current = setTimeout(() => {
      hasTriggeredIdleRef.current = true;
      setLeadFormReason("idle_timeout");
      setLeadError("");
      setLeadSubmitted(false);
      setLeadFormOpen(true);
    }, IDLE_TIMEOUT_MS);
  }

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [idlePromptEnabled, leadSubmitted]);

  function touchActivity() {
    resetIdleTimer();
  }

  function openLeadForm(reason, presetNote = "") {
    setLeadFormReason(reason || "manual");
    setLeadError("");
    setLeadSubmitted(false);
    if (presetNote) {
      setLeadForm((prev) => ({
        ...prev,
        note: prev.note || presetNote,
      }));
    }
    setLeadFormOpen(true);
  }

  function closeLeadForm() {
    setLeadFormOpen(false);
  }

  function handleLeadFormChange(field, value) {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitLeadForm() {
    const safeName = sanitizeLeadText(leadForm.name, 200);
    const safeEmail = normalizeEmail(leadForm.email);
    const safeNote = sanitizeLeadText(leadForm.note, 3000);

    if (!safeEmail || !isValidEmail(safeEmail)) {
      setLeadError("Please enter a valid email address.");
      return;
    }

    setLeadSubmitting(true);
    setLeadError("");

    try {
      const resp = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: safeName,
          email: safeEmail,
          note: safeNote,
          transcript: transcriptForLead,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${leadFormReason || "manual"}`,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || "Lead submission failed");
      }

      setLeadSubmitted(true);
      setIdlePromptEnabled(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 99,
          role: "assistant",
          content:
            "Thank you. Your contact information has been received, and our colleague will follow up soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);

      setTimeout(() => {
        setLeadFormOpen(false);
      }, 900);
    } catch (error) {
      console.error("Lead submit error:", error);
      setLeadError("Sorry, we could not submit your message right now. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    touchActivity();

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      products: [],
      meta: {},
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        meta: m.meta || {},
      }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, sessionId }),
      });

      const data = await resp.json();

      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data?.response || "Sorry, I could not generate a response.",
        createdAt: new Date().toISOString(),
        products: Array.isArray(data?.products) ? data.products : [],
        meta: data?.meta || {},
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (data?.meta?.showContactForm || data?.meta?.handoffToHuman) {
        const fallbackNote =
          text && !leadForm.note
            ? `Customer asked: ${text}`
            : "";
        openLeadForm(
          data?.meta?.reason || "ai_handoff",
          fallbackNote
        );
      }
    } catch (error) {
      console.error("API error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "Sorry, service temporarily unavailable. Please leave your email and our colleague will follow up soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {
            showContactForm: true,
            handoffToHuman: true,
            reason: "frontend_fetch_error",
          },
        },
      ]);
      openLeadForm("frontend_fetch_error");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    touchActivity();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    touchActivity();
  }

  function handleEndChat() {
    touchActivity();
    openLeadForm("end_chat");
  }

  if (!mounted) return null;

  const leadTitle =
    leadFormReason === "idle_timeout"
      ? "Need more help?"
      : leadFormReason === "end_chat"
      ? "Before you leave"
      : "Leave your contact information";

  const leadSubtitle =
    leadFormReason === "idle_timeout"
      ? "If you'd like, leave your email and our support team can follow up with you."
      : leadFormReason === "end_chat"
      ? "You can leave your email here, and our colleague will follow up if needed."
      : "If the AI could not fully answer your question, please leave your email and our colleague will check and come back to you soon.";

  return (
    <>
      <div
        style={{
          maxWidth: 1080,
          margin: "24px auto",
          background: "#f9fafb",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            background: "#171717",
            color: "#fff",
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18 }}>CyberHome Support</div>
          <div
            style={{
              fontSize: 12,
              color: "#d1d5db",
              background: "#262626",
              border: "1px solid #404040",
              borderRadius: 999,
              padding: "6px 10px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            SimpleChat {SIMPLECHAT_VERSION}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            minHeight: 620,
            maxHeight: 760,
            overflowY: "auto",
            background: "#ededed",
          }}
          onMouseMove={touchActivity}
          onClick={touchActivity}
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div key={msg.id} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  {!isUser ? <Avatar role="assistant" /> : null}

                  <div style={{ maxWidth: "82%" }}>
                    <div
                      style={{
                        background: isUser ? "#2196f3" : "#fff",
                        color: isUser ? "#fff" : "#1f2937",
                        padding: "14px 16px",
                        borderRadius: 18,
                        fontSize: 16,
                        lineHeight: 1.5,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        marginTop: 6,
                        paddingLeft: isUser ? 0 : 8,
                        textAlign: isUser ? "right" : "left",
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </div>

                    {msg.role === "assistant" && msg.meta?.detailLink ? (
                      <DetailLinkButton
                        href={msg.meta.detailLink}
                        label={msg.meta.detailLinkLabel || "View Details"}
                      />
                    ) : null}

                    {msg.role === "assistant" &&
                    Array.isArray(msg.products) &&
                    msg.products.length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "inline-block",
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          Products Available
                        </div>

                        {msg.products.map((product, idx) => (
                          <ProductCard
                            key={product?.id || product?.handle || idx}
                            product={product}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {isUser ? <Avatar role="user" /> : null}
                </div>
              </div>
            );
          })}

          {loading ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>Thinking...</div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div
          style={{
            padding: 16,
            background: "#f3f4f6",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              onFocus={touchActivity}
              placeholder="Type your message..."
              rows={1}
              style={{
                flex: 1,
                resize: "vertical",
                minHeight: 52,
                borderRadius: 16,
                border: "1px solid #d1d5db",
                padding: "14px 16px",
                fontSize: 16,
                outline: "none",
              }}
            />

            <button
              onClick={handleEndChat}
              disabled={loading}
              style={{
                minWidth: 96,
                height: 52,
                borderRadius: 16,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: loading ? "#9ca3af" : "#374151",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                padding: "0 14px",
              }}
            >
              End Chat
            </button>

            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                border: "none",
                background: loading ? "#d1d5db" : "#9ca3af",
                color: "#fff",
                fontSize: 18,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              ↑
            </button>
          </div>

          <div
            style={{
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Enter to send
          </div>
        </div>
      </div>

      <Modal
        open={leadFormOpen}
        title={leadTitle}
        onClose={closeLeadForm}
      >
        <LeadForm
          title={leadTitle}
          subtitle={leadSubtitle}
          submitting={leadSubmitting}
          submitted={leadSubmitted}
          error={leadError}
          form={leadForm}
          onChange={handleLeadFormChange}
          onSubmit={submitLeadForm}
          onClose={closeLeadForm}
        />
      </Modal>
    </>
  );
}