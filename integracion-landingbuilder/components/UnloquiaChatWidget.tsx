'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Message = {
  id: string;
  messageId?: string;
  sender: 'user' | 'bot';
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

const USER_STORAGE_KEY = 'unloquia-chat-user-id';
const POLL_INTERVAL_MS = 2000;
const SIMPLE_MODE = true; // Ignorar 'user' del backend; sólo renderizar bot del servidor

const toDisplayText = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to stringify message payload', error);
    return '';
  }
};

const normaliseRow = (row: any, index: number): Message | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const roleValue =
    typeof row.role === 'string'
      ? row.role.toLowerCase()
      : typeof row.message_role === 'string'
      ? row.message_role.toLowerCase()
      : typeof row.direction === 'string'
      ? row.direction.toLowerCase()
      : '';

  const sender: 'user' | 'bot' =
    roleValue === 'bot' || roleValue === 'assistant'
      ? 'bot'
      : roleValue === 'agent' || roleValue === 'outbound'
      ? 'bot'
      : 'user';

  const rawText =
    row.text ??
    row.message ??
    (typeof row.body === 'string' ? row.body : row.body?.text) ??
    (typeof row.content === 'string' ? row.content : row.content?.text) ??
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
    typeof createdAtSource === 'string'
      ? createdAtSource
      : new Date().toISOString();

  const messageId =
    typeof row.message_id === 'string'
      ? row.message_id
      : typeof row.messageId === 'string'
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
      if (Math.abs(delta) <= 10_000 && a.sender !== b.sender) {
        return a.sender === 'user' ? -1 : 1;
      }
      return delta;
    }
  }

  if (a.sender !== b.sender) {
    return a.sender === 'user' ? -1 : 1;
  }

  if (a.messageId && b.messageId && a.messageId !== b.messageId) {
    return a.messageId.localeCompare(b.messageId);
  }

  return a.text.localeCompare(b.text);
};

