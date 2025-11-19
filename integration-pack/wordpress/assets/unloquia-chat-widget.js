(function () {
  if (typeof window === 'undefined' || window.UnloquiaChatBootstrapped) {
    return;
  }
  window.UnloquiaChatBootstrapped = true;

  const config = window.UnloquiaChatConfig || {};
  const clientId = config.clientId;
  if (!clientId) {
    console.warn('[UnloquiaChat] Missing clientId – widget will not start.');
    return;
  }

  const REST_BASE = config.apiBase || (window.wpApiSettings && window.wpApiSettings.root + 'unloquia/v1/');
  const POLL_MS = typeof config.pollMs === 'number' ? config.pollMs : 2000;

  const state = {
    open: false,
    isMobile: window.matchMedia('(max-width: 640px)').matches,
    messages: [],
    pending: [],
    unread: 0,
    botCount: 0,
    loading: false,
    input: '',
    since: null,
    ignoreSinceNext: false,
    fetching: false,
  };

  const elements = {};
  const sessionId = crypto.randomUUID();

  const normalize = (text) =>
    (text || '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();

  const toDisplayText = (value) => {
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
      console.error('[UnloquiaChat] Failed to stringify message payload', error);
      return '';
    }
  };

  const createMessageKey = (msg) =>
    msg.messageId || `${msg.sender}:${msg.createdAt}:${msg.text}`;

  const renderMessages = () => {
    const container = elements.messages;
    container.innerHTML = '';
    const merged = [...state.messages, ...state.pending].sort((a, b) => {
      const aDate = Date.parse(a.createdAt);
      const bDate = Date.parse(b.createdAt);
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate) && aDate !== bDate) {
        return aDate - bDate;
      }
      if (a.sender !== b.sender) {
        return a.sender === 'user' ? 1 : -1;
      }
      return a.text.localeCompare(b.text);
    });

    if (merged.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'unloquia-chat-empty';
      empty.textContent = 'Tell us how we can help and we\'ll get back to you shortly.';
      container.appendChild(empty);
      return;
    }

    merged.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `unloquia-chat-bubble ${message.sender}`;
      bubble.textContent = message.text;

      if (message.pending) {
        const pending = document.createElement('span');
        pending.className = 'unloquia-chat-sending';
        pending.textContent = 'Sending…';
        bubble.appendChild(pending);
      }

      container.appendChild(bubble);
    });

    if (state.open) {
      container.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  };

  const updatePanelVisibility = () => {
    if (state.open) {
      elements.panel.classList.add('is-open');
      elements.unread.style.display = 'none';
      state.unread = 0;
      if (state.isMobile) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      elements.panel.classList.remove('is-open');
      if (state.isMobile) {
        document.body.style.overflow = '';
      }
    }
    renderMessages();
  };

  const setInput = (value) => {
    state.input = value;
    elements.input.value = value;
    elements.submit.disabled = !value.trim() || state.loading;
  };

  const acknowledgePending = (messages) => {
    const normalized = new Set(
      messages
        .filter((msg) => msg.sender === 'user')
        .map((msg) => normalize(msg.text))
    );

    state.pending = state.pending.filter(
      (pending) => !normalized.has(normalize(pending.text))
    );
  };

  const applyMessages = (records) => {
    const deduped = state.ignoreSinceNext ? [] : [...state.messages];
    const seen = new Set(deduped.map(createMessageKey));
    const botRecent = new Map();
    const now = Date.now();

    deduped.forEach((msg) => {
      if (msg.sender === 'bot') {
        const ts = Date.parse(msg.createdAt);
        if (!Number.isNaN(ts)) {
          botRecent.set(normalize(msg.text), ts);
        }
      }
    });

    let newest = state.since ? Date.parse(state.since) : Number.NEGATIVE_INFINITY;

    records.forEach((msg) => {
      const textKey = normalize(msg.text);
      const created = Date.parse(msg.createdAt);

      if (msg.sender === 'bot') {
        const previous = botRecent.get(textKey);
        if (previous !== undefined) {
          if (Number.isNaN(created) || Math.abs(created - previous) <= 30_000) {
            return;
          }
        }
      }

      const key = createMessageKey(msg);
      if (!seen.has(key)) {
        deduped.push(msg);
        seen.add(key);
        if (msg.sender === 'bot') {
          botRecent.set(textKey, Number.isNaN(created) ? now : created);
        }
      }

      if (!Number.isNaN(created) && created > newest) {
        newest = created;
      }
    });

    state.messages = deduped.sort((a, b) => {
      const aDate = Date.parse(a.createdAt);
      const bDate = Date.parse(b.createdAt);
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate) && aDate !== bDate) {
        return aDate - bDate;
      }
      return a.text.localeCompare(b.text);
    });

    if (newest > Number.NEGATIVE_INFINITY) {
      state.since = new Date(newest).toISOString();
    }

    acknowledgePending(records);

    const botCount = state.messages.filter((m) => m.sender === 'bot').length;
    if (!state.open) {
      const delta = botCount - state.botCount;
      if (delta > 0) {
        state.unread += delta;
        elements.unread.style.display = 'flex';
        elements.unread.textContent = String(state.unread);
      }
    }
    state.botCount = botCount;

    renderMessages();
  };

  const fetchMessages = async () => {
    if (state.fetching) {
      return;
    }
    state.fetching = true;

    const params = new URLSearchParams({
      clientId,
      sessionId,
      limit: '200',
    });
    if (state.since && !state.ignoreSinceNext) {
      params.set('since', state.since);
    }

    try {
      const resp = await fetch(`${REST_BASE}messages?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!resp.ok) {
        console.error('[UnloquiaChat] Failed to fetch messages', resp.status);
        return;
      }

      const data = await resp.json();
      const rows = Array.isArray(data.messages) ? data.messages : [];
      const normalised = rows
        .map((row, index) => normaliseRow(row, index))
        .filter(Boolean);
      applyMessages(normalised);
    } catch (error) {
      console.error('[UnloquiaChat] Fetch error', error);
    } finally {
      state.fetching = false;
      state.ignoreSinceNext = false;
    }
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    state.pending.push({
      id: messageId,
      messageId,
      sender: 'user',
      text: normalize(trimmed),
      createdAt,
      pending: true,
    });

    renderMessages();
    setInput('');
    state.loading = true;
    elements.submit.disabled = true;

    try {
      const resp = await fetch(`${REST_BASE}proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          messageId,
          userId: sessionId,
          text: trimmed,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        state.pending = state.pending.filter((msg) => msg.messageId !== messageId);
        alert(err.error || 'We could not send your message. Please try again.');
        renderMessages();
        return;
      }

      state.ignoreSinceNext = true;
      await fetchMessages();
    } catch (error) {
      console.error('[UnloquiaChat] Proxy error', error);
      state.pending = state.pending.filter((msg) => msg.messageId !== messageId);
      alert('Network error while sending your message.');
      renderMessages();
    } finally {
      state.loading = false;
      elements.submit.disabled = false;
    }
  };

  const normaliseRow = (row, index) => {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const roleValue = (row.role || row.message_role || row.direction || '').toString().toLowerCase();
    const sender = roleValue === 'bot' || roleValue === 'assistant' || roleValue === 'agent' || roleValue === 'outbound'
      ? 'bot'
      : 'user';

    const rawText = row.text || row.message ||
      (typeof row.body === 'string' ? row.body : row.body?.text) ||
      (typeof row.content === 'string' ? row.content : row.content?.text) ||
      row.payload?.text ||
      row.payload?.message;

    const text = normalize(toDisplayText(rawText));
    if (!text) {
      return null;
    }

    const createdAt = typeof row.created_at === 'string'
      ? row.created_at
      : typeof row.timestamp === 'string'
      ? row.timestamp
      : typeof row.createdAt === 'string'
      ? row.createdAt
      : new Date().toISOString();

    const messageId = typeof row.message_id === 'string'
      ? row.message_id
      : typeof row.messageId === 'string'
      ? row.messageId
      : undefined;

    return {
      id: messageId || `${sender}:${createdAt}:${text.slice(0, 32)}:${index.toString(16)}`,
      messageId,
      sender,
      text,
      createdAt,
      pending: false,
    };
  };

  const buildUI = () => {
    const root = document.getElementById('unloquia-chat-root');
    if (!root) {
      return;
    }

    const floating = document.createElement('div');
    floating.className = 'unloquia-chat-floating';
    floating.innerHTML = '<span aria-hidden="true">💬</span>';

    const unread = document.createElement('span');
    unread.className = 'unloquia-chat-unread';
    unread.style.display = 'none';
    unread.textContent = '0';
    floating.appendChild(unread);

    const panel = document.createElement('div');
    panel.className = 'unloquia-chat-panel';

    const header = document.createElement('div');
    header.className = 'unloquia-chat-header';
    header.innerHTML = '<h3>Let\'s chat</h3><p>Our team replies in minutes.</p>';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'unloquia-chat-close';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);

    const messages = document.createElement('div');
    messages.className = 'unloquia-chat-messages';

    const suggestions = document.createElement('div');
    suggestions.className = 'unloquia-chat-suggestions';

    const suggestionList = [
      "I'd like to automate my leads",
      'How does the WhatsApp bot integration work?',
      'Can I book a tailored demo?',
    ];

    suggestionList.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item;
      btn.addEventListener('click', () => {
        setInput(item);
        state.open = true;
        updatePanelVisibility();
      });
      suggestions.appendChild(btn);
    });

    const form = document.createElement('form');
    form.className = 'unloquia-chat-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your message...';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.innerHTML = 'Send';
    submit.disabled = true;

    form.appendChild(input);
    form.appendChild(submit);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(suggestions);
    panel.appendChild(form);

    root.appendChild(floating);
    root.appendChild(panel);

    elements.floating = floating;
    elements.panel = panel;
    elements.messages = messages;
    elements.input = input;
    elements.submit = submit;
    elements.unread = unread;

    floating.addEventListener('click', () => {
      state.open = true;
      updatePanelVisibility();
    });

    closeBtn.addEventListener('click', () => {
      state.open = false;
      updatePanelVisibility();
    });

    input.addEventListener('input', (event) => {
      setInput(event.target.value);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!state.input.trim() || state.loading) {
        return;
      }
      sendMessage(state.input);
    });

    window.addEventListener('resize', () => {
      state.isMobile = window.matchMedia('(max-width: 640px)').matches;
      updatePanelVisibility();
    });
  };

  const init = () => {
    if (!document.getElementById('unloquia-chat-root')) {
      const root = document.createElement('div');
      root.id = 'unloquia-chat-root';
      document.body.appendChild(root);
    }
    buildUI();
    updatePanelVisibility();
    fetchMessages();
    setInterval(fetchMessages, POLL_MS);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
