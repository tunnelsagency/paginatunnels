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
  sender: "user" | "bot";
  text: string;
  createdAt?: string;
  pending?: boolean;
  sequence?: number;
};

type UnloquiaChatWidgetProps = {
  clientId: string;
  userId?: string;
  title?: string;
  placeholder?: string;
};

const USER_STORAGE_KEY = "unloquia-chat-user-id";
const POLL_INTERVAL_MS = 2000;

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

const messageKey = (message: Message) =>
  `${message.sender}:${message.createdAt ?? message.id}`;

const compareMessages = (a: Message, b: Message) => {
  const parsedA = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
  const parsedB = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
  const hasA = !Number.isNaN(parsedA);
  const hasB = !Number.isNaN(parsedB);

  if (hasA && hasB) {
    if (parsedA !== parsedB) {
      return parsedA - parsedB;
    }
    if (a.sender !== b.sender) {
      return a.sender === "user" ? -1 : 1;
    }
    const seqA = a.sequence ?? Number.NaN;
    const seqB = b.sequence ?? Number.NaN;
    if (!Number.isNaN(seqA) && !Number.isNaN(seqB) && seqA !== seqB) {
      return seqA - seqB;
    }
    return a.id.localeCompare(b.id);
  }

  if (hasA) {
    return -1;
  }

  if (hasB) {
    return 1;
  }

  return a.id.localeCompare(b.id);
};

