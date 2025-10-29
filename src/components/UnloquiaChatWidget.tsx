'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, MessageCircle, Sparkles, X } from "lucide-react";

type Message = {
  id: string;
  messageId?: string;
  sender: "user" | "bot";
  text: string;
  createdAt: string;
  pending?: boolean;
};

type MessagesPayload = {
  messages?: unknown[];
};

type UnloquiaChatWidgetProps = {
  clientId: string;
  userId?: string;
  title?: string;
  placeholder?: string;
};

const MAX_PENDING_CACHE = 10;
const POLL_INTERVAL_MS = 2000;
const DUPLICATE_WINDOW_MS = 30_000;
const toDisplayText = (value: unknown): string => {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("Failed to stringify message payload", error);
    return "";
  }
};

const normaliseRow = (row: any, index: number): Message | null => {
  if (!row || typeof row !== "object") {
    return null;
  }

  const roleValue =
    typeof row.role === "string"
      ? row.role.toLowerCase()
      : typeof row.message_role === "string"
      ? row.message_role.toLowerCase()
      : typeof row.direction === "string"
      ? row.direction.toLowerCase()
      : "";

  const sender: "user" | "bot" =
    roleValue === "bot" || roleValue === "assistant"
      ? "bot"
      : roleValue === "agent" || roleValue === "outbound"
      ? "bot"
      : "user";

  const rawText =
    row.text ??
    row.message ??
    (typeof row.body === "string" ? row.body : row.body?.text) ??
    (typeof row.content === "string" ? row.content : row.content?.text) ??
    row.payload?.text ??
    row.payload?.message;
  const text = toDisplayText(rawText).trim();
  if (!text) {
    return null;
  }

  const createdAtSource =
    row.created_at ??
    row.timestamp ??
    row.createdAt ??
    row.sent_at ??
    row.updated_at;
  const createdAt =
    typeof createdAtSource === "string"
      ? createdAtSource
      : new Date().toISOString();

  const messageId =
    typeof row.message_id === "string"
      ? row.message_id
      : typeof row.messageId === "string"
      ? row.messageId
      : undefined;

  const id =
    messageId ??
    `${sender}:${createdAt}:${text.slice(0, 32)}:${index.toString(16)}`;

  return {
    id,
    messageId,
    sender,
    text,
    createdAt,
    pending: false,
  };
};

const createMessageKey = (message: Message) =>
  message.messageId ??
  `${message.sender}:${message.createdAt}:${message.text}`;

const sortMessages = (a: Message, b: Message) => {
  const parsedA = Date.parse(a.createdAt);
  const parsedB = Date.parse(b.createdAt);
  const bothValid = !Number.isNaN(parsedA) && !Number.isNaN(parsedB);
  if (bothValid) {
    const delta = parsedA - parsedB;
    if (delta !== 0) {
      // If timestamps are within ±10s, keep the user's bubble ahead of the bot reply
      if (Math.abs(delta) <= 10_000 && a.sender !== b.sender) {
        return a.sender === "user" ? -1 : 1;
      }
      return delta;
    }
  }

  if (a.sender !== b.sender) {
    return a.sender === "user" ? -1 : 1;
  }

  if (a.messageId && b.messageId && a.messageId !== b.messageId) {
    return a.messageId.localeCompare(b.messageId);
  }

  return a.text.localeCompare(b.text);
};