export default function UnloquiaChatWidget({
  clientId,
  userId: externalUserId,
  title = 'Conversemos',
  placeholder = 'Escribí tu mensaje...',
}: UnloquiaChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const hydratedRef = useRef<boolean>(false);

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
        limit: '200',
      });
      if (lastTimestampRef.current) {
        params.set('since', lastTimestampRef.current);
      }

      const response = await fetch(`/api/unloquia-messages?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorPayload = await response.text().catch(() => '');
        console.error(
          'Failed to fetch landing messages',
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

      const serverBots = SIMPLE_MODE
        ? uniqueFromServer.filter((m) => m.sender === 'bot')
        : uniqueFromServer;

      if (!hydratedRef.current) {
        const initialSorted = serverBots.slice().sort(sortMessages);
        const trimmed = initialSorted.slice(-50);
        setMessages(trimmed);
        const stamps = trimmed
          .map((m) => m.createdAt)
          .filter((s): s is string => typeof s === 'string' && s.length > 0);
        if (stamps.length > 0) {
          lastTimestampRef.current = stamps[stamps.length - 1];
        }
        hydratedRef.current = true;
      } else {
        // Merge preservando orden de llegada (sin sort)
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
              if (m.messageId) idIndex.set(m.messageId, result.length - 1);
              else compositeIndex.set(k, result.length - 1);
            }
          }
        }

          const stamps = result
            .map((m) => m.createdAt)
            .filter((s): s is string => typeof s === 'string' && s.length > 0);
          if (stamps.length > 0) {
            lastTimestampRef.current = stamps[stamps.length - 1];
          }

          return result;
        });
      }

      // Remove only pending messages acknowledged by server (same messageId)
      if (!SIMPLE_MODE) {
        const serverMessageIds = new Set(
          uniqueFromServer
            .map((m) => m.messageId)
            .filter((v): v is string => typeof v === 'string' && v.length > 0),
        );
        const serverUserEchoes = uniqueFromServer.filter(
          (m) => m.sender === 'user' && typeof m.createdAt === 'string',
        );
        const serverBotReplies = uniqueFromServer.filter(
          (m) => m.sender === 'bot' && typeof m.createdAt === 'string',
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
              return Number.isFinite(pTime) && Number.isFinite(t) && Math.abs(t - pTime) <= 30_000;
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
      console.error('Failed to fetch landing messages', error);
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
      'Quiero automatizar mis leads',
      '¿Cómo integran el bot con WhatsApp?',
      'Necesito una demo personalizada',
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
      sender: 'user',
      text: trimmed,
      createdAt,
      pending: true,
    };

    setPendingMessages((prev) => [...prev, pendingMessage]);
    setInput('');
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/unloquia-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        setMessages((prev) =>
          prev.filter((msg) => msg.messageId !== messageId),
        );
        setErrorMessage(
          data?.error ?? 'No pudimos enviar tu mensaje. Intentá nuevamente.',
        );
        return;
      }
      if (SIMPLE_MODE) {
        setPendingMessages((prev) =>
          prev.map((m) => (m.messageId === messageId ? { ...m, pending: false } : m)),
        );
      } else {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send landing message', error);
      setPendingMessages((prev) =>
        prev.filter((msg) => msg.messageId !== messageId),
      );
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
      setErrorMessage(
        error instanceof Error ? error.message : 'Error de red inesperado.',
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
    return [...messages, ...pendingToAppend];
  }, [messages, pendingMessages]);

  useEffect(() => {
    // Auto-scroll to the latest message when new ones arrive
    if (messageContainerRef.current) {
      messageContainerRef.current.lastElementChild?.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
      });
    }
  }, [displayMessages.length]);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
        backgroundColor: '#ffffff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          background: 'linear-gradient(135deg, #0f172a, #312e81)',
          color: '#ffffff',
          padding: '1.25rem 1.5rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
        <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
          Respondemos en minutos. Dejá tu mensaje.
        </p>
      </header>

      <div
        ref={messageContainerRef}
        style={{
          flex: 1,
          backgroundColor: '#f9fafb',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          height: '360px',
          overflowY: 'auto',
        }}
      >
        {displayMessages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.95rem',
              marginTop: '2rem',
              lineHeight: 1.45,
            }}
          >
            Contanos en qué podemos ayudarte y te respondemos enseguida.
          </div>
        )}

        {displayMessages.map((message) => (
          <div
            key={message.id}
            style={{
              alignSelf:
                message.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: message.sender === 'user' ? '#2563eb' : '#ffffff',
              color: message.sender === 'user' ? '#ffffff' : '#111827',
              padding: '0.8rem 1rem',
              lineHeight: 1.4,
              borderRadius:
                message.sender === 'user'
                  ? '1.15rem 1.15rem 0.35rem 1.15rem'
                  : '1.15rem 1.15rem 1.15rem 0.35rem',
              boxShadow:
                message.sender === 'user'
                  ? '0 10px 20px rgba(37, 99, 235, 0.25)'
                  : '0 12px 24px rgba(15, 23, 42, 0.12)',
              maxWidth: '80%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.95rem',
              opacity: message.pending ? 0.75 : 1,
            }}
          >
            {message.text}
            {message.pending && (
              <span
                style={{
                  display: 'block',
                  marginTop: '0.4rem',
                  fontSize: '0.75rem',
                  opacity: 0.75,
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
          display: 'flex',
          gap: '0.75rem',
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          aria-label="Mensaje"
          style={{
            flex: 1,
            borderRadius: '0.75rem',
            border: '1px solid #d1d5db',
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            outline: 'none',
          }}
          disabled={loading || !userId}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !userId}
          style={{
            borderRadius: '0.75rem',
            backgroundColor:
              loading || !input.trim() || !userId ? '#9ca3af' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            cursor:
              loading || !input.trim() || !userId ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      {errorMessage && (
        <p
          aria-live="polite"
          style={{
            margin: 0,
            padding: '0.75rem 1rem 1.25rem',
            color: '#b91c1c',
            backgroundColor: '#fef2f2',
            fontSize: '0.85rem',
          }}
        >
          {errorMessage}
        </p>
      )}

      {!userId && (
        <p
          style={{
            margin: 0,
            padding: '0 1rem 1rem',
            color: '#6b7280',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          Inicializando chat…
        </p>
      )}
    </div>
  );
}