export default function UnloquiaChatWidget({
  clientId,
  userId: externalUserId,
  title = "Conversemos",
  placeholder = "Escribí tu mensaje...",
}: UnloquiaChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const initialisedViewRef = useRef(false);
  const previousBotCountRef = useRef(0);

  const seenMessagesRef = useRef<Set<string>>(new Set());
  const lastMessageAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (externalUserId) {
      setStoredUserId(externalUserId);
      return;
    }

    const existing =
      typeof window !== "undefined"
        ? window.localStorage.getItem(USER_STORAGE_KEY)
        : null;

    if (existing) {
      setStoredUserId(existing);
      return;
    }

    const generated = generateId();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_STORAGE_KEY, generated);
    }
    setStoredUserId(generated);
  }, [externalUserId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.classList.contains("dark"));
    updateTheme();

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(updateTheme)
        : null;

    observer?.observe(root, { attributes: true, attributeFilter: ["class"] });

    const updateViewport = () => {
      if (typeof window === "undefined") return;
      const matches = window.matchMedia("(max-width: 640px)").matches;
      setIsMobileView(matches);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      observer?.disconnect();
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

  const userId = useMemo(
    () => externalUserId ?? storedUserId,
    [externalUserId, storedUserId],
  );

  const theme = useMemo(
    () =>
      isDarkMode
        ? {
            containerBg: "#0f172a",
            containerBorder: "rgba(148, 163, 184, 0.18)",
            containerShadow: "0 36px 90px rgba(8, 47, 73, 0.55)",
            headerBg: "linear-gradient(135deg, #1e3a8a, #2563eb)",
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
            headerBg: "linear-gradient(135deg, #1d4ed8, #2563eb)",
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

  const mergeServerMessages = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) {
      return;
    }

    setMessages((prev) => {
      const pending = prev.filter((msg) => msg.pending);
      const nonPending = prev.filter((msg) => !msg.pending);

      const incomingKeys = new Set(incoming.map(messageKey));
      const filteredPending = pending.filter(
        (pendingMsg) =>
          !incoming.some(
            (serverMsg) =>
              serverMsg.sender === pendingMsg.sender &&
              serverMsg.text === pendingMsg.text,
          ),
      );

      const next: Message[] = [];
      const seen = new Set<string>();

      const pushUnique = (message: Message) => {
        const key = messageKey(message);
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        next.push(message);
      };

      nonPending.forEach((message) => {
        if (!incomingKeys.has(messageKey(message))) {
          pushUnique(message);
        }
      });

      filteredPending.forEach((message) => {
        const key = messageKey(message);
        const shouldKeepPending = !incomingKeys.has(key);
        pushUnique({ ...message, pending: shouldKeepPending });
      });

      incoming.forEach((message) => pushUnique({ ...message, pending: false }));

      next.sort(compareMessages);
      const trimmed = next.slice(-200);
      seenMessagesRef.current = new Set(trimmed.map(messageKey));

      return trimmed;
    });
  }, []);

  const fetchLatestMessages = useCallback(
    async (options?: { resetSince?: boolean }) => {
      if (!clientId || !userId) {
        return;
      }

      const params = new URLSearchParams({
        clientId,
        sessionId: userId,
        limit: "200",
      });

      if (!options?.resetSince && lastMessageAtRef.current) {
        params.set("since", lastMessageAtRef.current);
      }

      try {
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

        const payload = await response.json().catch(() => ({}));
        const rows = Array.isArray(payload?.messages) ? payload.messages : [];

        const normalised = rows
          .map((row: any, index: number): Message | null => {
            if (!row || typeof row !== "object") {
              return null;
            }

            const roleValue =
              typeof row.role === "string" ? row.role.toLowerCase() : "";
            const sender: "user" | "bot" = roleValue === "bot" ? "bot" : "user";
            const rawText =
              row.text ??
              row.message ??
              (typeof row.content === "string"
                ? row.content
                : row.content?.text) ??
              (typeof row.body === "string" ? row.body : row.body?.text);
            const text = toDisplayText(rawText).trim();
            const createdAt =
              typeof row.created_at === "string" ? row.created_at : undefined;

            if (!text) {
              return null;
            }

            const id = createdAt
              ? `${sender}-${createdAt}`
              : `${sender}-${generateId()}`;

            return {
              id,
              sender,
              text,
              createdAt,
              pending: false,
              sequence:
                typeof row.sequence === "number"
                  ? row.sequence
                  : typeof row.position === "number"
                  ? row.position
                  : index,
            };
          })
          .filter((msg: Message | null): msg is Message => Boolean(msg));

        if (normalised.length === 0) {
          return;
        }

        const newestWithTimestamp = normalised
          .map((msg: Message) => msg.createdAt)
          .filter((value: string | undefined | null): value is string =>
            Boolean(value),
          );

        if (newestWithTimestamp.length > 0) {
          const newest = newestWithTimestamp[newestWithTimestamp.length - 1];
          if (newest) {
            const previous = lastMessageAtRef.current
              ? Date.parse(lastMessageAtRef.current)
              : null;
            const candidate = Date.parse(newest);
            if (!previous || (candidate && candidate > previous)) {
              lastMessageAtRef.current = newest;
            }
          }
        }

        mergeServerMessages(normalised);
      } catch (error) {
        console.error("Failed to fetch landing messages", error);
      }
    },
    [clientId, userId, mergeServerMessages],
  );

  useEffect(() => {
    seenMessagesRef.current.clear();
    lastMessageAtRef.current = null;
    setMessages([]);

    if (!clientId || !userId) {
      return;
    }

    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (resetSince: boolean) => {
      if (canceled) {
        return;
      }

      await fetchLatestMessages({ resetSince });

      if (canceled) {
        return;
      }

      timer = setTimeout(() => {
        void poll(false);
      }, POLL_INTERVAL_MS);
    };

    void poll(true);

    return () => {
      canceled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [clientId, userId, fetchLatestMessages]);

  const suggestions = useMemo(
    () => [
      "Quiero automatizar mis leads",
      "¿Cómo integran el bot con WhatsApp?",
      "Necesito una demo personalizada",
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || !userId) {
      return;
    }

    const trimmed = input.trim();
    const messageId = generateId();
    const createdAt = new Date().toISOString();

    const userMessage: Message = {
      id: messageId,
      sender: "user",
      text: trimmed,
      createdAt,
      pending: true,
      sequence: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessages((prev) =>
          prev.filter((msg) => !(msg.pending && msg.id === messageId)),
        );
        setErrorMessage(
          data?.error ?? "No pudimos enviar tu mensaje. Intentá nuevamente.",
        );
        return;
      }

      await fetchLatestMessages();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, pending: false } : msg,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.filter((msg) => !(msg.pending && msg.id === messageId)),
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Error de red inesperado.",
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(input.trim() && userId && !loading);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const botMessages = messages.filter(
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

    if (isOpen && messageContainerRef.current) {
      requestAnimationFrame(() => {
        messageContainerRef.current?.lastElementChild?.scrollIntoView({
          block: "end",
          behavior: "smooth",
        });
      });
    }
  }, [messages, isOpen]);

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

  const panelHeight = isMobileView ? "min(80vh, 640px)" : "580px";
  const panelWidth = isMobileView
    ? "min(100vw - 1.5rem, 420px)"
    : "min(400px, calc(100vw - 2.5rem))";

  const panelStyle: React.CSSProperties = {
    width: panelWidth,
    height: panelHeight,
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
          bottom: isMobileView ? "1rem" : "1.5rem",
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
                  Siempre online
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
                  Nuestro equipo responde en minutos.
                </p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </header>

            <div
              ref={messageContainerRef}
              style={{
                flex: 1,
                backgroundColor: theme.bodyBg,
                padding: "1.25rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                overflowY: "auto",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: theme.emptyState,
                    fontSize: "0.95rem",
                    marginTop: "2rem",
                    lineHeight: 1.45,
                  }}
                >
                  Contanos en qué podemos ayudarte y te respondemos enseguida.
                </div>
              )}

              {messages.map((message) => (
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
                    padding: "0.8rem 1rem",
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
                    position: "relative",
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
                      Enviando…
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "0.75rem 1.25rem 0.5rem",
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
                    color: "#2563eb",
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
                padding: "0.75rem 1.25rem 1rem",
                borderTop: `1px solid ${theme.divider}`,
                backgroundColor: theme.inputBg,
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={placeholder}
                aria-label="Mensaje"
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
                {loading ? "Enviando…" : "Enviar"}
              </button>
            </form>

            {errorMessage && (
              <p
                aria-live="polite"
                style={{
                  margin: 0,
                  padding: "0 1.25rem 1rem",
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
                  padding: "0 1.25rem 1rem",
                  color: theme.initializingText,
                  fontSize: "0.8rem",
                  textAlign: "center",
                }}
              >
                Inicializando chat…
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleWidget}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
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
