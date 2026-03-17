import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V9.2.4-DS3";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const LOGO_URL = "data:image/png;base64,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";

const BRAND_BLUE = "#19a8e8";
const HEADER_BG = "#171717";
const SURFACE = "#f3f4f6";
const TEXT = "#1f2937";
const MUTED = "#6b7280";

// ... 所有辅助函数保持不变（formatTime, createSessionId, buildProductUrl, 等）...
// 请确保所有辅助函数（LogoBadge, Avatar, DetailLinkButton, MoreLinkButton, ProductCard, InlineLeadForm, InlineRatingPanel）的定义与之前完全相同，此处省略以节省篇幅，实际使用时请完整保留。

export default function SimpleChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionId] = useState(() => createSessionId());
  const [isOpen, setIsOpen] = useState(true);       // 组件自己控制打开/关闭
  const [isExpanded, setIsExpanded] = useState(false);

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
      // 安全检查：可限制来源域名
      // if (event.origin !== 'https://your-shopify-domain.com') return;
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
    // ... 保持原有逻辑
  }

  async function submitRatingPanel() {
    // ... 保持原有逻辑
  }

  async function sendMessage() {
    // ... 保持原有逻辑
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

  if (!mounted) return null;

  const hasOverlayPanel = messages.some((m) => m.type === "lead_form" || m.type === "rating_panel");

  return (
    <>
      {/* 悬浮按钮 - 仅在非 iframe 独立运行时显示。但在 iframe 内我们通过父页面控制，所以这里可以保留，但实际 iframe 中不会显示，因为 isOpen 控制窗口 */}
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

      {/* 聊天窗口 - 始终以固定定位显示，由 isOpen 控制显示隐藏 */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
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
                  // 先关闭自己
                  setIsOpen(false);
                  // 然后通知父页面隐藏 iframe 容器（如果有父页面）
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                      { source: "cyberhome-simplechat", type: "chat:minimize" },
                      "*" // 可替换为您的 Shopify 域名
                    );
                  }
                }}
                style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 24, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }}
              >
                −
              </button>
            </div>
          </div>

          {/* 消息区域 - 滚动 */}
          <div style={{ padding: 20, flex: 1, overflowY: "auto", background: "#ededed", minHeight: 0 }} onMouseMove={touchActivity} onClick={touchActivity}>
            {messages.map((msg) => {
              // ... 消息渲染逻辑保持不变 ...
              // 此处省略以节省篇幅，实际使用时请完整保留
            })}
            {loading ? <div style={{ color: MUTED, fontSize: 14 }}>Thinking...</div> : null}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入区域 - 固定 */}
          {!hasOverlayPanel && (
            <div style={{ padding: 16, background: SURFACE, borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
              {/* ... 输入框和按钮逻辑保持不变 ... */}
            </div>
          )}
        </div>
      )}
    </>
  );
}