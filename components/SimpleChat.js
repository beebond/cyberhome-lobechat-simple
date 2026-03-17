import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V9.2";
const USER_AVATAR = "You";
const ASSISTANT_AVATAR = "AI";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

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

function MoreLinkButton({ href, label }) {
  if (!href) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          background: "#111827",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
        }}
      >
        {label || "More"}
      </a>
    </div>
  );
}

function ProductCard({ product }) {
  if (!product) return null;

  const title = product.title || product.name || "Product";
  const model = product.model || product.sku || "";
  const image =
    product.image ||
    product.image_url ||
    product.featured_image ||
    product.thumbnail ||
    "";
  const href = buildProductUrl(product);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 12,
        marginTop: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          overflow: "hidden",
          background: "#f3f4f6",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>No image</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          {title}
        </div>

        {model ? (
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 4,
              wordBreak: "break-word",
            }}
          >
            Model: {model}
          </div>
        ) : null}

        <div style={{ marginTop: 10 }}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );
}

function InlineLeadForm({
  submitting,
  submitted,
  error,
  form,
  onChange,
  onSubmit,
  onCancel,
  onAttach,
}) {
  return (
    <div
      style={{
        marginTop: 12,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>
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
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>
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
          display: "grid",
          gridTemplateColumns: "58px 1fr 58px",
          gap: 10,
          marginTop: 16,
        }}
      >
        <label
          style={{
            height: 52,
            borderRadius: 16,
            border: "1px solid #d1d5db",
            background: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 24,
          }}
          title="Add attachment"
        >
          📎
          <input type="file" hidden onChange={onAttach} />
        </label>

        {onCancel ? (
          <button
            onClick={onCancel}
            type="button"
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#374151",
              height: 52,
              borderRadius: 16,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Cancel
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onSubmit}
          disabled={submitting}
          type="button"
          style={{
            border: "none",
            background: submitting ? "#9ca3af" : "#111827",
            color: "#fff",
            height: 52,
            borderRadius: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          {submitting ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}

function InlineRatingPanel({
  rating,
  feedback,
  onRatingChange,
  onFeedbackChange,
  onSubmit,
  onCancel,
  submitting,
}) {
  const faces = ["😞", "😐", "🙂", "😊", "😍"];

  return (
    <div
      style={{
        marginTop: 12,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {faces.map((face, idx) => {
          const active = rating === idx + 1;
          return (
            <button
              key={face}
              onClick={() => onRatingChange(idx + 1)}
              type="button"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                fontSize: 22,
              }}
            >
              {face}
            </button>
          );
        })}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="Your feedback..."
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "58px 1fr 58px",
          gap: 10,
          marginTop: 16,
        }}
      >
        <div />
        <button
          onClick={onCancel}
          type="button"
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            height: 52,
            borderRadius: 16,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 15,
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
            height: 52,
            borderRadius: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          {submitting ? "…" : "↑"}
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
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    note: "",
  });

  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingText, setRatingText] = useState("");
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
  }, [messages, loading, ratingVisible]);

  const transcriptForLead = useMemo(() => {
    return messages
      .filter((m) => m.type !== "lead_form" && m.type !== "rating_panel")
      .map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        products: Array.isArray(m.products) ? m.products : [],
        meta: m.meta || {},
      }));
  }, [messages]);

  function resetIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!idlePromptEnabled || hasTriggeredIdleRef.current || leadSubmitted) return;

    idleTimerRef.current = setTimeout(() => {
      hasTriggeredIdleRef.current = true;
      injectRatingPanel("idle_timeout");
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

  function removeExistingLeadForms() {
    setMessages((prev) => prev.filter((m) => m.type !== "lead_form"));
  }

  function removeExistingRatings() {
    setMessages((prev) => prev.filter((m) => m.type !== "rating_panel"));
  }

  function injectLeadForm(reason, presetNote = "") {
    removeExistingLeadForms();
    removeExistingRatings();
    setLeadError("");
    setLeadSubmitted(false);
    setRatingVisible(false);

    if (presetNote) {
      setLeadForm((prev) => ({
        ...prev,
        note: prev.note || presetNote,
      }));
    }

    const formMessage = {
      id: `lead_${Date.now()}`,
      type: "lead_form",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: {
        reason,
        showInlineLeadForm: true,
      },
    };

    setMessages((prev) => [...prev, formMessage]);
  }

  function injectRatingPanel(reason = "idle_timeout") {
    removeExistingLeadForms();
    removeExistingRatings();
    setRatingVisible(true);

    const ratingMessage = {
      id: `rating_${Date.now()}`,
      type: "rating_panel",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: { reason, showInlineRating: true },
    };

    setMessages((prev) => [...prev, ratingMessage]);
  }

  function dismissLeadForm() {
    removeExistingLeadForms();
  }

  function dismissRatingPanel() {
    setRatingVisible(false);
    removeExistingRatings();
  }

  function handleLeadFormChange(field, value) {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitLeadForm(reason = "manual") {
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
          name: "",
          email: safeEmail,
          note: safeNote,
          transcript: transcriptForLead,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${reason}`,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || "Lead submission failed");
      }

      setLeadSubmitted(true);
      setIdlePromptEnabled(false);
      removeExistingLeadForms();

      setMessages((prev) => [
        ...prev,
        {
          id: `lead_success_${Date.now()}`,
          role: "assistant",
          content:
            "Thank you. Your contact information has been received, and our colleague will follow up soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);
    } catch (error) {
      console.error("Lead submit error:", error);
      setLeadError("Sorry, we could not submit your message right now. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  async function submitRating(reason = "idle_timeout") {
    if (!ratingValue) {
      return;
    }

    setRatingSubmitting(true);

    try {
      const resp = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: ratingValue,
          feedback: sanitizeLeadText(ratingText, 2000),
          transcript: transcriptForLead,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${reason}`,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || "Rating submission failed");
      }

      removeExistingRatings();
      setRatingVisible(false);
      setIdlePromptEnabled(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `rating_success_${Date.now()}`,
          role: "assistant",
          content: "Thanks for your feedback.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);
    } catch (error) {
      console.error("Rating submit error:", error);
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    touchActivity();
    removeExistingRatings();

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      products: [],
      meta: {},
    };

    const nextMessages = [...messages.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"), userMsg];
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
        meta: {
          ...(data?.meta || {}),
          showContactForm:
            data?.showContactForm ??
            data?.meta?.showContactForm ??
            false,
          handoffToHuman:
            data?.handoffToHuman ??
            data?.meta?.handoffToHuman ??
            false,
          fallbackTriggered:
            data?.fallbackTriggered ??
            data?.meta?.fallbackTriggered ??
            false,
        },
      };

      setMessages((prev) => [...prev.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"), aiMsg]);

      const aiText = String(data?.response || "");
      const shouldShowLeadForm =
        Boolean(data?.showContactForm) ||
        Boolean(data?.handoffToHuman) ||
        Boolean(data?.fallbackTriggered) ||
        Boolean(data?.meta?.showContactForm) ||
        Boolean(data?.meta?.handoffToHuman) ||
        Boolean(data?.meta?.fallbackTriggered);

      const looksLikeFallback =
        aiText.includes(
          "As an AI assistant, I can't answer this question accurately right now."
        );

      const disallowedNoAnswerPatterns = [
        "we do not sell",
        "we don't sell",
        "i don't have information",
        "not available",
        "cannot find",
        "sorry, but",
        "sorry but",
      ];

      const lowerAiText = aiText.toLowerCase();
      const disallowedHit = disallowedNoAnswerPatterns.some((p) =>
        lowerAiText.includes(p)
      );

      if (shouldShowLeadForm || looksLikeFallback || disallowedHit) {
        const fallbackNote = `Customer asked: ${text}`;
        injectLeadForm(
          data?.meta?.reason || "ai_handoff",
          fallbackNote
        );
      }
    } catch (error) {
      console.error("API error:", error);

      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"),
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "As an AI assistant, I can't answer this question accurately right now. Please email support@cyberhome.app or fill in the feedback form below, and our colleague will get back to you soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {
            showContactForm: true,
            handoffToHuman: true,
            reason: "frontend_fetch_error",
          },
        },
      ]);

      injectLeadForm("frontend_fetch_error");
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
    injectLeadForm("end_chat");
  }

  if (!mounted) return null;

  return (
    <>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 9999,
            height: 56,
            border: "none",
            borderRadius: 999,
            background: "#19a8e8",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "0 18px 0 12px",
            cursor: "pointer",
            boxShadow: "0 16px 38px rgba(0,0,0,.18)",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: "#111827",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <span>CHAT</span>
        </button>
      ) : null}

      {isOpen ? (
        <div
          style={{
            maxWidth: isExpanded ? 1080 : 760,
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

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                }}
                aria-label="Expand"
              >
                {isExpanded ? "❐" : "▢"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                }}
                aria-label="Minimize"
              >
                −
              </button>
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

              if (msg.type === "lead_form") {
                const reason = msg.meta?.reason || "manual";

                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineLeadForm
                          submitting={leadSubmitting}
                          submitted={leadSubmitted}
                          error={leadError}
                          form={leadForm}
                          onChange={handleLeadFormChange}
                          onSubmit={() => submitLeadForm(reason)}
                          onCancel={dismissLeadForm}
                          onAttach={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "rating_panel") {
                const reason = msg.meta?.reason || "idle_timeout";
                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineRatingPanel
                          rating={ratingValue}
                          feedback={ratingText}
                          onRatingChange={setRatingValue}
                          onFeedbackChange={setRatingText}
                          onSubmit={() => submitRating(reason)}
                          onCancel={dismissRatingPanel}
                          submitting={ratingSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

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

                          <MoreLinkButton
                            href={msg.meta?.moreLink}
                            label={msg.meta?.moreLinkLabel || "More"}
                          />
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

          {!showLeadForm && !ratingVisible ? (
            <div
              style={{
                padding: 16,
                background: "#f3f4f6",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={onKeyDown}
                  onFocus={touchActivity}
                  placeholder="Type your message..."
                  rows={2}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    minHeight: 72,
                    borderRadius: 16,
                    border: "1px solid #d1d5db",
                    padding: "14px 16px",
                    fontSize: 16,
                    outline: "none",
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10 }}>
                  <label
                    style={{
                      height: 52,
                      borderRadius: 16,
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 24,
                    }}
                  >
                    📎
                    <input type="file" hidden onChange={onAttach} />
                  </label>

                  <button
                    onClick={handleEndChat}
                    disabled={loading}
                    style={{
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
                      borderRadius: 16,
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
          ) : null}
        </div>
      ) : null}
    </>
  );
}
