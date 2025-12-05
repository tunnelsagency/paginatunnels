/**
 * Unloquia Chat Widget v1.1.0
 *
 * Widget de chat universal para cualquier sitio web.
 * Compatible con: HTML, React, Next.js, Vue, Angular, WordPress, Shopify, etc.
 *
 * Uso basico:
 *   <script src="unloquia-chat.js" data-token="CLT-xxx"></script>
 *
 * Uso en SPA (React/Vue/Angular):
 *   UnloquiaChat.init({ token: 'CLT-xxx' }).then(() => console.log('Ready!'));
 *
 * @version 1.1.0
 * @license MIT
 */
(function (global, factory) {
    // UMD pattern - funciona con CommonJS, AMD, y browser globals
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.UnloquiaChat = factory();
    }
})(typeof window !== 'undefined' ? window : this, function () {
    'use strict';

    // ===========================================
    // GUARD: Solo ejecutar en browser
    // ===========================================
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return {
            init: function () { return Promise.reject(new Error('UnloquiaChat requires browser environment')); },
            open: function () { },
            close: function () { },
            toggle: function () { },
            destroy: function () { },
            on: function () { },
            isReady: false
        };
    }

    // ===========================================
    // CONFIGURACION
    // ===========================================
    var API_BASE = 'https://api.unloquia.com';
    var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    var TYPING_TIMEOUT_MS = 30000;
    var VERSION = '1.4.0';
    var DEFAULT_POLLING_INTERVAL = 5000;

    // ===========================================
    // UTILIDADES
    // ===========================================
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function generateId() {
        return 'unloquia-' + Math.random().toString(36).substr(2, 9);
    }

    // ===========================================
    // EVENT EMITTER
    // ===========================================
    var EventEmitter = {
        _events: {},
        on: function (event, callback) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(callback);
            return this;
        },
        off: function (event, callback) {
            if (!this._events[event]) return this;
            if (!callback) {
                this._events[event] = [];
            } else {
                this._events[event] = this._events[event].filter(function (cb) {
                    return cb !== callback;
                });
            }
            return this;
        },
        emit: function (event, data) {
            if (!this._events[event]) return;
            this._events[event].forEach(function (callback) {
                try { callback(data); } catch (e) { console.error('[UnloquiaChat] Event error:', e); }
            });
        },
        _resetEvents: function () {
            this._events = {};
        }
    };

    // ===========================================
    // ESTILOS
    // ===========================================
    function getStyles(primaryColor) {
        return '\
            .unloquia-widget-button {\
                position: fixed;\
                bottom: 20px;\
                right: 20px;\
                width: 60px;\
                height: 60px;\
                border-radius: 50%;\
                background: ' + primaryColor + ';\
                border: none;\
                cursor: pointer;\
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
                z-index: 99999;\
                display: flex;\
                align-items: center;\
                justify-content: center;\
                transition: transform 0.2s, box-shadow 0.2s;\
                font-family: inherit;\
            }\
            .unloquia-widget-button:hover {\
                transform: scale(1.05);\
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);\
            }\
            .unloquia-widget-button svg {\
                width: 28px;\
                height: 28px;\
                fill: white;\
            }\
            .unloquia-widget-container {\
                position: fixed;\
                bottom: 90px;\
                right: 20px;\
                width: 380px;\
                height: 520px;\
                background: white;\
                border-radius: 16px;\
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);\
                z-index: 99998;\
                display: none;\
                flex-direction: column;\
                overflow: hidden;\
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
            }\
            .unloquia-widget-container.unloquia-open {\
                display: flex;\
            }\
            .unloquia-widget-header {\
                background: ' + primaryColor + ';\
                color: white;\
                padding: 16px;\
                display: flex;\
                align-items: center;\
                gap: 12px;\
                flex-shrink: 0;\
            }\
            .unloquia-widget-header-avatar {\
                width: 40px;\
                height: 40px;\
                border-radius: 50%;\
                background: rgba(255,255,255,0.2);\
                display: flex;\
                align-items: center;\
                justify-content: center;\
                flex-shrink: 0;\
            }\
            .unloquia-widget-header-info {\
                flex: 1;\
                min-width: 0;\
            }\
            .unloquia-widget-header-info h3 {\
                margin: 0;\
                font-size: 16px;\
                font-weight: 600;\
                white-space: nowrap;\
                overflow: hidden;\
                text-overflow: ellipsis;\
            }\
            .unloquia-widget-header-info p {\
                margin: 2px 0 0;\
                font-size: 12px;\
                opacity: 0.8;\
            }\
            .unloquia-widget-close {\
                background: none;\
                border: none;\
                color: white;\
                cursor: pointer;\
                padding: 4px;\
                opacity: 0.8;\
                flex-shrink: 0;\
            }\
            .unloquia-widget-close:hover {\
                opacity: 1;\
            }\
            .unloquia-widget-messages {\
                flex: 1;\
                overflow-y: auto;\
                padding: 16px;\
                display: flex;\
                flex-direction: column;\
                gap: 12px;\
                background: #f9fafb;\
            }\
            .unloquia-message {\
                max-width: 80%;\
                padding: 10px 14px;\
                border-radius: 16px;\
                font-size: 14px;\
                line-height: 1.4;\
                word-wrap: break-word;\
                animation: unloquiaFadeIn 0.2s ease;\
            }\
            @keyframes unloquiaFadeIn {\
                from { opacity: 0; transform: translateY(8px); }\
                to { opacity: 1; transform: translateY(0); }\
            }\
            .unloquia-message.unloquia-user {\
                background: ' + primaryColor + ';\
                color: white;\
                align-self: flex-end;\
                border-bottom-right-radius: 4px;\
            }\
            .unloquia-message.unloquia-bot {\
                background: white;\
                color: #1F2937;\
                align-self: flex-start;\
                border-bottom-left-radius: 4px;\
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);\
            }\
            .unloquia-message.unloquia-typing {\
                background: white;\
                color: #6B7280;\
                align-self: flex-start;\
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);\
            }\
            .unloquia-typing-dots {\
                display: flex;\
                gap: 4px;\
                padding: 4px 0;\
            }\
            .unloquia-typing-dots span {\
                width: 6px;\
                height: 6px;\
                background: #9CA3AF;\
                border-radius: 50%;\
                animation: unloquiaBounce 1.4s infinite ease-in-out both;\
            }\
            .unloquia-typing-dots span:nth-child(1) { animation-delay: -0.32s; }\
            .unloquia-typing-dots span:nth-child(2) { animation-delay: -0.16s; }\
            @keyframes unloquiaBounce {\
                0%, 80%, 100% { transform: scale(0); }\
                40% { transform: scale(1); }\
            }\
            .unloquia-widget-input {\
                display: flex;\
                padding: 12px;\
                border-top: 1px solid #E5E7EB;\
                gap: 8px;\
                background: white;\
                flex-shrink: 0;\
            }\
            .unloquia-widget-input input {\
                flex: 1;\
                padding: 10px 14px;\
                border: 1px solid #E5E7EB;\
                border-radius: 24px;\
                font-size: 14px;\
                outline: none;\
                transition: border-color 0.2s;\
                min-width: 0;\
            }\
            .unloquia-widget-input input:focus {\
                border-color: ' + primaryColor + ';\
            }\
            .unloquia-widget-input input:disabled {\
                background: #f3f4f6;\
                cursor: not-allowed;\
            }\
            .unloquia-widget-input button {\
                width: 40px;\
                height: 40px;\
                border-radius: 50%;\
                background: ' + primaryColor + ';\
                border: none;\
                cursor: pointer;\
                display: flex;\
                align-items: center;\
                justify-content: center;\
                transition: filter 0.2s;\
                flex-shrink: 0;\
            }\
            .unloquia-widget-input button:hover {\
                filter: brightness(0.9);\
            }\
            .unloquia-widget-input button:disabled {\
                background: #9CA3AF;\
                cursor: not-allowed;\
            }\
            .unloquia-widget-input button svg {\
                width: 18px;\
                height: 18px;\
                fill: white;\
            }\
            @media (max-width: 420px) {\
                .unloquia-widget-container {\
                    width: calc(100vw - 20px);\
                    height: calc(100vh - 100px);\
                    right: 10px;\
                    bottom: 80px;\
                    border-radius: 12px;\
                }\
            }\
        ';
    }

    // ===========================================
    // CLASE PRINCIPAL
    // ===========================================
    function UnloquiaChatWidget() {
        this.config = null;
        this.userConfig = null;
        this.supabase = null;
        this.channel = null;
        this.messages = [];
        this.isOpen = false;
        this.isTyping = false;
        this.isReady = false;
        this.isDestroyed = false;
        this.typingTimeout = null;
        this.heartbeatInterval = null;
        this.visibilityHandler = null;
        this.elements = {};
        this.retryCount = 0;
        this.maxRetries = 10;
        this.instanceId = generateId();
        this._initPromise = null;
        this._initResolve = null;
        this._initReject = null;
    }

    // Heredar EventEmitter
    UnloquiaChatWidget.prototype = Object.create(EventEmitter);
    UnloquiaChatWidget.prototype.constructor = UnloquiaChatWidget;

    /**
     * Inicializa el widget
     * @param {Object} options - Opciones de configuracion
     * @param {string} options.token - Token de landing (requerido)
     * @param {string} [options.primaryColor] - Color principal (#hex)
     * @param {string} [options.botName] - Nombre del bot
     * @param {string} [options.welcomeMessage] - Mensaje de bienvenida
     * @returns {Promise} - Resuelve cuando el widget esta listo
     */
    UnloquiaChatWidget.prototype.init = function (options) {
        var self = this;

        // Si ya hay una promesa de init en progreso, retornarla
        if (this._initPromise) {
            return this._initPromise;
        }

        // Crear nueva promesa
        this._initPromise = new Promise(function (resolve, reject) {
            self._initResolve = resolve;
            self._initReject = reject;
        });

        // Reset si se destruyo previamente
        if (this.isDestroyed) {
            this._resetState();
        }

        // Obtener config de multiples fuentes
        this.userConfig = this._getConfig(options);

        if (!this.userConfig.token) {
            var error = new Error('UnloquiaChat: token is required. Use data-token attribute, UNLOQUIA_CONFIG, or init({ token: "..." })');
            console.error('[UnloquiaChat]', error.message);
            this._initReject(error);
            return this._initPromise;
        }

        // Iniciar async
        this._doInit();

        return this._initPromise;
    };

    UnloquiaChatWidget.prototype._getConfig = function (options) {
        options = options || {};

        // 1. Opciones pasadas directamente a init()
        // 2. window.UNLOQUIA_CONFIG
        // 3. data-token del script
        var globalConfig = window.UNLOQUIA_CONFIG || {};
        var scriptToken = this._getScriptToken();

        return {
            token: options.token || globalConfig.token || scriptToken || null,
            primaryColor: options.primaryColor || globalConfig.primaryColor || '#4F46E5',
            botName: options.botName || globalConfig.botName || null,
            welcomeMessage: options.welcomeMessage || globalConfig.welcomeMessage || null,
            position: options.position || globalConfig.position || 'bottom-right'
        };
    };

    UnloquiaChatWidget.prototype._getScriptToken = function () {
        // Intentar obtener de data-token
        var scripts = document.querySelectorAll('script[data-token]');
        for (var i = 0; i < scripts.length; i++) {
            var token = scripts[i].getAttribute('data-token');
            if (token && token.startsWith('CLT-')) {
                return token;
            }
        }
        // Fallback: buscar script por src
        var allScripts = document.querySelectorAll('script[src*="unloquia-chat"]');
        for (var j = 0; j < allScripts.length; j++) {
            var t = allScripts[j].getAttribute('data-token');
            if (t) return t;
        }
        return null;
    };

    UnloquiaChatWidget.prototype._resetState = function () {
        this.config = null;
        this.supabase = null;
        this.channel = null;
        this.messages = [];
        this.isOpen = false;
        this.isTyping = false;
        this.isReady = false;
        this.isDestroyed = false;
        this.typingTimeout = null;
        this.heartbeatInterval = null;
        this.visibilityHandler = null;
        this.elements = {};
        this.retryCount = 0;
        this._initPromise = null;
        this._resetEvents();
    };

    UnloquiaChatWidget.prototype._doInit = async function () {
        try {
            console.log('[UnloquiaChat] v' + VERSION + ' - Validando token...');

            var resp = await fetch(API_BASE + '/api/landing-tokens/validate/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.userConfig.token })
            });

            if (!resp.ok) {
                throw new Error('HTTP ' + resp.status);
            }

            this.config = await resp.json();

            if (!this.config.valid) {
                throw new Error(this.config.error || 'Token invalido');
            }

            await this._loadSupabase();

            // Inicializar cliente Supabase (Solo REST, sin Realtime options)
            var realtime = this.config.realtime;
            this.supabase = window.supabase.createClient(realtime.supabase_url, realtime.supabase_anon_key, {
                realtime: {
                    // Desactivar explícitamente websocket si es posible por config, 
                    // aunque al no suscribir canales no debería conectar.
                    autoRefreshToken: false
                }
            });

            // Configurar polling
            var pollingConfig = this.config.polling || {};
            var interval = pollingConfig.interval || DEFAULT_POLLING_INTERVAL;

            console.log('[UnloquiaChat] Iniciando Widget en modo POLLING (Intervalo: ' + interval + 'ms)');

            // Cargar mensajes iniciales
            await this._loadExistingMessages(realtime.session_id);

            // Iniciar loop de polling
            this._startPolling(realtime.session_id, interval);

            this._injectStyles();
            this._render();

            this.isReady = true;
            console.log('[UnloquiaChat] Widget ready!');

            this.emit('ready', { instanceId: this.instanceId });
            this._initResolve(this);

        } catch (e) {
            console.error('[UnloquiaChat] Init error:', e.message);
            this.emit('error', { error: e });
            this._initReject(e);
        }
    };

    UnloquiaChatWidget.prototype._loadSupabase = function () {
        return new Promise(function (resolve, reject) {
            if (window.supabase) {
                return resolve();
            }
            var script = document.createElement('script');
            script.src = SUPABASE_JS;
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error('Failed to load Supabase client'));
            };
            document.head.appendChild(script);
        });
    };

    // _connectRealtime ELIMINADO
    // _subscribeRealtime ELIMINADO
    // _setupConnectionKeepAlive ELIMINADO

    UnloquiaChatWidget.prototype._loadExistingMessages = async function (sessionId) {
        try {
            // console.log('[UnloquiaChat] Cargando mensajes iniciales...');

            var result = await this.supabase
                .from('chat_messages')
                .select('id, role, message, created_at')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (result.error) {
                console.error('[UnloquiaChat] Error cargando mensajes:', result.error.message);
                return;
            }

            if (result.data && result.data.length > 0) {
                this.messages = [];
                var self = this;
                result.data.forEach(function (msg) {
                    if (!self.messages.find(function (m) { return m.id === msg.id; })) {
                        self.messages.push(msg);
                    }
                });
                this._renderMessages();
            }
        } catch (e) {
            console.error('[UnloquiaChat] Error cargando mensajes:', e.message);
        }
    };

    // =============================================
    // POLLING ENGINE - Mecanismo principal
    // =============================================
    UnloquiaChatWidget.prototype._startPolling = function (sessionId, interval) {
        if (this.pollingInterval) return;

        var self = this;
        var pollInterval = interval || 5000;

        var getLastMessageTime = function () {
            if (self.messages.length > 0) {
                var realMessages = self.messages.filter(function (m) {
                    return m.id && String(m.id).indexOf('temp-') !== 0;
                });
                if (realMessages.length > 0) {
                    return realMessages[realMessages.length - 1].created_at;
                }
            }
            return null;
        };

        this.pollingInterval = setInterval(async function () {
            if (self.isDestroyed) {
                clearInterval(self.pollingInterval);
                return;
            }

            // Optimización: Solo polling si visible y abierto
            if (document.visibilityState !== 'visible' || !self.isOpen) return;

            try {
                var lastTime = getLastMessageTime();

                var query = self.supabase
                    .from('chat_messages')
                    .select('id, role, message, created_at')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true });
                // Solo traer mensajes nuevos si ya tenemos alguno
                if (lastTime) {
                    // FIX: Restar 10 segundos al lastTime para asegurar solapamiento
                    // Esto corrige problemas de sincronización de relojes entre servidor y cliente
                    var safetyTime = new Date(new Date(lastTime).getTime() - 10000).toISOString();
                    query = query.gt('created_at', safetyTime);
                }

                var result = await query;

                if (result.data && result.data.length > 0) {
                    var hasNew = false;
                    result.data.forEach(function (msg) {
                        if (!self.messages.find(function (m) { return m.id === msg.id; })) {
                            console.log('[UnloquiaChat] Nuevo mensaje:', msg.role);
                            self._onNewMessage(msg);
                            hasNew = true;
                        }
                    });

                    if (hasNew) {
                        setTimeout(function () { self._renderMessages(); }, 100);
                    }
                }
            } catch (e) {
                // Silent catch
            }
        }, pollInterval);
    };

    UnloquiaChatWidget.prototype._onNewMessage = function (msg) {
        var self = this;
        if (this.messages.find(function (m) { return m.id === msg.id; })) return;

        if (msg.role === 'bot' || msg.role === 'agent') {
            console.log('[UnloquiaChat] Mensaje recibido:', msg.role);
            this._clearTypingTimeout();
            this.isTyping = false;
            this.messages.push(msg);
            this._renderMessages();
            this.emit('message', { message: msg, role: msg.role });
        }
    };

    UnloquiaChatWidget.prototype._clearTypingTimeout = function () {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    };

    UnloquiaChatWidget.prototype._setTypingWithTimeout = function () {
        var self = this;
        this.isTyping = true;
        this._renderMessages();
        this._clearTypingTimeout();

        this.typingTimeout = setTimeout(function () {
            console.log('[UnloquiaChat] Typing timeout - bot may be paused or slow');
            self.isTyping = false;
            self._renderMessages();
        }, TYPING_TIMEOUT_MS);
    };

    UnloquiaChatWidget.prototype.sendMessage = async function (text) {
        if (!text || !text.trim()) return;
        if (!this.isReady) {
            console.warn('[UnloquiaChat] Widget not ready, cannot send message');
            return;
        }

        var userMsg = {
            id: 'temp-' + Date.now(),
            role: 'user',
            message: text,
            created_at: new Date().toISOString()
        };

        this.messages.push(userMsg);
        this._setTypingWithTimeout();

        if (this.elements.input) {
            this.elements.input.value = '';
        }

        this.emit('message:sent', { message: userMsg });

        try {
            console.log('[UnloquiaChat] Enviando mensaje...');

            var headers = { 'Content-Type': 'application/json' };
            var ingestHeaders = this.config.ingest.headers;
            for (var key in ingestHeaders) {
                if (ingestHeaders.hasOwnProperty(key)) {
                    headers[key] = ingestHeaders[key];
                }
            }

            var response = await fetch(this.config.ingest.url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    channel: 'landing',
                    client_id: this.config.client_id,
                    session_id: this.config.realtime.session_id,
                    conversation_id: this.config.realtime.session_id,
                    message: {
                        message_id: userMsg.id,
                        direction: 'inbound',
                        type: 'text',
                        timestamp: userMsg.created_at,
                        contact: {
                            wa_id: 'web-' + this.config.realtime.session_id,
                            profile_name: 'Web User'
                        },
                        content: { text: text }
                    }
                })
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            console.log('[UnloquiaChat] Mensaje enviado OK');

        } catch (e) {
            console.error('[UnloquiaChat] Error enviando:', e.message);
            this._clearTypingTimeout();
            this.isTyping = false;
            this._renderMessages();
            this.emit('error', { error: e, context: 'sendMessage' });
        }
    };

    UnloquiaChatWidget.prototype._injectStyles = function () {
        // Remover estilos anteriores si existen
        var existing = document.getElementById('unloquia-widget-styles');
        if (existing) existing.remove();

        var style = document.createElement('style');
        style.id = 'unloquia-widget-styles';
        style.textContent = getStyles(this.userConfig.primaryColor);
        document.head.appendChild(style);
    };

    UnloquiaChatWidget.prototype._render = function () {
        var self = this;

        // Boton flotante
        var btn = document.createElement('button');
        btn.className = 'unloquia-widget-button';
        btn.id = 'unloquia-btn-' + this.instanceId;
        btn.setAttribute('aria-label', 'Abrir chat');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
        btn.onclick = function () { self.toggle(); };
        document.body.appendChild(btn);
        this.elements.button = btn;

        // Contenedor del chat
        var botName = this.userConfig.botName || this.config.client_name || 'Asistente';
        var container = document.createElement('div');
        container.className = 'unloquia-widget-container';
        container.id = 'unloquia-container-' + this.instanceId;
        container.innerHTML = '\
            <div class="unloquia-widget-header">\
                <div class="unloquia-widget-header-avatar">\
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">\
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>\
                    </svg>\
                </div>\
                <div class="unloquia-widget-header-info">\
                    <h3>' + escapeHtml(botName) + '</h3>\
                    <p>Online</p>\
                </div>\
                <button class="unloquia-widget-close" aria-label="Cerrar chat">\
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">\
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>\
                    </svg>\
                </button>\
            </div>\
            <div class="unloquia-widget-messages"></div>\
            <div class="unloquia-widget-input">\
                <input type="text" placeholder="Escribe un mensaje..." />\
                <button aria-label="Enviar mensaje">\
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>\
                </button>\
            </div>\
        ';
        document.body.appendChild(container);

        this.elements.container = container;
        this.elements.messagesContainer = container.querySelector('.unloquia-widget-messages');
        this.elements.input = container.querySelector('.unloquia-widget-input input');
        this.elements.sendButton = container.querySelector('.unloquia-widget-input button');
        this.elements.closeButton = container.querySelector('.unloquia-widget-close');

        // Event listeners
        this.elements.sendButton.onclick = function () {
            self.sendMessage(self.elements.input.value);
        };
        this.elements.input.onkeypress = function (e) {
            if (e.key === 'Enter') {
                self.sendMessage(self.elements.input.value);
            }
        };
        this.elements.closeButton.onclick = function () {
            self.close();
        };

        // Mensaje de bienvenida
        var welcomeMsg = this.userConfig.welcomeMessage ||
            'Hola! Soy el asistente de ' + botName + '. En que puedo ayudarte?';
        this.messages.push({
            id: 'welcome',
            role: 'bot',
            message: welcomeMsg
        });
        this._renderMessages();
    };

    UnloquiaChatWidget.prototype._renderMessages = function () {
        if (!this.elements.messagesContainer) return;

        var container = this.elements.messagesContainer;
        container.innerHTML = '';

        var self = this;
        this.messages.forEach(function (msg) {
            var div = document.createElement('div');
            var roleClass = msg.role === 'user' ? 'unloquia-user' : 'unloquia-bot';
            div.className = 'unloquia-message ' + roleClass;

            var text = typeof msg.message === 'string'
                ? msg.message
                : (msg.message && msg.message.text ? msg.message.text : '');
            div.textContent = text;
            container.appendChild(div);
        });

        if (this.isTyping) {
            var typing = document.createElement('div');
            typing.className = 'unloquia-message unloquia-typing';
            typing.innerHTML = '<div class="unloquia-typing-dots"><span></span><span></span><span></span></div>';
            container.appendChild(typing);
        }

        container.scrollTop = container.scrollHeight;
    };

    // ===========================================
    // API PUBLICA
    // ===========================================

    UnloquiaChatWidget.prototype.open = function () {
        if (!this.isReady) {
            console.warn('[UnloquiaChat] Widget not ready');
            return;
        }
        if (!this.isOpen) {
            this.isOpen = true;
            this.elements.container.classList.add('unloquia-open');
            if (this.elements.input) {
                this.elements.input.focus();
            }
            this.emit('open');
        }
    };

    UnloquiaChatWidget.prototype.close = function () {
        if (this.isOpen) {
            this.isOpen = false;
            this.elements.container.classList.remove('unloquia-open');
            this.emit('close');
        }
    };

    UnloquiaChatWidget.prototype.toggle = function () {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    };

    UnloquiaChatWidget.prototype.destroy = function () {
        console.log('[UnloquiaChat] Destroying widget...');
        this.isDestroyed = true;
        this.isReady = false;

        this._clearTypingTimeout();

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Detener polling fallback
        this._stopPolling();

        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        if (this.channel && this.supabase) {
            try { this.supabase.removeChannel(this.channel); } catch (e) { }
        }

        this.isConnected = false;

        // Remover elementos DOM
        if (this.elements.button) this.elements.button.remove();
        if (this.elements.container) this.elements.container.remove();

        var styles = document.getElementById('unloquia-widget-styles');
        if (styles) styles.remove();

        this.elements = {};
        this._initPromise = null;

        this.emit('destroy');
        this._resetEvents();

        console.log('[UnloquiaChat] Widget destroyed');
    };

    // Getter para version
    UnloquiaChatWidget.prototype.getVersion = function () {
        return VERSION;
    };

    // ===========================================
    // SINGLETON Y AUTO-INIT
    // ===========================================
    var instance = new UnloquiaChatWidget();

    // Auto-inicializar si hay token disponible
    function autoInit() {
        var globalConfig = window.UNLOQUIA_CONFIG || {};
        var hasToken = globalConfig.token || instance._getScriptToken();

        if (hasToken) {
            instance.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        // Dar tiempo a que se defina UNLOQUIA_CONFIG
        setTimeout(autoInit, 0);
    }

    return instance;
});
