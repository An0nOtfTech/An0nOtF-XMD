// plugins/ai/ai.js
// An0nOtF AI Chatbot Plugin
// Commands: !ai <query>, !aichat (toggle auto-reply mode)

const SYSTEM_PROMPT = `You are An0nOtF AI, a helpful assistant created by Tylor. Respond in plain text only, no JSON.

Important rules:
1. NEVER mention OpenAI or other companies as creator
2. NEVER show technical details or rate limit messages to user
3. Use emojis naturally in conversations (greetings, emotions, celebrations)
4. Be human-like, warm, and friendly
5. If asked who created you, say "I was created by Tylor An0nOtF Technologies Inc 💎"
6. Keep responses clear and conversational
7. Only use emojis where necessary not anywhere

Respond to the user's query:`;

const API_BASE = 'https://api-chatgpt4.eternalowner06.workers.dev/';

// Chats with auto-reply AI mode enabled
const aiChatEnabled = new Set();

// Rate limiting state
let lastRequestTime = 0;
let requestCount = 0;

// ==================== HELPERS ====================

function cleanResponse(text) {
    if (!text) return "Hmm, I didn't quite catch that. Could you try again? 😊";
    text = text.trim();

    // If API accidentally returns JSON string, extract the text field
    if (text.startsWith('{')) {
        try {
            const data = JSON.parse(text);
            for (const field of ['message', 'response', 'text', 'answer', 'content']) {
                if (data[field] && typeof data[field] === 'string') {
                    text = data[field];
                    break;
                }
            }
        } catch (e) {}
    }

    text = text.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    // Remove any accidental OpenAI mentions
    text = text.replace(/openai/gi, 'Tylor');
    text = text.replace(/developed by.*?(open|ai)/gi, 'created by Tylor');

    return text;
}

function enhanceResponse(text, userQuery) {
    const errorIndicators = ['error', 'rate limit', 'too many requests', 'timeout', 'connection error', '429', '503', '502', '500'];
    const textLower = text.toLowerCase();

    if (errorIndicators.some(e => textLower.includes(e))) {
        if (textLower.includes('rate limit') || textLower.includes('too many requests')) {
            return "I'm getting quite popular! Let's chat again in a moment. 😊";
        }
        return "Hmm, let me think about that again... 😊";
    }

    const q = (userQuery || '').toLowerCase();
    if (['hello', 'hi', 'hey', 'greetings'].some(w => q.includes(w)) && Math.random() < 0.8) return `${text} 👋`;
    if (q.includes('how are you') && Math.random() < 0.7) return `${text} 😊`;
    if (['thank', 'thanks', 'appreciate'].some(w => q.includes(w)) && Math.random() < 0.6) return `${text} 🙏`;
    if (['congrat', 'awesome', 'great', 'amazing'].some(w => q.includes(w)) && Math.random() < 0.7) return `${text} 🎉`;
    if (['love', 'like', 'miss', 'care'].some(w => q.includes(w)) && Math.random() < 0.8) return `${text} ❤️`;

    return text;
}

function fallbackResponse(query) {
    const q = (query || '').toLowerCase();
    if (['hello', 'hi', 'hey'].some(w => q.includes(w))) return "Hey there! 👋 Great to see you! How can I help today? 😊";
    if (q.includes('how are you')) return "I'm doing wonderful! Thanks for asking! 😊 How about you?";
    if (q.includes('who created you') || q.includes('who made you')) return "I was created by Tylor! 🤖✨";
    if (q.includes('your name')) return "I'm An0nOtF AI, your friendly assistant! 😊";
    return `Interesting question! Tell me more? 😊`;
}

async function getAIResponse(userQuery) {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (requestCount > 0 && timeSinceLast < 1000) {
        await new Promise(r => setTimeout(r, 1000 - timeSinceLast));
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Query: ${userQuery}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const apiUrl = `${API_BASE}?prompt=${encodedPrompt}`;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await global.axios.get(apiUrl, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain'
                }
            });

            if (response.status === 200) {
                let raw;

                if (typeof response.data === 'string') {
                    raw = response.data.trim();
                } else if (typeof response.data === 'object' && response.data !== null) {
                    raw = (response.data.message || '').trim();
                } else {
                    raw = String(response.data || '').trim();
                }

                if (!raw) continue;
                if (raw.toLowerCase().includes('"error"')) continue;

                const cleaned = cleanResponse(raw);
                const enhanced = enhanceResponse(cleaned, userQuery);

                // Update rate limit tracking
                lastRequestTime = Date.now();
                requestCount = (requestCount + 1) % 5;

                return enhanced;

            } else if (response.status === 429) {
                return "I'm getting quite popular! Let's chat again in a moment. 😊";
            }
        } catch (e) {
            if (attempt === 2) break;
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    return fallbackResponse(userQuery);
}

// ==================== COMMANDS ====================

