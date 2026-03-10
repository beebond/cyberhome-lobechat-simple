import { useEffect, useMemo, useRef, useState } from "react";

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
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ProductCard({ product }) {
  if (!product) return null;

  const title = product.title || "Product";
  const image = product.image || product.image_url || "";
  const price = product.price ?? "";
  const model = product.model || product.product_id || "";
  const url =
    product.url ||
    (product.handle ? `https://www.cyberhome.app/products/${product.handle}` : "#");

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

function ContactForm({
  visible,
  loading,
  submitted,
  form,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        marginTop: 14,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "#111827",
          marginBottom: 8,
        }}
      >
        Leave your contact
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#6b7280",
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        If the AI cannot fully solve your question, please leave your email and our
        colleague will follow up with you.
      </div>

      {submitted ? (
        <div
          style={{
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            padding: "12px 14px",
            borderRadius: 12,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Thank you. Your message has been submitted successfully.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Your name (optional)"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "12px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />

            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="Your email *"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "12px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />

            <textarea
              value={form.note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="Anything you'd like to add?"
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "12px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              onClick={onSubmit}
              disabled={loading}
              style={{
                border: "none",
                background: loading ? "#9ca3af" : "#111827",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 12,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#374151",
                padding: "10px 16px",
                borderRadius: 12,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SimpleChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);

  const [showContactForm, setShowContactForm] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    note: "",
  });

  const [sessionId] = useState(() => createSessionId());
  const [idleTriggered, setIdleTriggered] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());

  const bottomRef = useRef(null);
  const initializedRef = useRef(false);

  const transcript = useMemo(() => {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      products: Array.isArray(m.products) ? m.products : [],
      meta: m.meta || {},
    }));
  }, [messages]);

  function appendAssistantMessage(content, extra = {}) {
    const msg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      products: Array.isArray(extra.products) ? extra.products : [],
      meta: extra.meta || {},
    };

    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  function markActivity() {
    setLastActivityAt(Date.now());
    setIdleTriggered(false);
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

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
  }, [messages, loading, showContactForm]);

  useEffect(() => {
    if (!mounted || chatEnded || leadSubmitted) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastActivityAt;

      if (!loading && !idleTriggered && idleFor >= IDLE_TIMEOUT_MS) {
        appendAssistantMessage(
          "If you need further help, please leave your email and our colleague will reply soon.",
          {
            meta: {
              reason: "idle_timeout",
              showContactForm: true,
            },
          }
        );
        setLeadSubmitted(false);
        setShowContactForm(true);
        setIdleTriggered(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, loading, lastActivityAt, idleTriggered, chatEnded, leadSubmitted]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || chatEnded) return;

    markActivity();
    setLeadSubmitted(false);

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
        body: JSON.stringify({
          sessionId,
          message: text,
          history,
        }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      const aiContent =
        data?.response || "Sorry, I could not generate a response.";

      const aiProducts = Array.isArray(data?.products) ? data.products : [];
      const aiMeta = data?.meta || {};

      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: aiContent,
        createdAt: new Date().toISOString(),
        products: aiProducts,
        meta: aiMeta,
      };

      setMessages((prev) => [...prev, aiMsg]);

      const shouldShowContactForm =
        aiMeta?.showContactForm === true ||
        aiMeta?.fallbackTriggered === true ||
        aiMeta?.handoffToHuman === true ||
        aiMeta?.reason === "no_answer";

      if (shouldShowContactForm && !chatEnded) {
        setLeadSubmitted(false);
        setShowContactForm(true);
      }
    } catch (error) {
      console.error("API error:", error);

      const errMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "Sorry, service temporarily unavailable. Please leave your email and our colleague will follow up soon.",
        createdAt: new Date().toISOString(),
        products: [],
        meta: {
          reason: "service_unavailable",
          showContactForm: true,
        },
      };

      setMessages((prev) => [...prev, errMsg]);
      if (!chatEnded) {
        setLeadSubmitted(false);
        setShowContactForm(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitLead() {
    const email = (leadForm.email || "").trim();
    if (!email || leadSubmitting) return;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      window.alert("Please enter a valid email address.");
      return;
    }

    setLeadSubmitting(true);

    try {
      const resp = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: leadForm.name?.trim() || "",
          email,
          note: leadForm.note?.trim() || "",
          transcript,
          source: "simple_chat_v5",
          submittedAt: new Date().toISOString(),
        }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || "Lead submit failed");
      }

      setLeadSubmitted(true);
      setLeadForm({
        name: "",
        email: "",
        note: "",
      });

      appendAssistantMessage(
        "Thank you. We have received your contact information and our colleague will get back to you soon.",
        {
          meta: {
            reason: "lead_submitted",
          },
        }
      );
    } catch (error) {
      console.error("Lead submit error:", error);
      window.alert("Submission failed. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  function endChat() {
    if (chatEnded) return;

    appendAssistantMessage("Goodbye!", {
      meta: {
        reason: "chat_ended",
      },
    });

    setChatEnded(true);
    setShowContactForm(false);
    markActivity();
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function updateLeadForm(key, value) {
    setLeadForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  if (!mounted) return null;

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "24px auto",
        background: "#f9fafb",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
      onClick={markActivity}
      onKeyDownCapture={markActivity}
      onMouseMove={markActivity}
    >
      <div
        style={{
          background: "#171717",
          color: "#fff",
          padding: "18px 22px",
          fontWeight: 700,
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>CyberHome Support</div>

        <button
          onClick={endChat}
          disabled={chatEnded}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            background: chatEnded ? "#52525b" : "#27272a",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: chatEnded ? "not-allowed" : "pointer",
          }}
        >
          {chatEnded ? "Chat Ended" : "End Chat"}
        </button>
      </div>

      <div
        style={{
          padding: 20,
          minHeight: 620,
          maxHeight: 760,
          overflowY: "auto",
          background: "#ededed",
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  background: msg.role === "user" ? "#2196f3" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#1f2937",
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
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 6,
                paddingLeft: msg.role === "assistant" ? 8 : 0,
                textAlign: msg.role === "user" ? "right" : "left",
              }}
            >
              {formatTime(msg.createdAt)}
            </div>

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
        ))}

        <ContactForm
          visible={showContactForm && !chatEnded}
          loading={leadSubmitting}
          submitted={leadSubmitted}
          form={leadForm}
          onChange={updateLeadForm}
          onSubmit={submitLead}
          onClose={() => setShowContactForm(false)}
        />

        {loading ? (
          <div style={{ color: "#6b7280", fontSize: 14, marginTop: 10 }}>
            Thinking...
          </div>
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
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              markActivity();
            }}
            onKeyDown={onKeyDown}
            placeholder={chatEnded ? "Chat ended" : "Type your message..."}
            rows={1}
            disabled={chatEnded || loading}
            style={{
              flex: 1,
              resize: "vertical",
              minHeight: 52,
              borderRadius: 16,
              border: "1px solid #d1d5db",
              padding: "14px 16px",
              fontSize: 16,
              outline: "none",
              background: chatEnded ? "#e5e7eb" : "#fff",
              color: chatEnded ? "#6b7280" : "#111827",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading || chatEnded}
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              border: "none",
              background: loading || chatEnded ? "#d1d5db" : "#9ca3af",
              color: "#fff",
              fontSize: 18,
              cursor: loading || chatEnded ? "not-allowed" : "pointer",
              flexShrink: 0,
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
          {chatEnded ? "This conversation has ended" : "Enter to send"}
        </div>
      </div>
    </div>
  );
}