export default function UnloquiaChatWidget({
  clientId,
  userId: externalUserId,
  title = "Let's chat",
  placeholder = "Type your message...",
}: UnloquiaChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const previousBotCountRef = useRef(0);
  const initialisedViewRef = useRef(false);
  const lastTimestampRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  useEffect(() => {
    const updateTheme = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const updateViewport = () => {
      setIsMobileView(window.matchMedia("(max-width: 640px)").matches);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!initialisedViewRef.current) {
      setIsOpen(!isMobileView);
      initialisedViewRef.current = true;
    }
  }, [isMobileView]);

  useEffect(() => {
    if (isMobileView) {
      document.body.style.overflow = isOpen ? "hidden" : "";
    }
    return () => {
      if (isMobileView) {
        document.body.style.overflow = "";
      }
    };
  }, [isMobileView, isOpen]);

  if (!externalUserId && sessionIdRef.current === null) {
    sessionIdRef.current = crypto.randomUUID();
  }

  const userId = useMemo(
    () => externalUserId ?? sessionIdRef.current,
    [externalUserId],
  );

  const fetchMessages = useCallback(async () => {
    if (!clientId || !userId) {
      return;
    }

    try {
      const params = new URLSearchParams({
        clientId,
        sessionId: userId,
        limit: "200",
      });
      if (lastTimestampRef.current) {
        params.set("since", lastTimestampRef.current);
      }

      const response = await fetch(`/api/unloquia-messages?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorPayload = await response.text().catch(() => "");
        console.error(
          "Failed to fetch landing messages",
          response.status,
          errorPayload,
        );
        return;
      }

      const payload = (await response
        .json()
        .catch(() => ({}))) as MessagesPayload;
      const rows: unknown[] = Array.isArray(payload?.messages)
        ? payload.messages
        : [];
      const normalised = rows
        .map((row, idx) => normaliseRow(row as any, idx))
        .filter((msg): msg is Message => Boolean(msg));

      let latestTimestamp = lastTimestampRef.current
        ? Date.parse(lastTimestampRef.current)
        : Number.NEGATIVE_INFINITY;

      setMessages((prev) => {
        const next = lastTimestampRef.current ? [...prev] : [];
        const seenKeys = lastTimestampRef.current
          ? new Set(next.map(createMessageKey))
          : new Set<string>();
        const botRecent = new Map<string, number>();
        for (const existing of next) {
          if (existing.sender !== "bot") {
            continue;
          }
          const ts = Date.parse(existing.createdAt);
          if (!Number.isNaN(ts)) {
            botRecent.set(existing.text, ts);
          }
        }

        if (!lastTimestampRef.current) {
          next.length = 0;
          seenKeys.clear();
        }

        for (const message of normalised) {
          if (message.sender === "bot") {
            const candidateTimestamp = Date.parse(message.createdAt);
            if (!Number.isNaN(candidateTimestamp)) {
              const lastSeen = botRecent.get(message.text);
              if (
                lastSeen !== undefined &&
                Math.abs(candidateTimestamp - lastSeen) <= DUPLICATE_WINDOW_MS
              ) {
                continue;
              }
            }
          }

          const key = createMessageKey(message);
          if (!seenKeys.has(key)) {
            next.push(message);
            seenKeys.add(key);
            if (message.sender === "bot") {
              const timestamp = Date.parse(message.createdAt);
              if (!Number.isNaN(timestamp)) {
                botRecent.set(message.text, timestamp);
              }
            }
          }
          const timestamp = Date.parse(message.createdAt);
          if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
          }
        }

        next.sort(sortMessages);
        return next;
      });

      if (latestTimestamp > Number.NEGATIVE_INFINITY) {
        lastTimestampRef.current = new Date(latestTimestamp).toISOString();
      }

      const userMessagesFromServer = normalised.filter((msg) => msg.sender === "user");
      if (userMessagesFromServer.length > 0) {
        const acknowledgedTexts = new Set(userMessagesFromServer.map((msg) => msg.text));
        setPendingMessages((prev) =>
          prev.filter((pendingMsg) => !acknowledgedTexts.has(pendingMsg.text)),
        );
      }
    } catch (error) {
      console.error("Failed to fetch landing messages", error);
    }
  }, [clientId, userId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      await fetchMessages();

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [fetchMessages]);

  const suggestions = useMemo(
    () => [
      "I'd like to automate my leads",
      "How does the WhatsApp bot integration work?",
      "Can I book a tailored demo?",
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || !userId) {
      return;
    }

    const trimmed = input.trim();
    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const pendingMessage: Message = {
      id: messageId,
      messageId,
      sender: "user",
      text: trimmed,
      createdAt,
      pending: true,
    };

    setPendingMessages((prev) => {
      const next = [...prev, pendingMessage];
      if (next.length > MAX_PENDING_CACHE) {
        return next.slice(next.length - MAX_PENDING_CACHE);
      }
      return next;
    });
    setInput("");
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/unloquia-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          messageId,
          userId,
          text: trimmed,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setPendingMessages((prev) =>
          prev.filter((msg) => msg.messageId !== messageId),
        );
        setErrorMessage(
          data?.error ?? "We couldn't send your message. Please try again.",
        );
        return;
      }

      await fetchMessages();
    } catch (error) {
      console.error("Failed to send landing message", error);
      setPendingMessages((prev) =>
        prev.filter((msg) => msg.messageId !== messageId),
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected network error.",
      );
    } finally {
      setLoading(false);
    }
  };

  const displayMessages = useMemo(() => {
    if (pendingMessages.length === 0) {
      return messages;
    }

    const combined = [...messages, ...pendingMessages];
    return combined.sort(sortMessages);
  }, [messages, pendingMessages]);

  const canSubmit = Boolean(input.trim() && userId && !loading);

  useEffect(() => {
    if (displayMessages.length === 0) {
      return;
    }

    const botMessages = displayMessages.filter(
      (message) => message.sender === "bot" && !message.pending,
    );

    if (!isOpen) {
      const delta = botMessages.length - previousBotCountRef.current;
      if (delta > 0) {
        setUnreadCount((prev) => prev + delta);
      }
    } else {
      setUnreadCount(0);
    }

    previousBotCountRef.current = botMessages.length;

    if (isOpen && autoScrollEnabled && messageContainerRef.current) {
      requestAnimationFrame(() => {
        messageContainerRef.current?.lastElementChild?.scrollIntoView({
          block: "end",
          behavior: "smooth",
        });
      });
    }
  }, [displayMessages, isOpen, autoScrollEnabled]);

  const toggleWidget = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadCount(0);
      }
      return next;
    });
  };

  const handleSuggestionClick = (value: string) => {
    setInput(value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const theme = useMemo(
    () =>
      isDarkMode
        ? {
            containerBg: "#0f172a",
            containerBorder: "rgba(148, 163, 184, 0.18)",
            containerShadow: "0 36px 90px rgba(8, 47, 73, 0.55)",
            headerBg: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            headerDivider: "rgba(37, 99, 235, 0.35)",
            headerText: "#f8fafc",
            headerCaption: "rgba(226, 232, 240, 0.75)",
            bodyBg: "#111827",
            emptyState: "rgba(203, 213, 225, 0.75)",
            userBubbleBg: "#2563eb",
            userBubbleText: "#f8fafc",
            botBubbleBg: "rgba(15, 23, 42, 0.9)",
            botBubbleText: "#e2e8f0",
            bubbleShadowUser: "0 10px 24px rgba(37, 99, 235, 0.35)",
            bubbleShadowBot: "0 14px 28px rgba(15, 23, 42, 0.45)",
            inputBg: "rgba(17, 24, 39, 0.95)",
            inputBorder: "rgba(148, 163, 184, 0.4)",
            inputText: "#e2e8f0",
            buttonActive: "#3b82f6",
            buttonDisabled: "rgba(75, 85, 99, 0.7)",
            divider: "rgba(148, 163, 184, 0.2)",
            errorBg: "rgba(127, 29, 29, 0.45)",
            errorText: "#fecaca",
            initializingText: "rgba(203, 213, 225, 0.7)",
          }
        : {
            containerBg: "#ffffff",
            containerBorder: "rgba(15, 23, 42, 0.12)",
            containerShadow: "0 30px 80px rgba(15, 23, 42, 0.18)",
            headerBg: "linear-gradient(135deg, #1e3a8a, #2563eb)",
            headerDivider: "rgba(37, 99, 235, 0.22)",
            headerText: "#ffffff",
            headerCaption: "rgba(255, 255, 255, 0.85)",
            bodyBg: "#f9fafb",
            emptyState: "#6b7280",
            userBubbleBg: "#2563eb",
            userBubbleText: "#ffffff",
            botBubbleBg: "#ffffff",
            botBubbleText: "#111827",
            bubbleShadowUser: "0 10px 20px rgba(37, 99, 235, 0.25)",
            bubbleShadowBot: "0 12px 24px rgba(15, 23, 42, 0.12)",
            inputBg: "#ffffff",
            inputBorder: "#d1d5db",
            inputText: "#111827",
            buttonActive: "#2563eb",
            buttonDisabled: "#9ca3af",
            divider: "#e5e7eb",
            errorBg: "#fef2f2",
            errorText: "#b91c1c",
            initializingText: "#6b7280",
          },
    [isDarkMode],
  );

  const panelHeight = isMobileView
    ? "min(75vh, 560px)"
    : "min(640px, calc(100vh - 4rem))";
  const panelWidth = isMobileView
    ? "min(100vw - 1.75rem, 360px)"
    : "min(400px, calc(100vw - 3rem))";

  const panelStyle: React.CSSProperties = {
    width: panelWidth,
    height: panelHeight,
    maxHeight: "calc(100vh - 4rem)",
    borderRadius: isMobileView ? "1.75rem" : "1.5rem",
    border: `1px solid ${theme.containerBorder}`,
    boxShadow: isMobileView
      ? "0 28px 120px rgba(15, 23, 42, 0.38)"
      : theme.containerShadow,
    backgroundColor: theme.containerBg,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "opacity 0.25s ease, transform 0.25s ease",
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
    pointerEvents: isOpen ? "auto" : "none",
  };

  return (
    <>
      {isMobileView && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            opacity: isOpen ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: isOpen ? "auto" : "none",
            zIndex: 55,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          bottom: isMobileView ? "1rem" : "1rem",
          right: isMobileView ? "auto" : "1.5rem",
          left: isMobileView ? "50%" : "auto",
          transform: isMobileView ? "translateX(-50%)" : "none",
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            pointerEvents: "auto",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.75rem",
          }}
        >
          <div style={panelStyle}>
            <header
              style={{
                padding: "1.25rem",
                paddingBottom: "1rem",
                borderBottom: `1px solid ${theme.headerDivider}`,
                background: theme.headerBg,
                color: theme.headerText,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.75rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    opacity: 0.85,
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Always online
                </div>
                <h2
                  style={{
                    margin: "0.35rem 0 0",
                    fontSize: "1.35rem",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h2>
                <p
                  style={{
                    margin: "0.35rem 0 0",
                    color: theme.headerCaption,
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                  }}
                >
                  Our team replies in minutes.
                </p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </header>

            <div
              ref={messageContainerRef}
              style={{
                flex: 1,
                minHeight: 0,
                backgroundColor: theme.bodyBg,
                padding: "1.25rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                overflowY: "auto",
              }}
              onScroll={(event) => {
                const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
                const atBottom = scrollHeight - (scrollTop + clientHeight) < 80;
                setAutoScrollEnabled(atBottom);
              }}
            >
              {displayMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: theme.emptyState,
                    fontSize: "0.95rem",
                    marginTop: "2rem",
                    lineHeight: 1.45,
                  }}
                >
                  Tell us how we can help and we'll get back to you shortly.
                </div>
              )}

              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf:
                      message.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor:
                      message.sender === "user"
                        ? theme.userBubbleBg
                        : theme.botBubbleBg,
                    color:
                      message.sender === "user"
                        ? theme.userBubbleText
                        : theme.botBubbleText,
                    padding: "0.85rem 1.05rem",
                    lineHeight: 1.4,
                    borderRadius:
                      message.sender === "user"
                        ? "1.15rem 1.15rem 0.35rem 1.15rem"
                        : "1.15rem 1.15rem 1.15rem 0.35rem",
                    boxShadow:
                      message.sender === "user"
                        ? theme.bubbleShadowUser
                        : theme.bubbleShadowBot,
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "0.95rem",
                    opacity: message.pending ? 0.75 : 1,
                  }}
                >
                  {message.text}
                  {message.pending && (
                    <span
                      style={{
                        display: "block",
                        marginTop: "0.4rem",
                        fontSize: "0.75rem",
                        opacity: 0.75,
                      }}
                    >
                      Sending…
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "0.75rem 1.5rem 0.5rem",
                borderTop: `1px solid ${theme.divider}`,
                backgroundColor: theme.bodyBg,
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    borderRadius: "9999px",
                    border: "none",
                    padding: "0.45rem 0.8rem",
                    fontSize: "0.78rem",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "#1d4ed8",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease, transform 0.2s",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor =
                      "rgba(37, 99, 235, 0.18)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor =
                      "rgba(37, 99, 235, 0.12)";
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.backgroundColor =
                      "rgba(37, 99, 235, 0.18)";
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.backgroundColor =
                      "rgba(37, 99, 235, 0.12)";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.75rem 1.5rem 1rem",
                borderTop: `1px solid ${theme.divider}`,
                backgroundColor: theme.inputBg,
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={placeholder}
                aria-label="Message"
                style={{
                  flex: 1,
                  borderRadius: "0.85rem",
                  border: `1px solid ${theme.inputBorder}`,
                  padding: "0.8rem 1rem",
                  fontSize: "0.95rem",
                  outline: "none",
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  transition: "border-color 0.2s ease",
                }}
                disabled={loading || !userId}
              />
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  borderRadius: "0.9rem",
                  backgroundColor: canSubmit
                    ? theme.buttonActive
                    : theme.buttonDisabled,
                  color: "#ffffff",
                  border: "none",
                  padding: "0.8rem 1.35rem",
                  fontWeight: 600,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  transition: "background-color 0.2s ease, transform 0.2s ease",
                }}
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </form>

            {errorMessage && (
              <p
                aria-live="polite"
                style={{
                  margin: 0,
                  padding: "0 1.5rem 1rem",
                  color: theme.errorText,
                  backgroundColor: theme.errorBg,
                  fontSize: "0.85rem",
                }}
              >
                {errorMessage}
              </p>
            )}

            {!userId && (
              <p
                style={{
                  margin: 0,
                  padding: "0 1.5rem 1rem",
                  color: theme.initializingText,
                  fontSize: "0.8rem",
                  textAlign: "center",
                }}
              >
                Warming up the chat…
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleWidget}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close chat" : "Open chat"}
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "9999px",
              border: "none",
              background:
                "linear-gradient(135deg, rgba(37, 99, 235, 1), rgba(59, 130, 246, 1))",
              color: "#ffffff",
              boxShadow: "0 20px 45px rgba(37, 99, 235, 0.35)",
              cursor: "pointer",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "scale(1)";
            }}
          >
            {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "8px",
                  minWidth: "22px",
                  height: "22px",
                  borderRadius: "9999px",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 0.35rem",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
