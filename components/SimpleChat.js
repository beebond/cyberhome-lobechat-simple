import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V9.2.4-DS3";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const LOGO_URL = "https://cdn.shopify.com/s/files/1/0460/6066/7032/files/LOGO.png?v=1767935662"; // 替换为真实 CDN 地址
const BRAND_BLUE = "#19a8e8";
const HEADER_BG = "#171717";
const SURFACE = "#f3f4f6";
const TEXT = "#1f2937";
const MUTED = "#6b7280";

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
  if (product.handle) return `https://www.cyberhome.app/products/${product.handle}`;
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

function resolveDetailLink(meta) {
  if (!meta) return null;
  return (
    meta.detailLink ||
    meta.link ||
    meta.url ||
    meta.policyLink ||
    meta.blogLink ||
    meta.articleLink ||
    null
  );
}

function resolveDetailLabel(meta) {
  if (!meta) return "View Details";
  return (
    meta.detailLinkLabel ||
    meta.linkLabel ||
    meta.policyLinkLabel ||
    meta.blogLinkLabel ||
    meta.articleLinkLabel ||
    "View Details"
  );
}

function LogoBadge({ size = 24, rounded = 8 }) {
  return (
    <img
      src={LOGO_URL}
      alt="CyberHome"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        background: "#0b0f17",
      }}
    />
  );
}

function Avatar({ role }) {
  if (role === "user") return null;
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: "#111827",
        border: "1px solid #1f2937",
        overflow: "hidden",
      }}
      title="CyberHome AI"
    >
      <LogoBadge size={22} rounded={999} />
    </div>
  );
}

function DetailLinkButton({ href, label }) {
  if (!href) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "Arial, Helvetica, sans-serif",
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
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {label || "More products"}
      </a>
    </div>
  );
}

