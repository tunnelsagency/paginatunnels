'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
};

type UnloquiaChatWidgetProps = {
  clientId: string;
  userId?: string;
  title?: string;
  placeholder?: string;
};

const USER_STORAGE_KEY = 'unloquia-chat-user-id';

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  useEffect(() => {
    if (externalUserId) {
      setStoredUserId(externalUserId);
      return;
    }

    const existing = window.localStorage.getItem(USER_STORAGE_KEY);
    if (existing) {
      setStoredUserId(existing);
      return;
    }

    const generated = generateId();
    window.localStorage.setItem(USER_STORAGE_KEY, generated);
    setStoredUserId(generated);
  }, [externalUserId]);

  const userId = useMemo(
    () => externalUserId ?? storedUserId,
    [externalUserId, storedUserId],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || !userId) {
      return;
    }

    const trimmed = input.trim();
    const messageId = generateId();

    const userMessage: Message = {
      id: messageId,
      sender: 'user',
      text: trimmed,
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
        setErrorMessage(
          data?.error ?? 'No pudimos enviar tu mensaje. Intentá nuevamente.',
        );
        return;
      }

      const confirmation =
        typeof data?.message === 'string'
          ? data.message
          : data?.status === 'queued'
          ? '¡Gracias! Tu mensaje fue enviado. Te responderemos a la brevedad.'
          : 'Mensaje enviado.';

      const botMessage: Message = {
        id: generateId(),
        sender: 'bot',
        text: confirmation,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error de red inesperado.',
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(input.trim() && userId && !loading);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '360px',
        borderRadius: '1.5rem',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
          color: '#ffffff',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
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
            }}
          >
            {message.text}
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
          disabled={!canSubmit}
          style={{
            borderRadius: '0.75rem',
            backgroundColor: canSubmit ? '#2563eb' : '#9ca3af',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
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
