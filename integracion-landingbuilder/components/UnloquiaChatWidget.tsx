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
  sender: 'user' | 'bot';
  text: string;
  createdAt?: string;
  pending?: boolean;
  sequence?: number;
  messageId?: string;
};

type UnloquiaChatWidgetProps = {
  clientId: string;
  userId?: string;
  title?: string;
  placeholder?: string;
};

const USER_STORAGE_KEY = 'unloquia-chat-user-id';
const POLL_INTERVAL_MS = 2000;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

const messageKey = (message: Message) => {
  if (message.messageId) {
    return `id:${message.messageId}`;
  }
  if (message.createdAt) {
    return `${message.sender}:${message.createdAt}`;
  }
  return `${message.sender}:${message.id}`;
};

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
      return a.sender === 'user' ? -1 : 1;
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
  title = 'Conversemos',
  placeholder = 'Escribí tu mensaje...',
}: UnloquiaChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);

  const seenMessagesRef = useRef<Set<string>>(new Set());
  const lastMessageAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (externalUserId) {
      setStoredUserId(externalUserId);
      return;
    }

    const existing = typeof window !== 'undefined'
      ? window.localStorage.getItem(USER_STORAGE_KEY)
      : null;

    if (existing) {
      setStoredUserId(existing);
      return;
    }

    const generated = generateId();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_STORAGE_KEY, generated);
    }
    setStoredUserId(generated);
  }, [externalUserId]);

  const userId = useMemo(
    () => externalUserId ?? storedUserId,
    [externalUserId, storedUserId],
  );

  const mergeServerMessages = useCallback((incoming: Message[]) => {
    setMessages((prev) => {
      if (incoming.length === 0) {
        return prev;
      }

      const pending = prev.filter((msg) => msg.pending);

      const serverSeen = new Set<string>();
      const serverMessages: Message[] = [];
      const sortedIncoming = [...incoming].sort(compareMessages);

      for (const message of sortedIncoming) {
        const key = messageKey(message);
        if (serverSeen.has(key)) {
          continue;
        }
        serverSeen.add(key);
        serverMessages.push({ ...message, pending: false });
      }

      const next: Message[] = [...serverMessages];
      const seen = new Set(serverMessages.map((msg) => messageKey(msg)));

      for (const pendingMsg of pending) {
        const key = messageKey(pendingMsg);
        if (seen.has(key)) {
          continue;
        }
        if (
          pendingMsg.messageId &&
          serverMessages.some((serverMsg) => serverMsg.messageId === pendingMsg.messageId)
        ) {
          continue;
        }
        seen.add(key);
        next.push(pendingMsg);
      }

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
        limit: '200',
      });

      if (!options?.resetSince && lastMessageAtRef.current) {
        params.set('since', lastMessageAtRef.current);
      }

      try {
        const response = await fetch(`/api/unloquia-messages?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorPayload = await response.text().catch(() => '');
          console.error('Failed to fetch landing messages', response.status, errorPayload);
          return;
        }

        const payload = await response.json().catch(() => ({}));
        const rows = Array.isArray(payload?.messages) ? payload.messages : [];

        const normalised = rows
          .map((row: any, index: number): Message | null => {
            if (!row || typeof row !== 'object') {
              return null;
            }

            const roleValue = typeof row.role === 'string' ? row.role.toLowerCase() : '';
            const sender: 'user' | 'bot' = roleValue === 'bot' ? 'bot' : 'user';
            const rawText =
              row.text ??
              row.message ??
              (typeof row.content === 'string'
                ? row.content
                : row.content?.text) ??
              (typeof row.body === 'string' ? row.body : row.body?.text);
            const text = toDisplayText(rawText).trim();
            const createdAt = typeof row.created_at === 'string' ? row.created_at : undefined;

            if (!text) {
              return null;
            }

            const messageId =
              typeof row.message_id === 'string'
                ? row.message_id
                : typeof row.messageId === 'string'
                ? row.messageId
                : undefined;
            const id =
              messageId ??
              (createdAt ? `${sender}-${createdAt}` : `${sender}-${generateId()}`);

            return {
              id,
              sender,
              text,
              createdAt,
              pending: false,
              sequence:
                typeof row.sequence === 'number'
                  ? row.sequence
                  : typeof row.position === 'number'
                  ? row.position
                  : index,
              messageId,
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
            const previous = lastMessageAtRef.current ? Date.parse(lastMessageAtRef.current) : null;
            const candidate = Date.parse(newest);
            if (!previous || (candidate && candidate > previous)) {
              lastMessageAtRef.current = newest;
            }
          }
        }

        mergeServerMessages(normalised);
      } catch (error) {
        console.error('Failed to fetch landing messages', error);
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
      sender: 'user',
      text: trimmed,
      createdAt,
      pending: true,
      sequence: Date.now(),
      messageId,
    };

    setMessages((prev) => [...prev, userMessage]);
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessages((prev) =>
          prev.filter(
            (msg) =>
              !(
                msg.pending &&
                (msg.id === messageId || msg.messageId === messageId)
              ),
          ),
        );
        setErrorMessage(
          data?.error ?? 'No pudimos enviar tu mensaje. Intentá nuevamente.',
        );
        return;
      }

      await fetchLatestMessages();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId || msg.messageId === messageId
            ? { ...msg, pending: false }
            : msg,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            !(
              msg.pending &&
              (msg.id === messageId || msg.messageId === messageId)
            ),
        ),
      );
      setErrorMessage(
        error instanceof Error ? error.message : 'Error de red inesperado.',
      );
    } finally {
      setLoading(false);
    }
  };

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
        <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
          Respondemos en minutos. Dejá tu mensaje.
        </p>
      </header>

      <div
        style={{
          flex: 1,
          backgroundColor: '#f9fafb',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          height: '320px',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.95rem',
              marginTop: '2rem',
            }}
          >
            ¡Hola! ¿En qué podemos ayudarte hoy?
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: message.sender === 'user' ? '#2563eb' : '#ffffff',
              color: message.sender === 'user' ? '#ffffff' : '#111827',
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              boxShadow:
                message.sender === 'user'
                  ? '0 10px 20px rgba(37, 99, 235, 0.25)'
                  : '0 10px 20px rgba(15, 23, 42, 0.08)',
              maxWidth: '80%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.95rem',
              opacity: message.pending ? 0.7 : 1,
            }}
          >
            {message.text}
            {message.pending && (
              <span
                style={{
                  display: 'block',
                  marginTop: '0.4rem',
                  fontSize: '0.75rem',
                  opacity: 0.8,
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
            cursor: loading || !input.trim() || !userId ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      {errorMessage && (
        <p
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
