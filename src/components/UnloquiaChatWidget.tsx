'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  createdAt?: string;
  pending?: boolean;
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
    const update = () => setIsDarkMode(root.classList.contains("dark"));
    update();

    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

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
          .map((row: any): Message | null => {
            if (!row || typeof row !== "object") {
              return null;
            }

            const roleValue =
              typeof row.role === "string" ? row.role.toLowerCase() : "";
            const sender: "user" | "bot" = roleValue === "bot" ? "bot" : "user";
            const text = toDisplayText(row.text).trim();
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
            };
          })
          .filter((msg: Message | null): msg is Message => Boolean(msg));

        if (normalised.length === 0) {
          return;
        }

        const newestWithTimestamp = normalised
          .map((msg) => msg.createdAt)
          .filter((value): value is string => Boolean(value));

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

  return (
    <div
      style={{
        width: "min(360px, calc(100vw - 2.5rem))",
        minWidth: "260px",
        borderRadius: "1.5rem",
        border: `1px solid ${theme.containerBorder}`,
        boxShadow: theme.containerShadow,
        backgroundColor: theme.containerBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "1.25rem",
          borderBottom: `1px solid ${theme.headerDivider}`,
          background: theme.headerBg,
          color: theme.headerText,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.35rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0",
            color: theme.headerCaption,
            fontSize: "0.9rem",
            lineHeight: 1.4,
          }}
        >
          Respondemos en minutos. Dejá tu mensaje.
        </p>
      </header>

      <div
        style={{
          flex: 1,
          backgroundColor: theme.bodyBg,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          height: "min(340px, 48vh)",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: theme.emptyState,
              fontSize: "0.9rem",
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
              alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                message.sender === "user"
                  ? theme.userBubbleBg
                  : theme.botBubbleBg,
              color:
                message.sender === "user"
                  ? theme.userBubbleText
                  : theme.botBubbleText,
              padding: "0.75rem 1rem",
              lineHeight: 1.4,
              borderRadius: "1rem",
              boxShadow:
                message.sender === "user"
                  ? theme.bubbleShadowUser
                  : theme.bubbleShadowBot,
              maxWidth: "80%",
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
                  opacity: 0.85,
                }}
              >
                Enviando…
              </span>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0.75rem",
          padding: "1rem",
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
            borderRadius: "0.75rem",
            border: `1px solid ${theme.inputBorder}`,
            padding: "0.75rem 1rem",
            fontSize: "0.95rem",
            outline: "none",
            backgroundColor: theme.inputBg,
            color: theme.inputText,
          }}
          disabled={loading || !userId}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            borderRadius: "0.75rem",
            backgroundColor: canSubmit
              ? theme.buttonActive
              : theme.buttonDisabled,
            color: "#ffffff",
            border: "none",
            padding: "0.75rem 1.25rem",
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
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
            padding: "0.75rem 1rem 1.25rem",
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
            padding: "0 1rem 1rem",
            color: theme.initializingText,
            fontSize: "0.8rem",
            textAlign: "center",
          }}
        >
          Inicializando chat…
        </p>
      )}
    </div>
  );
}