function ProductCard({ product }) {
  if (!product) return null;
  const title = product.title || "Product";
  const image = product.image || product.image_url || "";
  const model = product.model || product.product_id || "";
  const price = product.price ?? "";
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
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35, marginBottom: 6 }}>{title}</div>
        {model ? <div style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>Model: {model}</div> : null}
        {price !== "" ? <div style={{ fontSize: 16, color: "#d97706", fontWeight: 700, marginBottom: 12 }}>{price}</div> : null}
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
            fontWeight: 700,
            display: "inline-block",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          View Details
        </a>
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
}) {
  return (
    <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Name</div>
          <input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Your name"
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Email</div>
          <input
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="you@example.com"
            type="email"
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Message</div>
          <textarea
            value={form.note}
            onChange={(e) => onChange("note", e.target.value)}
            placeholder="Tell us what you need help with."
            rows={4}
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}>
          {error}
        </div>
      ) : null}

      {submitted ? (
        <div style={{ marginTop: 14, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}>
          Thanks. Your message has been sent to our support team.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, marginTop: 16 }}>
        <label
          style={{
            height: 52,
            borderRadius: 16,
            border: "1px solid #d1d5db",
            background: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          📎
          <input type="file" hidden />
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
              padding: "0 14px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Cancel
          </button>
        ) : <div />}

        <button
          onClick={onSubmit}
          disabled={submitting}
          type="button"
          style={{
            border: "none",
            background: submitting ? "#9ca3af" : BRAND_BLUE,
            color: "#fff",
            height: 52,
            width: 52,
            borderRadius: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 20,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

function InlineRatingPanel({ rating, feedback, onRatingChange, onFeedbackChange, onSubmit, onCancel }) {
  const options = ["😞", "😐", "🙂", "😊", "😍"];
  return (
    <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Please rate the conversation</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {options.map((emoji, idx) => {
          const active = rating === idx + 1;
          return (
            <button
              key={emoji}
              onClick={() => onRatingChange(idx + 1)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                border: active ? `2px solid ${BRAND_BLUE}` : "1px solid #d1d5db",
                background: "#fff",
                fontSize: 24,
                cursor: "pointer",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="Your feedback..."
        rows={4}
        style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, marginTop: 16 }}>
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
            padding: "0 14px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          type="button"
          style={{
            border: "none",
            background: BRAND_BLUE,
            color: "#fff",
            height: 52,
            width: 52,
            borderRadius: 16,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 20,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          ↑
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
  const [keyboardOffset, setKeyboardOffset] = useState(0); // 新增状态，用于记录键盘高度

  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadForm, setLeadForm] = useState({ name: "", email: "", note: "" });

  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");

  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);

  const bottomRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hasTriggeredIdleRef = useRef(false);

  // 监听父页面发来的 open 消息（当用户点击悬浮按钮时）
  useEffect(() => {
    const handleMessage = (event) => {
      // 可选择性添加来源检查： if (event.origin !== 'https://your-shopify-domain.com') return;
      const data = event.data || {};
      if (data.source === 'cyberhome-simplechat' && data.type === 'chat:open') {
        setIsOpen(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
  }, [messages, loading, showRatingPanel]);

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
      if (!messages.some((m) => m.type === "lead_form" || m.type === "rating_panel")) {
        hasTriggeredIdleRef.current = true;
        injectRatingPanel("idle_timeout");
      }
    }, IDLE_TIMEOUT_MS);
  }

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [idlePromptEnabled, leadSubmitted, messages]);

  function touchActivity() {
    resetIdleTimer();
  }

  function removeExistingLeadForms() {
    setMessages((prev) => prev.filter((m) => m.type !== "lead_form"));
  }

  function removeExistingRatingPanels() {
    setMessages((prev) => prev.filter((m) => m.type !== "rating_panel"));
  }

  function injectLeadForm(reason, presetNote = "") {
    removeExistingLeadForms();
    removeExistingRatingPanels();
    setShowRatingPanel(false);
    setLeadError("");
    setLeadSubmitted(false);
    if (presetNote) {
      setLeadForm((prev) => ({ ...prev, note: prev.note || presetNote }));
    }
    const formMessage = {
      id: `lead_${Date.now()}`,
      type: "lead_form",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: { reason, showInlineLeadForm: true },
    };
    setMessages((prev) => [...prev, formMessage]);
  }

  function injectRatingPanel(reason = "idle_timeout") {
    removeExistingLeadForms();
    removeExistingRatingPanels();
    setShowRatingPanel(true);
    const ratingMessage = {
      id: `rating_${Date.now()}`,
      type: "rating_panel",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: { reason, showInlineRatingPanel: true },
    };
    setMessages((prev) => [...prev, ratingMessage]);
  }

  function dismissLeadForm() {
    removeExistingLeadForms();
  }

  function dismissRatingPanel() {
    setShowRatingPanel(false);
    removeExistingRatingPanels();
  }

  function handleLeadFormChange(field, value) {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitLeadForm(reason = "manual") {
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
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${reason}`,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.error || "Lead submission failed");

      setLeadSubmitted(true);
      setIdlePromptEnabled(false);
      removeExistingLeadForms();

      setMessages((prev) => [
        ...prev,
        {
          id: `lead_success_${Date.now()}`,
          role: "assistant",
          content: "Thank you. Your contact information has been received, and our colleague will follow up soon.",
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

  async function submitRatingPanel() {
    try {
      await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: ratingValue || 5,
          feedback: ratingFeedback,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_idle`,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          submittedAt: new Date().toISOString(),
          transcript: transcriptForLead,
        }),
      });
    } catch (e) {
      console.error("rating submit error", e);
    } finally {
      dismissRatingPanel();
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

    const nextMessages = [...messages.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"), userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages.map((m) => ({ role: m.role, content: m.content, meta: m.meta || {} }));

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
          showContactForm: data?.showContactForm ?? data?.meta?.showContactForm ?? false,
          handoffToHuman: data?.handoffToHuman ?? data?.meta?.handoffToHuman ?? false,
          fallbackTriggered: data?.fallbackTriggered ?? data?.meta?.fallbackTriggered ?? false,
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
        aiText.includes("As an AI assistant, I can't answer this question accurately right now.");

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
      const disallowedHit = disallowedNoAnswerPatterns.some((p) => lowerAiText.includes(p));

      if (shouldShowLeadForm || looksLikeFallback || disallowedHit) {
        const fallbackNote = text && !leadForm.note ? `Customer asked: ${text}` : "";
        injectLeadForm(data?.meta?.reason || "ai_handoff", fallbackNote);
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
          meta: { showContactForm: true, handoffToHuman: true, reason: "frontend_fetch_error" },
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
    injectRatingPanel("end_chat");
  }

  // 监听 visualViewport 变化，获取键盘高度（移动端优化）
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewport.height;
        if (keyboardHeight > 0) {
          setKeyboardOffset(keyboardHeight);
        } else {
          setKeyboardOffset(0);
        }
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) return null;

  const hasOverlayPanel = messages.some((m) => m.type === "lead_form" || m.type === "rating_panel");

  return (
    <>
      {/* 悬浮按钮 - 仅在独立模式且窗口关闭时显示 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 2147483646,
            height: 56,
            border: "none",
            borderRadius: 999,
            background: BRAND_BLUE,
            boxShadow: "0 16px 38px rgba(0,0,0,.18)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 18px 0 12px",
            color: "white",
            fontWeight: 800,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <LogoBadge size={24} rounded={8} />
          <span style={{ fontSize: 16, lineHeight: 1 }}>CHAT</span>
        </button>
      )}

      {/* 聊天窗口 - 始终固定定位，由 isOpen 控制显示隐藏 */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: `calc(18px + ${keyboardOffset}px)`, // 动态上移避免键盘遮挡
            width: isExpanded ? "min(1100px, calc(100vw - 40px))" : "min(430px, calc(100vw - 24px))",
            height: isExpanded ? "min(920px, calc(100dvh - 40px))" : "min(820px, calc(100dvh - 24px))",
            maxWidth: "calc(100vw - 24px)",
            background: "#f9fafb",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            boxShadow: "0 24px 60px rgba(0,0,0,.24)",
            zIndex: 2147483645,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, Helvetica, sans-serif",
            transition: "bottom 0.1s ease-out", // 平滑动画
          }}
        >
          {/* 头部 - 固定 */}
          <div style={{ background: HEADER_BG, color: "#fff", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoBadge size={24} rounded={8} />
              <div style={{ fontWeight: 700, fontSize: 18 }}>CyberHome Support</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 22, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }}
              >
                {isExpanded ? "❐" : "▢"}
              </button>
              <button
                onClick={() => {
                  // 关闭自己
                  setIsOpen(false);
                  // 通知父页面隐藏 iframe 容器（如果在 iframe 内）
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                      { source: "cyberhome-simplechat", type: "chat:minimize" },
                      "*" // 生产环境可替换为您的 Shopify 域名
                    );
                  }
                }}
                style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 24, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }}
              >
                −
              </button>
            </div>
          </div>

          {/* 消息区域 - 可滚动 */}
          <div style={{ padding: 20, flex: 1, overflowY: "auto", background: "#ededed", minHeight: 0 }} onMouseMove={touchActivity} onClick={touchActivity}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              if (msg.type === "lead_form") {
                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineLeadForm
                          submitting={leadSubmitting}
                          submitted={leadSubmitted}
                          error={leadError}
                          form={leadForm}
                          onChange={handleLeadFormChange}
                          onSubmit={() => submitLeadForm(msg.meta?.reason || "manual")}
                          onCancel={dismissLeadForm}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "rating_panel") {
                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineRatingPanel
                          rating={ratingValue}
                          feedback={ratingFeedback}
                          onRatingChange={setRatingValue}
                          onFeedbackChange={setRatingFeedback}
                          onSubmit={submitRatingPanel}
                          onCancel={dismissRatingPanel}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              const detailLink = resolveDetailLink(msg.meta);
              const detailLabel = resolveDetailLabel(msg.meta);

              return (
                <div key={msg.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
                    {!isUser ? <Avatar role="assistant" /> : null}
                    <div style={{ maxWidth: "82%" }}>
                      <div
                        style={{
                          background: isUser ? "#2196f3" : "#fff",
                          color: isUser ? "#fff" : TEXT,
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

                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, paddingLeft: isUser ? 0 : 8, textAlign: isUser ? "right" : "left" }}>
                        {formatTime(msg.createdAt)}
                      </div>

                      {msg.role === "assistant" && detailLink ? <DetailLinkButton href={detailLink} label={detailLabel} /> : null}

                      {msg.role === "assistant" && Array.isArray(msg.products) && msg.products.length > 0 ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                            Products Available
                          </div>
                          {msg.products.map((product, idx) => (
                            <ProductCard key={product?.id || product?.handle || idx} product={product} />
                          ))}
                          <MoreLinkButton href={msg.meta?.moreLink} label={msg.meta?.moreLinkLabel || "More products"} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading ? <div style={{ color: MUTED, fontSize: 14 }}>Thinking...</div> : null}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入区域 - 固定，仅当无覆盖面板时显示 */}
          {!hasOverlayPanel && (
            <div style={{ padding: 16, background: SURFACE, borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                onFocus={touchActivity}
                placeholder="Type your message..."
                rows={1}
                style={{ width: "100%", resize: "vertical", minHeight: 52, borderRadius: 16, border: "1px solid #d1d5db", padding: "14px 16px", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, alignItems: "stretch", marginTop: 10 }}>
                <label
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  📎
                  <input type="file" hidden onChange={() => {}} />
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
                    fontFamily: "Arial, Helvetica, sans-serif",
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
                    background: loading ? "#d1d5db" : BRAND_BLUE,
                    color: "#fff",
                    fontSize: 18,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}