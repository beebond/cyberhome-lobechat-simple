import { useEffect, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V6.3";
const USER_AVATAR = "You";
const ASSISTANT_AVATAR = "AI";

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

function buildProductUrl(product) {
  if (!product) return "#";
  if (product.url) return product.url;
  if (product.handle) {
    return `https://www.cyberhome.app/products/${product.handle}`;
  }
  return "#";
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

export default function SimpleChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef(null);

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

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
        body: JSON.stringify({ message: text, history }),
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
    } catch (error) {
      console.error("API error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, service temporarily unavailable. Please try again.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
        <div style={{ display: "flex", gap: 12 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
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
  );
}
