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

const USER_STORAGE_KEY = "unloquia-chat-user-id";
const POLL_INTERVAL_MS = 2000;
const SIMPLE_MODE = true;
const CONVO_STORAGE_PREFIX = "unloquia-chat-convo-v1";

type StoredUserMessage = {
  id: string;
  text: string;
  createdAt: string;
  pending?: boolean;
};

const getStoreKey = (clientId: string, sessionId: string) =>
  `${CONVO_STORAGE_PREFIX}:${clientId}:${sessionId}`;

const loadStoredUserMessages = (
  clientId?: string,
  sessionId?: string | null,
): Message[] => {
  try {
    if (!clientId || !sessionId) return [];
    const key = getStoreKey(clientId, sessionId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r: any, idx: number): Message | null => {
        if (!r || typeof r !== "object") return null;
        const id = typeof r.id === "string" ? r.id : crypto.randomUUID();
        const text = typeof r.text === "string" ? r.text : "";
        const createdAt =
          typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString();
        if (!text) return null;
        return { id, messageId: id, sender: "user", text, createdAt, pending: !!r.pending };
      })
      .filter(Boolean) as Message[];
  } catch {
    return [];
  }
};

const persistStoredUserMessage = (
  clientId: string,
  sessionId: string,
  msg: Message,
) => {
  try {
    const key = getStoreKey(clientId, sessionId);
    const current = loadStoredUserRaw(clientId, sessionId);
    const next: StoredUserMessage[] = [
      ...current,
      { id: msg.messageId ?? msg.id, text: msg.text, createdAt: msg.createdAt, pending: !!msg.pending },
    ];
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {}
};

const loadStoredUserRaw = (clientId: string, sessionId: string): StoredUserMessage[] => {
  try {
    const key = getStoreKey(clientId, sessionId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as StoredUserMessage[]) : [];
  } catch {
    return [];
  }
};

const updateStoredUserPending = (
  clientId?: string,
  sessionId?: string | null,
  messageId?: string,
  pending?: boolean,
) => {
  try {
    if (!clientId || !sessionId || !messageId) return;
    const key = getStoreKey(clientId, sessionId);
    const current = loadStoredUserRaw(clientId, sessionId);
    const next = current.map((m) => (m.id === messageId ? { ...m, pending: !!pending } : m));
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {}
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
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const previousBotCountRef = useRef(0);
  const initialisedViewRef = useRef(false);
  const lastTimestampRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!externalUserId) {
      const existing = window.localStorage.getItem(USER_STORAGE_KEY);
      if (existing) {
        setStoredUserId(existing);
        return;
      }
      const generated = crypto.randomUUID();
      window.localStorage.setItem(USER_STORAGE_KEY, generated);
      setStoredUserId(generated);
    }
  }, [externalUserId]);

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

  const userId = useMemo(
    () => externalUserId ?? storedUserId,
    [externalUserId, storedUserId],
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

      // Dedupe only by messageId when available
      const seenIds = new Set<string>();
      const seenComposite = new Set<string>();
      const uniqueFromServer: Message[] = [];
      for (const m of normalised) {
        if (m.messageId) {
          if (!seenIds.has(m.messageId)) {
            seenIds.add(m.messageId);
            uniqueFromServer.push(m);
          }
        } else {
          const k = `${m.sender}|${m.createdAt}|${m.text}`;
          if (!seenComposite.has(k)) {
            seenComposite.add(k);
            uniqueFromServer.push(m);
          }
        }
      }

      // In simple mode we only ingest bot messages coming from the server
      const serverBots = SIMPLE_MODE
        ? uniqueFromServer.filter((m) => m.sender === "bot")
        : uniqueFromServer;

      // First hydration: sort chronologically and trim the history
      if (!hydratedRef.current) {
        const localUsers = SIMPLE_MODE ? loadStoredUserMessages(clientId, userId) : [];
        const initialCombined = [...serverBots, ...localUsers].sort(sortMessages);
        const trimmed = initialCombined.slice(-50);
        setMessages(trimmed);
        const stamps = trimmed
          .map((m) => m.createdAt)
          .filter((s): s is string => typeof s === "string" && s.length > 0);
        if (stamps.length > 0) {
          lastTimestampRef.current = stamps[stamps.length - 1];
        }
        hydratedRef.current = true;
      } else {
        // Merge by arrival order (no resort): replace existing entries or append new ones
        setMessages((prev) => {
          const idIndex = new Map<string, number>();
          const compositeIndex = new Map<string, number>();
          const result = prev.slice();

        for (let i = 0; i < prev.length; i++) {
          const m = prev[i];
          if (m.messageId) {
            idIndex.set(m.messageId, i);
          } else {
            compositeIndex.set(`${m.sender}|${m.createdAt}|${m.text}`, i);
          }
        }

        for (const m of serverBots) {
          if (m.messageId && idIndex.has(m.messageId)) {
            const idx = idIndex.get(m.messageId)!;
            result[idx] = m;
          } else {
            const k = `${m.sender}|${m.createdAt}|${m.text}`;
            if (compositeIndex.has(k)) {
              const idx = compositeIndex.get(k)!;
              result[idx] = m;
            } else {
              result.push(m);
              // update indexes so repeated items in the same batch merge correctly
              if (m.messageId) idIndex.set(m.messageId, result.length - 1);
              else compositeIndex.set(k, result.length - 1);
            }
          }
        }

          // Update since cursor with the most recent createdAt we have rendered
          const stamps = result
            .map((m) => m.createdAt)
            .filter((s): s is string => typeof s === "string" && s.length > 0);
          if (stamps.length > 0) {
            lastTimestampRef.current = stamps[stamps.length - 1];
          }

          return result;
        });
      }

      if (!SIMPLE_MODE) {
        // Remove only pending messages acknowledged by server
        const serverMessageIds = new Set(
          uniqueFromServer
            .map((m) => m.messageId)
            .filter((v): v is string => typeof v === "string" && v.length > 0),
        );
        const serverUserEchoes = uniqueFromServer.filter(
          (m) => m.sender === "user" && typeof m.createdAt === "string",
        );
        const serverBotReplies = uniqueFromServer.filter(
          (m) => m.sender === "bot" && typeof m.createdAt === "string",
        );
        setPendingMessages((prev) =>
          prev.filter((pendingMsg) => {
            if (pendingMsg.messageId && serverMessageIds.has(pendingMsg.messageId)) {
              return false;
            }
            const pTime = Date.parse(pendingMsg.createdAt);
            const echoed = serverUserEchoes.some((m) => {
              if (m.text !== pendingMsg.text) return false;
              const t = Date.parse(m.createdAt);
              return (
                Number.isFinite(pTime) && Number.isFinite(t) && Math.abs(t - pTime) <= 30_000
              );
            });
            if (echoed) return false;
            const replied = serverBotReplies.some((m) => {
              const t = Date.parse(m.createdAt);
              return Number.isFinite(pTime) && Number.isFinite(t) && t >= pTime - 5_000;
            });
            return !replied;
          }),
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

    if (SIMPLE_MODE) {
      setMessages((prev) => [...prev, pendingMessage]);
      // persist user message locally for hydration on reload
      if (clientId && userId) {
        persistStoredUserMessage(clientId, userId, pendingMessage);
      }
    }
    setPendingMessages((prev) => [...prev, pendingMessage]);
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
        prev.filter((msg) => msg.messageId !== messageId));
        setMessages((prev) =>
          prev.filter((msg) => msg.messageId !== messageId),
        );
        setErrorMessage(
          data?.error ?? "We couldn't send your message. Please try again.",
        );
        return;
      }
      if (SIMPLE_MODE) {
        // Visually confirm: remove pending flag once backend acknowledges
        setPendingMessages((prev) =>
          prev.map((m) => (m.messageId === messageId ? { ...m, pending: false } : m)),
        );
        setMessages((prev) =>
          prev.map((m) => (m.messageId === messageId ? { ...m, pending: false } : m)),
        );
        updateStoredUserPending(clientId, userId, messageId, false);
      } else {
        await fetchMessages();
      }
    } catch (error) {
      console.error("Failed to send landing message", error);
        setPendingMessages((prev) =>
          prev.filter((msg) => msg.messageId !== messageId),
        );
        setMessages((prev) =>
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

    const serverKeys = new Set(messages.map(createMessageKey));
    const pendingToAppend = pendingMessages.filter(
      (pendingMsg) => !serverKeys.has(createMessageKey(pendingMsg)),
    );

    if (pendingToAppend.length === 0) {
      return messages;
    }
    // Keep server messages in order and append pending ones at the end
    return [...messages, ...pendingToAppend];
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

    if (isOpen && messageContainerRef.current) {
      requestAnimationFrame(() => {
        messageContainerRef.current?.lastElementChild?.scrollIntoView({
          block: "end",
          behavior: "smooth",
        });
      });
    }
  }, [displayMessages, isOpen]);

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
    ? "min(520px, calc(100vh - 4.5rem))"
    : "min(520px, calc(100vh - 5rem))";
  const panelWidth = isMobileView
    ? "min(100vw - 1.75rem, 360px)"
    : "min(360px, calc(100vw - 3rem))";

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
                backgroundColor: theme.bodyBg,
                padding: "1.25rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                overflowY: "auto",
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
