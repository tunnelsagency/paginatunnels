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
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const update = () => setIsDarkMode(root.classList.contains('dark'));
    update();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

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
            containerBg: '#0f172a',
            containerBorder: 'rgba(148, 163, 184, 0.18)',
            containerShadow: '0 36px 90px rgba(8, 47, 73, 0.55)',
            headerBg: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            headerDivider: 'rgba(37, 99, 235, 0.35)',
            headerText: '#f8fafc',
            headerCaption: 'rgba(226, 232, 240, 0.75)',
            bodyBg: '#111827',
            emptyState: 'rgba(203, 213, 225, 0.75)',
            userBubbleBg: '#2563eb',
            userBubbleText: '#f8fafc',
            botBubbleBg: 'rgba(15, 23, 42, 0.9)',
            botBubbleText: '#e2e8f0',
            bubbleShadowUser: '0 10px 24px rgba(37, 99, 235, 0.35)',
            bubbleShadowBot: '0 14px 28px rgba(15, 23, 42, 0.45)',
            inputBg: 'rgba(17, 24, 39, 0.95)',
            inputBorder: 'rgba(148, 163, 184, 0.4)',
            inputText: '#e2e8f0',
            buttonActive: '#3b82f6',
            buttonDisabled: 'rgba(75, 85, 99, 0.7)',
            divider: 'rgba(148, 163, 184, 0.2)',
            errorBg: 'rgba(127, 29, 29, 0.45)',
            errorText: '#fecaca',
            initializingText: 'rgba(203, 213, 225, 0.7)',
          }
        : {
            containerBg: '#ffffff',
            containerBorder: 'rgba(15, 23, 42, 0.12)',
            containerShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            headerBg: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            headerDivider: 'rgba(37, 99, 235, 0.22)',
            headerText: '#ffffff',
            headerCaption: 'rgba(255, 255, 255, 0.85)',
            bodyBg: '#f9fafb',
            emptyState: '#6b7280',
            userBubbleBg: '#2563eb',
            userBubbleText: '#ffffff',
            botBubbleBg: '#ffffff',
            botBubbleText: '#111827',
            bubbleShadowUser: '0 10px 20px rgba(37, 99, 235, 0.25)',
            bubbleShadowBot: '0 12px 24px rgba(15, 23, 42, 0.12)',
            inputBg: '#ffffff',
            inputBorder: '#d1d5db',
            inputText: '#111827',
            buttonActive: '#2563eb',
            buttonDisabled: '#9ca3af',
            divider: '#e5e7eb',
            errorBg: '#fef2f2',
            errorText: '#b91c1c',
            initializingText: '#6b7280',
          },
    [isDarkMode],
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
        maxWidth: '380px',
        borderRadius: '1.5rem',
        border: `1px solid ${theme.containerBorder}`,
        boxShadow: theme.containerShadow,
        backgroundColor: theme.containerBg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '1.25rem',
          borderBottom: `1px solid ${theme.headerDivider}`,
          background: theme.headerBg,
          color: theme.headerText,
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
        <p
          style={{
            margin: '0.25rem 0 0',
            color: theme.headerCaption,
            fontSize: '0.9rem',
          }}
        >
          Respondemos en minutos. Dejá tu mensaje.
        </p>
      </header>

      <div
        style={{
          flex: 1,
          backgroundColor: theme.bodyBg,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          height: '360px',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: theme.emptyState,
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
              backgroundColor:
                message.sender === 'user'
                  ? theme.userBubbleBg
                  : theme.botBubbleBg,
              color:
                message.sender === 'user'
                  ? theme.userBubbleText
                  : theme.botBubbleText,
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              boxShadow:
                message.sender === 'user'
                  ? theme.bubbleShadowUser
                  : theme.bubbleShadowBot,
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
            borderRadius: '0.75rem',
            border: `1px solid ${theme.inputBorder}`,
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            outline: 'none',
            backgroundColor: theme.inputBg,
            color: theme.inputText,
          }}
          disabled={loading || !userId}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            borderRadius: '0.75rem',
            backgroundColor: canSubmit
              ? theme.buttonActive
              : theme.buttonDisabled,
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
          aria-live="polite"
          style={{
            margin: 0,
            padding: '0.75rem 1rem 1.25rem',
            color: theme.errorText,
            backgroundColor: theme.errorBg,
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
            color: theme.initializingText,
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
