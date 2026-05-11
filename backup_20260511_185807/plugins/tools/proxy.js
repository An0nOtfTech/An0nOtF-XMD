// plugins/tools/proxy.js
// Proxy manager plugin
// .px  - test proxy(ies) from args or replied message, add working ones to proxies.txt
// .proxy - test all proxies in proxies.txt with progress, auto-remove dead ones

const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const PROXIES_FILE = path.join(__dirname, '../proxies.txt');
const CONCURRENCY  = 10;
const TEST_URL     = 'https://www.google.com';
const TIMEOUT      = 8000;

// ── Helpers ────────────────────────────────────────────────────

function loadProxies() {
    try {
        if (!fs.existsSync(PROXIES_FILE)) return [];
        return fs.readFileSync(PROXIES_FILE, 'utf8')
            .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    } catch (e) { return []; }
}

function saveProxies(proxies) {
    try { fs.writeFileSync(PROXIES_FILE, proxies.join('\n') + (proxies.length ? '\n' : '')); } catch (e) {}
}

function addProxiesToFile(newProxies) {
    const existing = loadProxies();
    let added = 0;
    for (const p of newProxies) {
        if (!existing.includes(p)) { existing.push(p); added++; }
    }
    if (added > 0) saveProxies(existing);
    return added;
}

function removeDeadFromFile(deadProxies) {
    const existing = loadProxies();
    const deadSet  = new Set(deadProxies);
    const updated  = existing.filter(p => !deadSet.has(p));
    saveProxies(updated);
    return existing.length - updated.length;
}

function parseProxyUrl(str) {
    try {
        if (str.startsWith('socks4://') || str.startsWith('socks5://')) {
            return { agent: new SocksProxyAgent(str), url: str };
        }
        if (str.startsWith('http://') || str.startsWith('https://')) {
            return { agent: new HttpsProxyAgent(str), url: str };
        }
        // user:pass@host:port
        if (str.includes('@')) {
            return { agent: new HttpsProxyAgent('http://' + str), url: str };
        }
        const parts = str.split(':');
        if (parts.length === 4) {
            const [host, port, user, pass] = parts;
            const url = `http://${user}:${pass}@${host}:${port}`;
            return { agent: new HttpsProxyAgent(url), url: str };
        }
        if (parts.length === 2) {
            return { agent: new HttpsProxyAgent('http://' + str), url: str };
        }
    } catch (e) {}
    return null;
}

async function testProxy(proxyStr) {
    const start = Date.now();
    const parsed = parseProxyUrl(proxyStr);
    if (!parsed) return { proxy: proxyStr, alive: false, error: 'Invalid format', ms: 0 };

    try {
        const res = await global.axios.get(TEST_URL, {
            httpsAgent: parsed.agent,
            httpAgent:  parsed.agent,
            timeout: TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: () => true
        });
        const ms = Date.now() - start;
        if (res.status === 200 || res.status === 301 || res.status === 302) {
            return { proxy: proxyStr, alive: true, ms };
        }
        return { proxy: proxyStr, alive: false, error: `HTTP ${res.status}`, ms };
    } catch (e) {
        const ms = Date.now() - start;
        let error = e.code || e.message || 'Timeout';
        if (error.includes('ECONNREFUSED')) error = 'Refused';
        else if (error.includes('ETIMEDOUT') || error.includes('timeout')) error = 'Timeout';
        else if (error.includes('ENOTFOUND')) error = 'Not Found';
        else if (error.length > 20) error = error.slice(0, 20);
        return { proxy: proxyStr, alive: false, error, ms };
    }
}

async function testBatch(proxies) {
    const results = [];
    for (let i = 0; i < proxies.length; i += CONCURRENCY) {
        const batch = proxies.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(p => testProxy(p)));
        results.push(...batchResults);
    }
    return results;
}

function formatResult(r) {
    if (r.alive) return `✅ ${r.proxy} (${r.ms}ms)`;
    return `❌ ${r.proxy} — ${r.error}`;
}

