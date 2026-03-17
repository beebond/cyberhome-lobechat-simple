import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V9.0";
const STORAGE_PREFIX = "cyberhome_simplechat_v9";
const IDLE_TIMEOUT_MS = 60 * 1000;
const DEFAULT_FALLBACK_TEXT =
  "As an AI assistant, I can’t answer this question accurately right now. Please email support@cyberhome.app or leave your message below, and our colleague will get back to you soon.";

// Put your actual logo files in /public and keep these paths,
// or replace them with your real CDN URLs.
const LOGO_LIGHT_URL = "/cyberhome-logo-light.png";
const LOGO_DARK_URL = "/cyberhome-logo-dark.png";

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

function formatDateDivider(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (sameDay) {
      return `Today · ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return `${d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
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

function sanitizeText(value, max = 3000) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function looksLikeFallbackText(text) {
  const value = String(text || "").toLowerCase();
  return [
    "as an ai assistant, i can't answer this question accurately right now",
    "as an ai assistant, i can’t answer this question accurately right now",
    "please leave your email",
    "our colleague will get back to you soon",
    "our colleague will reply soon",
    "作为 ai 助手",
    "请留下你的邮箱",
  ].some((pattern) => value.includes(pattern));
}

function fileToPreview(file) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    file,
    previewUrl: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
  };
}

function makeDateDivider(id, value) {
  return {
    id,
    role: "system",
    type: "date_divider",
    content: formatDateDivider(value),
    createdAt: value,
    products: [],
    attachments: [],
    meta: {},
  };
}

function BrandLogo({ size = 26, dark = false }) {
  const url = dark ? LOGO_DARK_URL : LOGO_LIGHT_URL;
  return (
    <img
      src={url}
      alt="CyberHome"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 8,
        flexShrink: 0,
      }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function RoleAvatar({ role }) {
  if (role === "user") return null;

  const label = role === "human" ? "Human" : "AI";
  const bg = role === "human" ? "#dbeafe" : "#111827";
  const color = role === "human" ? "#1d4ed8" : "#ffffff";

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border: role === "human" ? "1px solid #bfdbfe" : "1px solid #1f2937",
        flexShrink: 0,
        overflow: "hidden",
      }}
      title={label}
    >
      <BrandLogo size={20} dark={role !== "human"} />
      <span style={{ display: "none", color, fontSize: 11, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function HeaderButton({ onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function AttachmentChip({ item, onRemove, compact = false }) {
  if (!item) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "6px 8px" : "8px 10px",
        borderRadius: 12,
        border: "1px solid #d1d5db",
        background: "#fff",
        maxWidth: "100%",
      }}
    >
      {item.previewUrl ? (
        <img
          src={item.previewUrl}
          alt={item.name}
          style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          📎
        </div>
      )}
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            fontSize: 13,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 180,
          }}
        >
          {item.name}
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          ✕
        </button>
      ) : null}
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

  const title = product.title || "Product";
  const image = product.image || product.image_url || (Array.isArray(product.images) ? product.images[0] : "") || "";
  const price = product.price ?? "";
  const model = product.model || product.product_id || "";
  const url = buildProductUrl(product);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 14,
        marginTop: 12,
        display: "flex",
        gap: 14,
        background: "#fff",
      }}
    >
      <div
        style={{
          width: 86,
          height: 86,
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
            fontSize: 16,
            lineHeight: 1.35,
            marginBottom: 6,
            color: "#111827",
          }}
        >
          {title}
        </div>

        {model ? (
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Model: {model}
          </div>
        ) : null}

        {price !== "" ? (
          <div
            style={{
              fontSize: 15,
              color: "#d97706",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {price}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "9px 14px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-block",
              fontSize: 14,
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
  title,
  subtitle,
  submitting,
  submitted,
  error,
  form,
  attachments,
  onChange,
  onAttachment,
  onRemoveAttachment,
  onSubmit,
  onCancel,
}) {
  return (
    <div
      style={{
        marginTop: 12,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>{title}</div>

      {subtitle ? (
        <div
          style={{
            color: "#4b5563",
            fontSize: 14,
            lineHeight: 1.6,
            marginTop: 8,
            marginBottom: 14,
          }}
        >
          {subtitle}
        </div>
      ) : null}

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

        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>
            Attachment (optional)
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #d1d5db",
                background: "#fff",
                padding: "10px 14px",
                borderRadius: 12,
                cursor: "pointer",
                color: "#111827",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              📎 Add file
              <input
                type="file"
                multiple
                hidden
                onChange={onAttachment}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xlsx"
              />
            </label>
            {attachments?.map((item) => (
              <AttachmentChip key={item.id} item={item} onRemove={onRemoveAttachment} />
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, color: "#b91c1c", fontSize: 14 }}>{error}</div>
      ) : null}

      {submitted ? (
        <div
          style={{
            marginTop: 14,
            color: "#166534",
            background: "#dcfce7",
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
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
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
          type="button"
          onClick={onSubmit}
          disabled={submitting}
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

function RatingCard({ rating, feedback, onRate, onFeedback, onSubmit, onSkip, submitting, submitted }) {
  const icons = ["😞", "😐", "😶", "🙂", "😍"];
  return (
    <div
      style={{
        marginTop: 12,
        background: "#fff",
        border: "1px solid #dbeafe",
        boxShadow: "0 6px 20px rgba(37,99,235,0.08)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Please rate this conversation</div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 14, flexWrap: "wrap" }}>
        {icons.map((icon, idx) => {
          const val = idx + 1;
          const active = rating === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onRate(val)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
                background: active ? "#eff6ff" : "#fff",
                fontSize: 28,
                cursor: "pointer",
              }}
            >
              {icon}
            </button>
          );
        })}
      </div>
      <textarea
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
        rows={3}
        placeholder="Tell us more..."
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
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          onClick={onSkip}
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
          Skip
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || submitted || !rating}
          style={{
            border: "none",
            background: submitting || submitted || !rating ? "#9ca3af" : "#111827",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 12,
            cursor: submitting || submitted || !rating ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

function FloatingLauncher({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open CyberHome Support"
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        width: 64,
        height: 64,
        borderRadius: 999,
        border: "none",
        background: "linear-gradient(135deg, #111827 0%, #2563eb 100%)",
        color: "#fff",
        cursor: "pointer",
        boxShadow: "0 14px 32px rgba(17,24,39,0.28)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BrandLogo size={34} dark />
    </button>
  );
}

export default function SimpleChat() {
  const isBrowser = typeof window !== "undefined";
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionId] = useState(() => createSessionId());
  const [startedAt] = useState(() => new Date().toISOString());
  const [pendingAttachments, setPendingAttachments] = useState([]);

  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadForm, setLeadForm] = useState({ email: "", note: "" });
  const [leadAttachments, setLeadAttachments] = useState([]);

  const [showRatingCard, setShowRatingCard] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);
  const [lastFallbackReason, setLastFallbackReason] = useState("");

  const bottomRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hasTriggeredIdleRef = useRef(false);
  const leadFormOpenRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    const welcomeDate = new Date().toISOString();
    setMessages([
      makeDateDivider(`date_${Date.now()}`, welcomeDate),
      {
        id: 1,
        role: "assistant",
        content: "Hi, I’m CyberHome AI. Ask me anything about CyberHome appliances, shipping, usage, or support.",
        createdAt: welcomeDate,
        products: [],
        attachments: [],
        meta: {},
      },
    ]);

    const savedOpen = isBrowser ? window.localStorage.getItem(`${STORAGE_PREFIX}_open`) : "";
    if (savedOpen === "1") setIsOpen(true);
  }, [isBrowser]);

  useEffect(() => {
    if (!mounted || !isBrowser) return;
    window.localStorage.setItem(`${STORAGE_PREFIX}_open`, isOpen ? "1" : "0");
  }, [isOpen, mounted, isBrowser]);

  useEffect(() => {
    if (!mounted || !isBrowser) return;
    const transcript = JSON.stringify(
      messages
        .filter((m) => m.type !== "lead_form")
        .map((m) => ({
          role: m.role,
          type: m.type || "message",
          content: m.content,
          createdAt: m.createdAt,
          meta: m.meta || {},
          attachments: Array.isArray(m.attachments)
            ? m.attachments.map((a) => ({ name: a.name, type: a.type, size: a.size }))
            : [],
        }))
    );
    window.localStorage.setItem(`${STORAGE_PREFIX}_transcript_${sessionId}`, transcript);
  }, [messages, sessionId, mounted, isBrowser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen, showRatingCard]);

  const transcriptForLead = useMemo(() => {
    return messages
      .filter((m) => m.type !== "lead_form")
      .map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        products: Array.isArray(m.products) ? m.products : [],
        attachments: Array.isArray(m.attachments)
          ? m.attachments.map((a) => ({ name: a.name, type: a.type, size: a.size }))
          : [],
        meta: m.meta || {},
      }));
  }, [messages]);

  function resetIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!idlePromptEnabled || hasTriggeredIdleRef.current || leadSubmitted || !isOpen) return;

    idleTimerRef.current = setTimeout(() => {
      hasTriggeredIdleRef.current = true;
      injectLeadForm("idle_timeout");
    }, IDLE_TIMEOUT_MS);
  }

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [idlePromptEnabled, leadSubmitted, isOpen]);

  function touchActivity() {
    resetIdleTimer();
  }

  function removeExistingLeadForms() {
    leadFormOpenRef.current = false;
    setMessages((prev) => prev.filter((m) => m.type !== "lead_form"));
  }

  function injectLeadForm(reason, presetNote = "") {
    removeExistingLeadForms();
    setLeadSubmitting(false);
    setLeadError("");
    setLeadSubmitted(false);

    setLeadForm((prev) => ({
      email: prev.email || "",
      note: presetNote || prev.note || "",
    }));

    const formMessage = {
      id: `lead_${Date.now()}`,
      type: "lead_form",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      attachments: [],
      meta: {
        reason,
        showInlineLeadForm: true,
      },
    };

    leadFormOpenRef.current = true;
    setMessages((prev) => [...prev, formMessage]);
  }

  function dismissLeadForm() {
    setLeadSubmitting(false);
    setLeadError("");
    removeExistingLeadForms();
  }

  function handleLeadFormChange(field, value) {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function pushUserMessage(text, attachments = []) {
    const now = new Date().toISOString();
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: now,
      products: [],
      attachments,
      meta: {},
    };

    setMessages((prev) => {
      const next = [...prev.filter((m) => m.type !== "lead_form")];
      const lastDateDivider = [...next].reverse().find((m) => m.type === "date_divider");
      const needDivider =
        !lastDateDivider ||
        new Date(lastDateDivider.createdAt).toDateString() !== new Date(now).toDateString();

      if (needDivider) {
        next.push(makeDateDivider(`date_${Date.now()}`, now));
      }
      next.push(userMsg);
      return next;
    });
  }

  function appendAssistantMessage(data) {
    const aiText = String(data?.response || "Sorry, I could not generate a response.");
    const aiMsg = {
      id: Date.now() + 1,
      role: data?.meta?.source === "human" ? "human" : "assistant",
      content: aiText,
      createdAt: new Date().toISOString(),
      products: Array.isArray(data?.products) ? data.products : [],
      attachments: [],
      meta: {
        ...(data?.meta || {}),
        showContactForm: data?.showContactForm ?? data?.meta?.showContactForm ?? false,
        handoffToHuman: data?.handoffToHuman ?? data?.meta?.handoffToHuman ?? false,
        fallbackTriggered: data?.fallbackTriggered ?? data?.meta?.fallbackTriggered ?? false,
      },
    };

    setMessages((prev) => [...prev.filter((m) => m.type !== "lead_form"), aiMsg]);

    const shouldShowLeadForm =
      Boolean(data?.showContactForm) ||
      Boolean(data?.handoffToHuman) ||
      Boolean(data?.fallbackTriggered) ||
      Boolean(data?.meta?.showContactForm) ||
      Boolean(data?.meta?.handoffToHuman) ||
      Boolean(data?.meta?.fallbackTriggered);

    const looksLikeFallback = looksLikeFallbackText(aiText);
    if ((shouldShowLeadForm || looksLikeFallback) && !(Array.isArray(data?.products) && data.products.length > 0)) {
      const fallbackNote = aiText ? "" : `Customer asked: ${input.trim()}`;
      setLastFallbackReason(data?.meta?.reason || "ai_handoff");
      injectLeadForm(data?.meta?.reason || "ai_handoff", leadForm.note || fallbackNote);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || loading) return;

    touchActivity();
    const attachments = [...pendingAttachments];
    const textToSend = text || "[Attachment sent]";

    pushUserMessage(textToSend, attachments);
    setInput("");
    setPendingAttachments([]);
    setLoading(true);
    setIsOpen(true);

    try {
      const history = [...transcriptForLead, { role: "user", content: textToSend, attachments }];

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          sessionId,
          attachments: attachments.map((a) => ({ name: a.name, type: a.type, size: a.size })),
        }),
      });

      const data = await resp.json();
      appendAssistantMessage(data);
    } catch (error) {
      console.error("API error:", error);
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "lead_form"),
        {
          id: Date.now() + 1,
          role: "assistant",
          content: DEFAULT_FALLBACK_TEXT,
          createdAt: new Date().toISOString(),
          products: [],
          attachments: [],
          meta: { showContactForm: true, handoffToHuman: true, reason: "frontend_fetch_error" },
        },
      ]);

      setLastFallbackReason("frontend_fetch_error");
      if (!leadFormOpenRef.current) {
        injectLeadForm("frontend_fetch_error", `Customer asked: ${textToSend}`);
      }
    } finally {
      setLoading(false);
    }
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
          email: safeEmail,
          note: safeNote,
          transcript: transcriptForLead,
          attachments: leadAttachments.map((a) => ({ name: a.name, type: a.type, size: a.size })),
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${reason}`,
          submittedAt: new Date().toISOString(),
          fallbackReason: lastFallbackReason || reason,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || (data && data.ok === false)) {
        throw new Error(data?.error || "Lead submission failed");
      }

      setLeadSubmitted(true);
      setIdlePromptEnabled(false);
      removeExistingLeadForms();
      setLeadForm((prev) => ({ ...prev, note: "" }));
      setLeadAttachments([]);

      setMessages((prev) => [
        ...prev,
        {
          id: `lead_success_${Date.now()}`,
          role: "assistant",
          content: "Thank you. Your contact information has been received, and our colleague will get back to you soon.",
          createdAt: new Date().toISOString(),
          products: [],
          attachments: [],
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

  async function submitRating() {
    if (!rating || ratingSubmitting || ratingSubmitted) return;
    setRatingSubmitting(true);
    try {
      const resp = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating,
          feedback: sanitizeText(ratingFeedback, 1000),
          transcript: transcriptForLead,
          submittedAt: new Date().toISOString(),
        }),
      }).catch(() => null);

      if (resp && !resp.ok) throw new Error("Rating failed");
      setRatingSubmitted(true);
      setShowRatingCard(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `rating_thanks_${Date.now()}`,
          role: "assistant",
          content: "Thanks for your feedback.",
          createdAt: new Date().toISOString(),
          products: [],
          attachments: [],
          meta: {},
        },
      ]);
    } catch (e) {
      console.error(e);
      setShowRatingCard(false);
    } finally {
      setRatingSubmitting(false);
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

  function handlePendingAttachment(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const next = files.map(fileToPreview);
    setPendingAttachments((prev) => [...prev, ...next]);
    e.target.value = "";
    touchActivity();
  }

  function handleLeadAttachment(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const next = files.map(fileToPreview);
    setLeadAttachments((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removePendingAttachment(id) {
    setPendingAttachments((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function removeLeadAttachment(id) {
    setLeadAttachments((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function handleEndChat() {
    touchActivity();
    setShowRatingCard(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `end_${Date.now()}`,
        role: "system",
        type: "system_note",
        content: "Conversation ended.",
        createdAt: new Date().toISOString(),
        products: [],
        attachments: [],
        meta: {},
      },
    ]);
  }

  function addDateDividerIfNeeded(msg) {
    if (!msg?.createdAt) return false;
    const lastDivider = [...messages].reverse().find((m) => m.type === "date_divider");
    if (!lastDivider) return true;
    return new Date(lastDivider.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
  }

  useEffect(() => {
    return () => {
      [...pendingAttachments, ...leadAttachments].forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [pendingAttachments, leadAttachments]);

  if (!mounted) return null;

  const shellStyle = isExpanded
    ? {
        position: "fixed",
        inset: 16,
        maxWidth: 980,
        maxHeight: "calc(100vh - 32px)",
        margin: "auto",
        width: "calc(100vw - 32px)",
        height: "calc(100vh - 32px)",
      }
    : {
        position: "fixed",
        right: 22,
        bottom: 22,
        width: "min(420px, calc(100vw - 24px))",
        height: "min(760px, calc(100vh - 24px))",
      };

  return (
    <>
      {!isOpen ? <FloatingLauncher onOpen={() => setIsOpen(true)} /> : null}

      {isOpen ? (
        <div
          style={{
            ...shellStyle,
            zIndex: 99998,
            background: "#f9fafb",
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: "#111111",
              color: "#fff",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <BrandLogo size={28} dark />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>CyberHome Support</div>
                <div style={{ color: "#d1d5db", fontSize: 12, marginTop: 4 }}>
                  AI + Human assistance for products, shipping, and usage
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <HeaderButton onClick={() => setIsExpanded((v) => !v)} title={isExpanded ? "Restore size" : "Expand"}>
                {isExpanded ? "🗗" : "🗖"}
              </HeaderButton>
              <HeaderButton onClick={() => setIsOpen(false)} title="Minimize">
                −
              </HeaderButton>
              <HeaderButton
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                }}
                title="Close"
              >
                ✕
              </HeaderButton>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              padding: 18,
              overflowY: "auto",
              background: "#ededed",
            }}
            onMouseMove={touchActivity}
            onClick={touchActivity}
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              if (msg.type === "date_divider") {
                return (
                  <div key={msg.id} style={{ textAlign: "center", margin: "6px 0 18px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        color: "#6b7280",
                        fontSize: 13,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.78)",
                      }}
                    >
                      {msg.content}
                    </span>
                  </div>
                );
              }

              if (msg.type === "lead_form") {
                const reason = msg.meta?.reason || "manual";
                const title =
                  reason === "idle_timeout"
                    ? "Need more help?"
                    : reason === "end_chat"
                    ? "Before you leave"
                    : "Leave your contact information";

                const subtitle = DEFAULT_FALLBACK_TEXT;

                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                      <RoleAvatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineLeadForm
                          title={title}
                          subtitle={subtitle}
                          submitting={leadSubmitting}
                          submitted={leadSubmitted}
                          error={leadError}
                          form={leadForm}
                          attachments={leadAttachments}
                          onChange={handleLeadFormChange}
                          onAttachment={handleLeadAttachment}
                          onRemoveAttachment={removeLeadAttachment}
                          onSubmit={() => submitLeadForm(reason)}
                          onCancel={dismissLeadForm}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "system_note") {
                return (
                  <div key={msg.id} style={{ textAlign: "center", marginBottom: 20, color: "#6b7280", fontSize: 13 }}>
                    {msg.content}
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
                    {!isUser ? <RoleAvatar role={msg.role} /> : null}

                    <div style={{ maxWidth: isExpanded ? "72%" : "82%" }}>
                      {!isUser ? (
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, paddingLeft: 4 }}>
                          {msg.role === "human" ? "CyberHome Support" : "CyberHome AI"}
                        </div>
                      ) : null}

                      <div
                        style={{
                          background: isUser ? "#0ea5e9" : "#fff",
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

                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          {msg.attachments.map((att, idx) => (
                            <AttachmentChip key={att.id || `${msg.id}_${idx}`} item={att} compact />
                          ))}
                        </div>
                      ) : null}

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

                      {msg.role !== "user" && msg.meta?.detailLink ? (
                        <DetailLinkButton href={msg.meta.detailLink} label={msg.meta.detailLinkLabel || "View Details"} />
                      ) : null}

                      {msg.role !== "user" && Array.isArray(msg.products) && msg.products.length > 0 ? (
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

            {showRatingCard ? (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                  <RoleAvatar role="assistant" />
                  <div style={{ maxWidth: "82%", width: "82%" }}>
                    <RatingCard
                      rating={rating}
                      feedback={ratingFeedback}
                      onRate={setRating}
                      onFeedback={setRatingFeedback}
                      onSubmit={submitRating}
                      onSkip={() => setShowRatingCard(false)}
                      submitting={ratingSubmitting}
                      submitted={ratingSubmitted}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {loading ? <div style={{ color: "#6b7280", fontSize: 14 }}>Thinking...</div> : null}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: 14, background: "#f3f4f6", borderTop: "1px solid #e5e7eb" }}>
            {pendingAttachments.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {pendingAttachments.map((item) => (
                  <AttachmentChip key={item.id} item={item} onRemove={removePendingAttachment} compact />
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
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

              <label
                title="Add attachment"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                📎
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xlsx"
                  onChange={handlePendingAttachment}
                />
              </label>

              <button
                type="button"
                onClick={handleEndChat}
                disabled={loading}
                style={{
                  minWidth: 92,
                  height: 52,
                  borderRadius: 16,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: loading ? "#9ca3af" : "#374151",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  padding: "0 12px",
                }}
              >
                End Chat
              </button>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  border: "none",
                  background: loading ? "#d1d5db" : "#0ea5e9",
                  color: "#fff",
                  fontSize: 18,
                  cursor: loading ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>

            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
              Enter to send
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