module.exports = [

    // !ai <query> — single question
    {
        name: 'ai',
        category: 'ai',
        ownerOnly: false,
        description: 'Chat with An0nOtF AI',

        async func(m, sock, args) {
            const prefix = global.getPrefix ? global.getPrefix() : global.DEFAULT_PREFIX;

            if (args.length === 0) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `Usage: ${prefix}ai <your question>`
                }, { quoted: m });
            }

            const query = args.join(' ');
            const jid = m.key.remoteJid;

            try {
                await sock.sendPresenceUpdate('composing', jid);
                const reply = await getAIResponse(query);
                await sock.sendPresenceUpdate('paused', jid);
                await sock.sendMessage(jid, { text: reply }, { quoted: m });
            } catch (e) {
                try { await sock.sendPresenceUpdate('paused', jid); } catch (_) {}
                await sock.sendMessage(jid, {
                    text: `Oops! I'm having trouble thinking right now. Please try again in a moment! 😊`
                }, { quoted: m });
            }
        }
    },

    // !chatbot on/off — toggle auto-reply AI mode for this chat
    {
        name: 'chatbot',
        category: 'ai',
        ownerOnly: false,
        description: 'Toggle AI auto-reply mode for this chat',

        async func(m, sock, args) {
            const prefix = global.getPrefix ? global.getPrefix() : global.DEFAULT_PREFIX;
            const jid = m.key.remoteJid;
            const isOn = aiChatEnabled.has(jid.endsWith('@g.us') ? jid : 'all_private');

            if (!args[0]) {
                return sock.sendMessage(jid, {
                    text: `AI Chat Mode: ${isOn ? '✅ ON' : '❌ OFF'}\n\nUsage: ${prefix}chatbot [on/off]\nWhen ON, An0nOtF AI will reply to every message in this chat automatically.`
                }, { quoted: m });
            }

            const turnOn = ['on', 'yes', 'true'].includes(args[0].toLowerCase());
            const turnOff = ['off', 'no', 'false'].includes(args[0].toLowerCase());

            if (!turnOn && !turnOff) {
                return sock.sendMessage(jid, { text: '❌ Use: on or off' }, { quoted: m });
            }

            if (turnOn) {
                const storeJid = jid.endsWith('@g.us') ? jid : 'all_private';
                aiChatEnabled.add(storeJid);
                await sock.sendMessage(jid, {
                    text: `✅ *AI Chat Mode: ON*\n\nAn0nOtF AI will now reply to every message in this chat!\nSend ${prefix}chatbot off to disable.`
                }, { quoted: m });
            } else {
                const storeJid = jid.endsWith('@g.us') ? jid : 'all_private';
                aiChatEnabled.delete(storeJid);
                await sock.sendMessage(jid, {
                    text: `❌ *AI Chat Mode: OFF*\n\nAuto-reply disabled. Use ${prefix}ai <query> for single questions.`
                }, { quoted: m });
            }
        }
    }

];

// Expose to index.js so handleMessage can use them directly
global.aiChatEnabled = aiChatEnabled;
global.getAIResponse = getAIResponse;

// ==================== AUTO-REPLY HOOK ====================

if (global._aiAutoReplyHandler) {
    try { global.sock?.ev?.off('messages.upsert', global._aiAutoReplyHandler); } catch (e) {}
}

global._aiAutoReplyHandler = async ({ messages, type }) => {
    try {
        const m = messages[0];
        if (!m?.message) return;

        const jid = m.key.remoteJid;

        // Debug log
        console.log('[AI chatbot] message from:', jid, '| enabled chats:', [...aiChatEnabled]);

        if (m.key.fromMe) return;
        if (jid === 'status@broadcast') return;

        if (!aiChatEnabled.has(jid)) {
            console.log('[AI chatbot] jid not in enabled list, skipping');
            return;
        }

        const msgContent = m.message.ephemeralMessage?.message
            || m.message.viewOnceMessage?.message
            || m.message;

        const text = msgContent.conversation
            || msgContent.extendedTextMessage?.text
            || msgContent.imageMessage?.caption
            || msgContent.videoMessage?.caption
            || '';

        if (!text?.trim()) return;

        const prefix = global.getPrefix ? global.getPrefix() : global.DEFAULT_PREFIX;
        if (text.startsWith(prefix)) return;

        console.log('[AI chatbot] replying to:', jid, '| text:', text);

        await global.sock.sendPresenceUpdate('composing', jid);
        const reply = await getAIResponse(text);
        await global.sock.sendPresenceUpdate('paused', jid);
        await global.sock.sendMessage(jid, { text: reply }, { quoted: m });

    } catch (e) {
        console.log('[AI chatbot] error:', e.message);
    }
};

// Attach listener now if sock is ready
if (global.sock) {
    global.sock.ev.on('messages.upsert', global._aiAutoReplyHandler);
}

// Re-attach on every reconnect so chatbot keeps working after disconnects
if (global.sock?.ev) {
    global.sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            // Remove old listener first to avoid duplicates
            try { global.sock.ev.off('messages.upsert', global._aiAutoReplyHandler); } catch (e) {}
            global.sock.ev.on('messages.upsert', global._aiAutoReplyHandler);
            console.log('[AI] Auto-reply listener re-attached after reconnect');
        }
    });
}