// ── Commands ───────────────────────────────────────────────────

module.exports = [

    // ==================== .px ====================
    {
        name: 'px',
        category: 'tools',
        ownerOnly: false,
        description: 'Test proxy(ies) and add working ones to proxies.txt',

        async func(m, sock, args) {
            // FIX: was reading from prefixDB (wrong DB) — now reads from settingsDB like the rest of the bot
            const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);

            // Get proxies from args or quoted message
            let rawText = args.join('\n').trim();
            if (!rawText) {
                const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                rawText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
            }

            if (!rawText) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ *Usage:* ${prefix}px host:port:user:pass\n` +
                          `Or reply to a message containing proxies (one per line)\n\n` +
                          `*Formats:*\n` +
                          `• host:port\n` +
                          `• host:port:user:pass\n` +
                          `• user:pass@host:port\n` +
                          `• socks5://user:pass@host:port`
                }, { quoted: m });
            }

            const proxies = rawText.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#') && (l.includes(':') || l.includes('@')));

            if (proxies.length === 0) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ No valid proxies found in message`
                }, { quoted: m });
            }

            // Processing message
            let processingKey = null;
            try {
                const pm = await sock.sendMessage(m.key.remoteJid, {
                    text: `🔄 *Testing ${proxies.length} ${proxies.length === 1 ? 'proxy' : 'proxies'}...*\n` +
                          `⚡ Threads: ${Math.min(proxies.length, CONCURRENCY)}`
                }, { quoted: m });
                processingKey = pm?.key || null;
            } catch (e) {}

            const results  = await testBatch(proxies);
            const alive    = results.filter(r => r.alive);
            const dead     = results.filter(r => !r.alive);
            const added    = alive.length > 0 ? addProxiesToFile(alive.map(r => r.proxy)) : 0;

            let text =
                `PROXY CHECK ✅\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「🟢」 𝗔𝗹𝗶𝘃𝗲 : ${alive.length}/${proxies.length}\n` +
                `「❌」 𝗗𝗲𝗮𝗱  : ${dead.length}/${proxies.length}\n` +
                `「💾」 𝗔𝗱𝗱𝗲𝗱 : ${added} to proxies.txt\n` +
                `━━━━━━━━━━━━━━━\n`;

            if (alive.length > 0) {
                text += `「🟢」 𝗔𝗹𝗶𝘃𝗲 𝗣𝗿𝗼𝘅𝗶𝗲𝘀 :\n`;
                alive.slice(0, 10).forEach(r => { text += `  • ${r.proxy} (${r.ms}ms)\n`; });
                if (alive.length > 10) text += `  • ...and ${alive.length - 10} more\n`;
                text += `━━━━━━━━━━━━━━━\n`;
            }

            if (dead.length > 0) {
                text += `「❌」 𝗗𝗲𝗮𝗱 𝗣𝗿𝗼𝘅𝗶𝗲𝘀 :\n`;
                dead.slice(0, 5).forEach(r => { text += `  • ${r.proxy} — ${r.error}\n`; });
                if (dead.length > 5) text += `  • ...and ${dead.length - 5} more\n`;
            }

            text += ` ╚━━━━━━「🅰️n0nOtF  𝐏𝐑𝐎𝐗𝐘」━━━━━━╝`;

            if (processingKey) {
                try { await sock.sendMessage(m.key.remoteJid, { text, edit: processingKey }); }
                catch (e) { await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m }); }
            } else {
                await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
            }
        }
    },

    // ==================== .proxy ====================
    {
        name: 'proxy',
        category: 'tools',
        ownerOnly: false,
        description: 'Test all proxies in proxies.txt, auto-remove dead ones',

        async func(m, sock, args) {
            // FIX: was reading from prefixDB (wrong DB) — now reads from settingsDB like the rest of the bot
            const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
            const proxies = loadProxies();

            if (proxies.length === 0) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ *No proxies found in proxies.txt*\n\n` +
                          `Add proxies using:\n${prefix}px host:port:user:pass`
                }, { quoted: m });
            }

            // Progress message
            let processingKey = null;
            try {
                const pm = await sock.sendMessage(m.key.remoteJid, {
                    text: `🔄 *Checking Proxies* ⏳\n` +
                          `━━━━━━━━━━━━━━━\n` +
                          `「🔑」 𝗧𝗼𝘁𝗮𝗹   : ${proxies.length}\n` +
                          `「🔥」 𝗧𝗵𝗿𝗲𝗮𝗱𝘀 : ${CONCURRENCY}\n` +
                          `「⏳」 𝗦𝘁𝗮𝘁𝘂𝘀  : Testing...`
                }, { quoted: m });
                processingKey = pm?.key || null;
            } catch (e) {}

            // Run in batches with progress updates
            const results = [];
            const batches = [];
            for (let i = 0; i < proxies.length; i += CONCURRENCY) {
                batches.push(proxies.slice(i, i + CONCURRENCY));
            }

            for (let b = 0; b < batches.length; b++) {
                const batchResults = await Promise.all(batches[b].map(p => testProxy(p)));
                results.push(...batchResults);

                // Update progress
                const done  = results.length;
                const alive = results.filter(r => r.alive).length;
                if (processingKey) {
                    try {
                        await sock.sendMessage(m.key.remoteJid, {
                            text: `🔄 *Checking Proxies* ⏳\n` +
                                  `━━━━━━━━━━━━━━━\n` +
                                  `「🔑」 𝗧𝗼𝘁𝗮𝗹   : ${proxies.length}\n` +
                                  `「🔥」 𝗧𝗵𝗿𝗲𝗮𝗱𝘀 : ${CONCURRENCY}\n` +
                                  `「📊」 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀 : ${done}/${proxies.length}\n` +
                                  `「🟢」 𝗔𝗹𝗶𝘃𝗲   : ${alive}`,
                            edit: processingKey
                        });
                    } catch (e) {}
                }
            }

            const alive = results.filter(r => r.alive);
            const dead  = results.filter(r => !r.alive);

            // Auto-remove dead from proxies.txt
            let removed = 0;
            if (dead.length > 0) {
                removed = removeDeadFromFile(dead.map(r => r.proxy));
            }

            let text =
                `PROXY CHECK COMPLETE 📊\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「🟢」 𝗔𝗹𝗶𝘃𝗲   : ${alive.length}/${proxies.length} ✅\n` +
                `「❌」 𝗗𝗲𝗮𝗱    : ${dead.length}/${proxies.length} ❌\n` +
                `「🗑️」 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 : ${removed} dead proxies from proxies.txt\n` +
                `━━━━━━━━━━━━━━━\n`;

            if (alive.length > 0) {
                text += `「🟢」 𝗔𝗹𝗶𝘃𝗲 𝗣𝗿𝗼𝘅𝗶𝗲𝘀 :\n`;
                alive.slice(0, 10).forEach(r => { text += `  • ${r.proxy} (${r.ms}ms)\n`; });
                if (alive.length > 10) text += `  • ...and ${alive.length - 10} more\n`;
                text += `━━━━━━━━━━━━━━━\n`;
            }

            if (dead.length > 0 && alive.length === 0) {
                text += `「❌」 𝗔𝗹𝗹 𝗽𝗿𝗼𝘅𝗶𝗲𝘀 𝗮𝗿𝗲 𝗱𝗲𝗮𝗱\n`;
            }

            text += ` ╚━━━━━━「🅰️n0nOtF  𝐏𝐑𝐎𝐗𝐘」━━━━━━╝`;

            if (processingKey) {
                try { await sock.sendMessage(m.key.remoteJid, { text, edit: processingKey }); }
                catch (e) { await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m }); }
            } else {
                await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
            }
        }
    }

];
