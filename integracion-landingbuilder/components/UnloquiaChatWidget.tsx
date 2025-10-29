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
const CACHE_STORAGE_PREFIX = 'unloquia-chat-cache';
const MAX_CACHED_MESSAGES = 100;
const POLL_INTERVAL_MS = 2000;

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
  title = "Let's chat",
  placeholder = 'Type your message...',
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
  const restoredFromCacheRef = useRef(false);

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

  useEffect(() => {
    if (!clientId || !userId || restoredFromCacheRef.current) {
      return;
    }

    const cacheKey = `${CACHE_STORAGE_PREFIX}:${clientId}:${userId}`;
    restoredFromCacheRef.current = true;

    try {
      const cachedValue = window.localStorage.getItem(cacheKey);
      if (!cachedValue) {
        return;
      }

      const parsed = JSON.parse(cachedValue);
      if (!Array.isArray(parsed)) {
        return;
      }

      const cachedMessages: Message[] = [];
      for (const entry of parsed) {
        if (
          !entry ||
          typeof entry !== 'object' ||
          ((entry as any).sender !== 'user' && (entry as any).sender !== 'bot')
        ) {
          continue;
        }

        const text =
          typeof (entry as any).text === 'string' ? (entry as any).text : '';
        if (!text) {
          continue;
        }

        const createdAt =
          typeof (entry as any).createdAt === 'string'
            ? (entry as any).createdAt
            : new Date().toISOString();

        const sender =
          (entry as any).sender === 'bot' ? 'bot' : ('user' as const);

        const cachedMessage: Message = {
          id:
            typeof (entry as any).id === 'string'
              ? (entry as any).id
              : `${sender}:${createdAt}:${text.slice(0, 32)}`,
          messageId:
            typeof (entry as any).messageId === 'string'
              ? (entry as any).messageId
              : undefined,
          sender,
          text,
          createdAt,
          pending: false,
        };

        cachedMessages.push(cachedMessage);
      }

      if (cachedMessages.length === 0) {
        return;
      }

      cachedMessages.sort(sortMessages);
      const lastMessage = cachedMessages[cachedMessages.length - 1];
      if (lastMessage) {
        lastTimestampRef.current = lastMessage.createdAt;
      }
      setMessages(cachedMessages);
      hydratedRef.current = true;
    } catch (error) {
      console.warn('Failed to restore cached chat messages', error);
    }
  }, [clientId, userId]);

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
      let latestTimestamp = lastTimestampRef.current
        ? Date.parse(lastTimestampRef.current)
        : Number.NEGATIVE_INFINITY;

      setMessages((prev) => {
        const next = lastTimestampRef.current ? [...prev] : [];
        const seenKeys = lastTimestampRef.current
          ? new Set(next.map(createMessageKey))
          : new Set<string>();

        if (!lastTimestampRef.current) {
          next.length = 0;
          seenKeys.clear();
        }

        for (const message of normalised) {
          const key = createMessageKey(message);
          if (!seenKeys.has(key)) {
            next.push(message);
            seenKeys.add(key);
          }
          const timestamp = Date.parse(message.createdAt);
          if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
          }
        }

        next.sort(sortMessages);
        if (next.length > MAX_CACHED_MESSAGES) {
          next.splice(0, next.length - MAX_CACHED_MESSAGES);
        }
        return next;
      });

      if (latestTimestamp > Number.NEGATIVE_INFINITY) {
        lastTimestampRef.current = new Date(latestTimestamp).toISOString();
      }

      if (!hydratedRef.current) {
        hydratedRef.current = true;
      }

      const userMessagesFromServer = normalised.filter((msg) => msg.sender === 'user');
      if (userMessagesFromServer.length > 0) {
        const acknowledgedTexts = new Set(userMessagesFromServer.map((msg) => msg.text));
        setPendingMessages((prev) =>
          prev.filter((pendingMsg) => !acknowledgedTexts.has(pendingMsg.text)),
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
      "I'd like to automate my leads",
      'How does the WhatsApp integration work?',
      'Can I book a tailored demo?',
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
        setErrorMessage(
          data?.error ?? "We couldn't send your message. Please try again.",
        );
        return;
      }

      await fetchMessages();
    } catch (error) {
      console.error('Failed to send landing message', error);
      setPendingMessages((prev) =>
        prev.filter((msg) => msg.messageId !== messageId),
      );
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected network error.',
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

  useEffect(() => {
    if (!clientId || !userId) {
      return;
    }

    const cacheKey = `${CACHE_STORAGE_PREFIX}:${clientId}:${userId}`;
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to cache chat messages', error);
    }
  }, [messages, clientId, userId]);

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
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 18px 38px rgba(15, 23, 42, 0.12)',
        backgroundColor: '#ffffff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
          color: '#ffffff',
          padding: '1.1rem 1.5rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
        <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
          We typically answer within a few minutes.
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
          minHeight: '260px',
          maxHeight: '360px',
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
            Tell us how we can help and we'll get back to you shortly.
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
                Sending…
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
          padding: '0.9rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          style={{
            flex: 1,
            borderRadius: '0.75rem',
            border: '1px solid #d1d5db',
            padding: '0.7rem 1rem',
            fontSize: '0.9rem',
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
            loading || !input.trim() || !userId ? '#9ca3af' : '#1d4ed8',
          color: '#ffffff',
          border: 'none',
          padding: '0.7rem 1.15rem',
          fontWeight: 600,
          cursor:
            loading || !input.trim() || !userId ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s ease',
          }}
        >
          {loading ? 'Sending…' : 'Send'}
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
          Warming up the chat…
        </p>
      )}
    </div>
  );
}
