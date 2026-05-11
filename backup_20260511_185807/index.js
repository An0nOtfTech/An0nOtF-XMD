// ==================== IMPORTS ====================
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

// ==================== PLATFORM COMPATIBILITY ====================
['temp', 'logs', 'plugins'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(color(`✅ Created ${dir} directory`, 'green'));
    }
});

// ==================== CONFIG ====================
const SESSION_NAME = 'An0nOtF-XMD-Session';
const FIRST_CONNECTION_FILE = 'first_connection.flag';
let OWNER_NUMBER = '254782701641';
let OWNER_NAME = 'An0nOtF XMD';
const DEFAULT_PREFIX = '!';
const BOT_NAME = '🅰️𝐧𝟎𝐧𝐎𝐭𝐅-𝐕𝟑 𝐗𝐌𝐃';
const DEVELOPER = 'An0nOtF Technologies Inc 💎';
const TELEGRAM = '@unknownnumeralx';
const GITHUB = 'An0nOtF-XMD';
const VERSION = '6.0.0';
const LOCATION = 'Kenya';

// ==================== GLOBAL STATE ====================
global.tempMails = {};
global.startTime = Date.now();
// FIX: expose as global so the alwaysonline command can start/stop it immediately
global.alwaysOnlineInterval = null;

// ==================== COLOR ====================
function color(text, clr) {
    const c = {
        red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
        blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
        white: '\x1b[37m', gray: '\x1b[90m', reset: '\x1b[0m'
    };
    return (c[clr] || c.green) + text + c.reset;
}
global.color = color;

console.log(color(`
╔══════════════════════════════════════════╗
║  🅰️n0nOtF-V3 XMD  v${VERSION}
║  Prefix  : ${DEFAULT_PREFIX}
║  Pair    : https://an0n0tf-xmd-pairing-server.vercel.app
╚══════════════════════════════════════════╝
`, 'cyan'));

// ==================== DATABASE ====================
class SimpleDB {
    constructor(file = 'database.json') {
        this.file = file;
        if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, '{}');
        try { this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')); }
        catch (e) { this.data = {}; }
    }
    save() { fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2)); }
    get(key, def = null) { return this.data[key] !== undefined ? this.data[key] : def; }
    set(key, value) { this.data[key] = value; this.save(); }
    has(key) { return key in this.data; }
    delete(key) { delete this.data[key]; this.save(); }
    getAll() { return this.data; }
}

const prefixDB  = new SimpleDB('prefixes.json');
const modeDB    = new SimpleDB('modes.json');
const settingsDB = new SimpleDB('settings.json');
const banDB     = new SimpleDB('bans.json');

// Expose globally so plugins can use them
global.prefixDB  = prefixDB;
global.modeDB    = modeDB;
global.settingsDB = settingsDB;
global.banDB     = banDB;
global.DEFAULT_PREFIX = DEFAULT_PREFIX;
global.SESSION_NAME   = SESSION_NAME;
global.BOT_NAME       = BOT_NAME;
global.DEVELOPER      = DEVELOPER;
global.TELEGRAM       = TELEGRAM;
global.GITHUB         = GITHUB;
global.VERSION        = VERSION;
global.LOCATION       = LOCATION;
global.downloadContentFromMessage = downloadContentFromMessage;
global.axios          = axios;

// Dynamic owner refs (plugins read these globals)
global.getOwnerNumber = () => OWNER_NUMBER;
global.getOwnerName   = () => OWNER_NAME;
global.setOwnerNumber = (n) => { OWNER_NUMBER = n; saveOwnerData(); };
global.setOwnerName   = (n) => { OWNER_NAME = n; saveOwnerData(); };

// ==================== UTILITIES ====================
function saveOwnerData() {
    fs.writeFileSync('owner.json', JSON.stringify({ number: OWNER_NUMBER, name: OWNER_NAME }, null, 2));
}
if (fs.existsSync('owner.json')) {
    try {
        const od = JSON.parse(fs.readFileSync('owner.json', 'utf8'));
        if (od.number) OWNER_NUMBER = od.number;
        if (od.name) OWNER_NAME = od.name;
    } catch (e) {}
}

function getUptime() {
    const uptime = Date.now() - global.startTime;
    const d = Math.floor(uptime / 86400000);
    const h = Math.floor((uptime % 86400000) / 3600000);
    const m = Math.floor((uptime % 3600000) / 60000);
    const s = Math.floor((uptime % 60000) / 1000);
    return { days: d, hours: h, minutes: m, seconds: s, formatted: `${d}d ${h}h ${m}m ${s}s` };
}
global.getUptime = getUptime;

function isOwner(jid, messageKey = null) {
    if (!jid) return false;
    // fromMe is the most reliable — covers @lid linked device messages
    if (messageKey?.fromMe) return true;
    // @lid JIDs don't contain phone numbers — skip number check for them
    if (jid.includes('@lid')) return false;
    const clean = OWNER_NUMBER.replace('+', '').trim();
    let num = jid.includes('@') ? jid.split('@')[0] : jid;
    num = num.replace('+', '').replace(/[^0-9]/g, '');
    return clean === num;
}
global.isOwner = isOwner;

function getMode(jid) { return modeDB.get('global', 'public'); }
function getSetting(key, def = false) { return settingsDB.get(key, def); }
function setSetting(key, val) { settingsDB.set(key, val); }
function getGlobalMenu() { return settingsDB.get('globalMenuImage', '1'); }
function setGlobalMenu(num) { settingsDB.set('globalMenuImage', num); }

global.getMode      = getMode;
global.getPrefix    = () => settingsDB.get('globalPrefix', DEFAULT_PREFIX);
global.getSetting   = getSetting;
global.setSetting   = setSetting;
global.getGlobalMenu = getGlobalMenu;
global.setGlobalMenu = setGlobalMenu;
global.SimpleDB     = SimpleDB;

  // ==================== ENV VAR SETTINGS (Heroku/Railway/Render) ====================
  // These run on every start so settings survive dyno restarts on cloud platforms.
  // VPS/terminal users: just ignore these — commands still work as normal.
  // Priority: ENV VAR > saved settings.json > default value
  (function applyEnvSettings() {
      const bool = v => v === 'true' || v === '1' || v === 'yes';

      // ── First-run defaults: these features are ON unless user turns them off ──
      // Only sets default if the key has never been saved before (first start)
      const onByDefault = ['autoviewstatus','autolikestatus','autotyping','autoreact','alwaysonline'];
      for (const key of onByDefault) {
          if (!settingsDB.has(key)) settingsDB.set(key, true);
      }

      // ── Env vars override everything (Heroku/Railway/Render config vars) ──
      if (process.env.PREFIX)           settingsDB.set('globalPrefix',    process.env.PREFIX);
      if (process.env.MODE)             settingsDB.set('globalMode',       process.env.MODE.toLowerCase());
      if (process.env.AUTO_VIEW_STATUS) settingsDB.set('autoviewstatus',   bool(process.env.AUTO_VIEW_STATUS));
      if (process.env.AUTO_LIKE_STATUS) settingsDB.set('autolikestatus',   bool(process.env.AUTO_LIKE_STATUS));
      if (process.env.AUTO_TYPING)      settingsDB.set('autotyping',       bool(process.env.AUTO_TYPING));
      if (process.env.AUTO_REACT)       settingsDB.set('autoreact',        bool(process.env.AUTO_REACT));
      if (process.env.ALWAYS_ONLINE)    settingsDB.set('alwaysonline',     bool(process.env.ALWAYS_ONLINE));
      if (process.env.BOT_NAME)         global.BOT_NAME = process.env.BOT_NAME;
      if (process.env.OWNER_NUMBER)     OWNER_NUMBER = process.env.OWNER_NUMBER.replace('+','').trim();
  })();

const question = prompt => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans); }));
};

function isFirstConnection() { return !fs.existsSync(FIRST_CONNECTION_FILE); }
function markConnectionDone() {
    if (!fs.existsSync(FIRST_CONNECTION_FILE))
        fs.writeFileSync(FIRST_CONNECTION_FILE, new Date().toISOString());
}

// ==================== PLUGIN LOADER ====================
const commands = {};
global.commands = commands;

function loadPlugins() {
    const pluginDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginDir)) return;

    let loaded = 0, failed = 0;

    function loadDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                loadDir(fullPath);
            } else if (entry.name.endsWith('.js')) {
                try {
                    // Clear cache so hot-reload works
                    delete require.cache[require.resolve(fullPath)];
                    const plugin = require(fullPath);

                    // Each plugin exports: { name, category, ownerOnly, description, func }
                    // OR an array of the above
                    const cmds = Array.isArray(plugin) ? plugin : [plugin];
                    for (const cmd of cmds) {
                        if (!cmd.name || !cmd.func) {
                            console.log(color(`⚠️ Plugin ${entry.name} missing name/func`, 'yellow'));
                            continue;
                        }
                        commands[cmd.name] = cmd;
                        console.log(color(`  ✅ Loaded: ${cmd.name} (${cmd.category || 'misc'})`, 'green'));
                        loaded++;
                    }
                } catch (e) {
                    console.log(color(`  ❌ Failed to load ${entry.name}: ${e.message}`, 'red'));
                    failed++;
                }
            }
        }
    }

    console.log(color('\n📦 Loading plugins...', 'cyan'));
    loadDir(pluginDir);
    console.log(color(`\n📊 ${loaded} commands loaded, ${failed} failed\n`, loaded > 0 ? 'green' : 'yellow'));
}

// Hot-reload: watch plugins folder for changes
function watchPlugins() {
    const pluginDir = path.join(__dirname, 'plugins');
    fs.watch(pluginDir, { recursive: true }, (event, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(color(`\n🔄 Plugin changed: ${filename} — reloading...`, 'yellow'));
            try {
                // Clear all plugin commands then reload
                for (const key of Object.keys(commands)) delete commands[key];
                loadPlugins();
                console.log(color(`✅ Hot-reload complete. ${Object.keys(commands).length} commands active.`, 'green'));
            } catch (e) {
                console.log(color(`❌ Hot-reload failed: ${e.message}`, 'red'));
            }
        }
    });
}

// ==================== SESSION EXPORT/RESTORE ====================
function exportSession() {
    try {
        const credsPath = path.join(SESSION_NAME, 'creds.json');
        if (!fs.existsSync(credsPath)) return null;
        const content = fs.readFileSync(credsPath, 'utf8');
        const text = `=== AN0NOTF SESSION ===\n${content}\n=== END SESSION ===`;
        fs.writeFileSync('An0nOtF.session', text);
        return text;
    } catch (e) { console.log(color('Error exporting session:', 'red'), e); return null; }
}
global.exportSession = exportSession;

function restoreSession(text) {
    try {
        const lines = text.split('\n');
        const json = []; let rec = false;
        for (const l of lines) {
            if (l.includes('=== AN0NOTF SESSION ===')) { rec = true; continue; }
            if (l.includes('=== END SESSION ===')) { rec = false; break; }
            if (rec) json.push(l);
        }
        const jsonStr = json.join('\n').trim();
        JSON.parse(jsonStr); // validate
        // Only create folder if it doesn't exist — never wipe existing session files
        if (!fs.existsSync(SESSION_NAME)) {
            fs.mkdirSync(SESSION_NAME, { recursive: true });
        }
        fs.writeFileSync(path.join(SESSION_NAME, 'creds.json'), jsonStr);
        console.log(color('✅ Session restored!', 'green'));
        return true;
    } catch (e) { console.log(color('Session restore failed:', 'red'), e.message); return false; }
}

// ==================== STATUS HANDLER ====================
const likeEmojis = ['😊','😁','😜','😍','🌟','💯','💫','🩵','💙','💜','💖','💗','💓','💞','💕','😼'];

async function handleStatusUpdate(m, sock) {
    try {
        const participant = m.key.participant;
        if (!participant) return;
        // Always use latest sock via global.sock to survive reconnects
        const activeSock = global.sock || sock;
        if (getSetting('autoviewstatus', false)) {
            try { await activeSock.readMessages([m.key]); } catch (e) {}
        }
        if (getSetting('autolikestatus', false)) {
            try {
                const emoji = likeEmojis[Math.floor(Math.random() * likeEmojis.length)];
                await activeSock.sendMessage('status@broadcast', { react: { text: emoji, key: m.key } }, { statusJidList: [participant] });
            } catch (e) {}
        }
    } catch (e) {}
}

// ==================== MESSAGE HANDLER ====================
async function handleMessage(m, sock) {
    try {
        if (!m.message) return;
        if (m.key.remoteJid.includes('@newsletter') || m.key.remoteJid.includes('@broadcast')) return;
        // Note: @lid messages are valid — linked device messages, process them normally

        // For @lid linked device messages in DMs, remoteJid IS the user
        const userId = m.key.participant || m.key.remoteJid;
        const userNumber = userId.split('@')[0];
        // Only ban-check non-lid JIDs (lid IDs aren't phone numbers)
        if (!userId.includes('@lid') && banDB.has(userNumber)) return;

        // Unwrap ephemeral / viewOnce / documentWithCaption nested messages
        const msgContent = m.message.ephemeralMessage?.message
            || m.message.viewOnceMessage?.message
            || m.message.viewOnceMessageV2?.message
            || m.message.documentWithCaptionMessage?.message
            || m.message;

        // Extract text from unwrapped content
        let text = msgContent.conversation
            || msgContent.extendedTextMessage?.text
            || msgContent.imageMessage?.caption
            || msgContent.videoMessage?.caption
            || msgContent.documentMessage?.caption
            || '';


        if (!text?.trim()) return;

        // Prefix is global — saved by setprefix in settingsDB as 'globalPrefix'
        const prefix = settingsDB.get('globalPrefix', DEFAULT_PREFIX);
        if (!text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        if (!commands[commandName]) {
            await sock.sendMessage(m.key.remoteJid, {
                text: `❌ Unknown command: ${prefix}${commandName}\nUse ${prefix}menu to see all commands.`
            }, { quoted: m });
            return;
        }

        const cmd = commands[commandName];
        const isOwnerUser = isOwner(userId, m.key);
        // Mode is global — saved by mode command in settingsDB as 'globalMode'
        const mode = settingsDB.get('globalMode', 'public');

        if (mode === 'private' && !isOwnerUser) {
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Bot is in private mode.' }, { quoted: m });
            return;
        }
        if (mode === 'pm' && m.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(m.key.remoteJid, { text: '❌ PM mode: use in private chat only.' }, { quoted: m });
            return;
        }
        if (cmd.ownerOnly && !isOwnerUser) {
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Owner only command!' }, { quoted: m });
            return;
        }

        if (getSetting('autotyping', false)) {
            try {
                // Use global.sock to always get latest socket after reconnect
                await (global.sock || sock).sendPresenceUpdate('composing', m.key.remoteJid);
                await delay(800);
                await (global.sock || sock).sendPresenceUpdate('paused', m.key.remoteJid);
            } catch (e) {}
        }

        // autoreact: react to every incoming command message with a random emoji
        if (getSetting('autoreact', false)) {
            try {
                const reactEmojis = ['👍','❤️','😂','😮','😢','🙏','🔥','💯','✅','👏','🎉','💎'];
                const emoji = reactEmojis[Math.floor(Math.random() * reactEmojis.length)];
                await (global.sock || sock).sendMessage(m.key.remoteJid, {
                    react: { text: emoji, key: m.key }
                });
            } catch (e) {}
        }

        console.log(color(`🚀 ${prefix}${commandName} from ${(m.key.participant || m.key.remoteJid).split('@')[0]}`, 'green'));
        await cmd.func(m, sock, args);

    } catch (error) {
        console.error(color('❌ handleMessage error:', 'red'), error);
        try {
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Error executing command. Try again.' }, { quoted: m });
        } catch (e) {}
    }
}

// ==================== WATCHDOG ====================
let _lastActivity = Date.now();
global._lastActivity = _lastActivity;

setInterval(() => {
    // If connection appears open but no events for 3 minutes, force reconnect
    const idle = Date.now() - global._lastActivity;
    if (global.sock && idle > 3 * 60 * 1000) {
        console.log(color(`⚠️ Watchdog: No activity for ${Math.floor(idle/1000)}s — forcing reconnect...`, 'yellow'));
        try { global.sock.ws?.close(); } catch (e) {}
        global.sock = null;
        scheduleRestart('Watchdog: connection went silent', 1000);
    }
}, 60 * 1000);

// ==================== MAIN BOT ====================
async function startBot() {
    console.log(color('🚀 Starting An0nOtF XMD...', 'cyan'));

    // FIX: Close previous socket cleanly before creating a new one.
    // Without this, old sockets pile up and WhatsApp silently stops
    // delivering messages to all of them after a few minutes.
    if (global.sock) {
        try { global.sock.ws?.close(1000, 'Reconnecting'); } catch (e) {}
        global.sock = null;
        await new Promise(r => setTimeout(r, 500));
    }

    // Session restore priority:
      // 1. SESSION env var → Heroku, Railway, Render (set in platform config vars)
      // 2. An0nOtF.session file → VPS/terminal users
      // 3. creds.json in root → alternative file
      // 4. Existing session folder → already paired before
      const credsExist = fs.existsSync(path.join(SESSION_NAME, 'creds.json'));
      if (!credsExist) {
          console.log(color('⚠️ No session found, attempting restore...', 'yellow'));

          // Priority 1: SESSION env var (Heroku/Railway/Render)
          if (process.env.SESSION) {
              console.log(color('🌐 SESSION env var detected — restoring...', 'cyan'));
              try {
                  const raw = process.env.SESSION.trim();
                  const content = raw.startsWith('=== AN0NOTF')
                      ? raw
                      : `=== AN0NOTF SESSION ===\n${raw}\n=== END SESSION ===`;
                  restoreSession(content);
              } catch (e) {
                  console.log(color('❌ Env var restore failed: ' + e.message, 'red'));
              }
          }

          // Priority 2 & 3: Local files (VPS/terminal — not affected by env var)
          if (!fs.existsSync(path.join(SESSION_NAME, 'creds.json'))) {
              for (const file of ['An0nOtF.session', 'creds.json']) {
                  if (fs.existsSync(file)) {
                      try {
                          let content = fs.readFileSync(file, 'utf8');
                          if (file === 'creds.json') content = `=== AN0NOTF SESSION ===\n${content}\n=== END SESSION ===`;
                          if (restoreSession(content)) break;
                      } catch (e) {}
                  }
              }
          }
      } else {
          console.log(color('✅ Session folder exists, using directly.', 'green'));
      }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_NAME);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            // Provide getMessage so Baileys can decrypt retried messages
            getMessage: async (key) => {
                return { conversation: '' };
            }
        });
        
        // Track bot start time to ignore replayed old messages
        const botStartTime = Date.now();

        // Make sock available to plugins
        global.sock = sock;

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrcode.generate(qr, { small: true });
                console.log(color('📱 Scan QR code above with WhatsApp', 'cyan'));
            }

            // FIX: any connection event means the socket is alive — reset watchdog
            global._lastActivity = Date.now();

            if (connection === 'connecting') console.log(color('🔄 Connecting...', 'yellow'));

            if (connection === 'open') {
                console.log(color('✅ Connected!', 'green'));
                if (sock.user?.id) {
                    OWNER_NUMBER = sock.user.id.split(':')[0];
                    OWNER_NAME = sock.user.name || sock.user.verifiedName || 'An0nOtF XMD';
                    saveOwnerData();
                    console.log(color(`👤 +${OWNER_NUMBER} (${OWNER_NAME})`, 'cyan'));
                    try {
                        await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                            text: `✅ *${BOT_NAME} Connected!*\n\n👑 Owner: +${OWNER_NUMBER}\n🔧 Prefix: ${DEFAULT_PREFIX}\n📦 Commands: ${Object.keys(commands).length}\n\nUse ${DEFAULT_PREFIX}menu to see all commands.`
                        });
                    } catch (e) {}
                }

                // alwaysonline
                if (getSetting('alwaysonline', false)) {
                    if (global.alwaysOnlineInterval) clearInterval(global.alwaysOnlineInterval);
                    global.alwaysOnlineInterval = setInterval(async () => {
                        try { await (global.sock || sock).sendPresenceUpdate('available'); } catch (e) {}
                    }, 60000);
                }
                
                // Clean up old session sender key files to save storage
                // Keep only essential files: creds.json, app-state-sync-*, pre-keys
                try {
                    const sessionDir = SESSION_NAME;
                    const files = fs.readdirSync(sessionDir);
                    let removed = 0;
                    for (const f of files) {
                        // Remove individual sender session files (session-*.json)
                        // These are recreated automatically and cause storage bloat
                        if (f.startsWith('session-') && f.endsWith('.json')) {
                            const filePath = path.join(sessionDir, f);
                            const stat = fs.statSync(filePath);
                            const ageMs = Date.now() - stat.mtimeMs;
                            // Remove session files older than 7 days
                            if (ageMs > 7 * 24 * 60 * 60 * 1000) {
                                fs.rmSync(filePath, { force: true });
                                removed++;
                            }
                        }
                    }
                    if (removed > 0) console.log(color(`🧹 Cleaned ${removed} old session files`, 'gray'));
                } catch (e) {}

                if (isFirstConnection()) {
                    const sessionText = exportSession();
                    if (sessionText) {
                        try {
                            await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                                text: `🎉 *First Connection!*\n👤 +${OWNER_NUMBER}\n🔧 Prefix: ${DEFAULT_PREFIX}`
                            });
                            await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                                document: fs.readFileSync('An0nOtF.session'),
                                fileName: 'An0nOtF.session',
                                mimetype: 'text/plain',
                                caption: '🔐 Session Backup - Keep this safe!'
                            });
                            markConnectionDone();
                        } catch (e) {}
                    }
                } else {
                    try {
                        await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                            text: `🔄 *${BOT_NAME} Reconnected*\n📅 ${new Date().toLocaleString()}`
                        });
                    } catch (e) {}
                }
            }

            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(color(`⚠️ Disconnected. Reason: ${reason || 'Unknown'}`, 'yellow'));
                if (global.alwaysOnlineInterval) { clearInterval(global.alwaysOnlineInterval); global.alwaysOnlineInterval = null; }

                if (reason === DisconnectReason.loggedOut || reason === 401) {
                    console.log(color('❌ Logged out. Clearing session...', 'red'));
                    [SESSION_NAME, FIRST_CONNECTION_FILE, 'An0nOtF.session', 'owner.json'].forEach(f => {
                        if (fs.existsSync(f)) {
                            try {
                                fs.statSync(f).isDirectory()
                                    ? fs.rmSync(f, { recursive: true, force: true })
                                    : fs.rmSync(f, { force: true });
                            } catch (e) {}
                        }
                    });
                    process.exit(0);
                } else {
                    console.log(color('🔄 Reconnecting in 3s...', 'yellow'));
                    setTimeout(startBot, 3000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                // FIX: update watchdog timestamp so it knows the connection is alive
                global._lastActivity = Date.now();

                const m = messages[0];
                if (!m?.message) return;

                // Status messages always process regardless of type/time
                if (m.key.remoteJid === 'status@broadcast') {
                    await handleStatusUpdate(m, sock);
                    return;
                }

                // Ignore messages older than 30s before bot start (replayed on reconnect)
                const msgTime = (m.messageTimestamp || 0) * 1000;
                if (type !== 'notify' && msgTime && msgTime < botStartTime - 30000) return;

                // Security checks run on every group message (not just commands)
                if (m.key.remoteJid?.endsWith('@g.us')) {
                    try { await global.securityHandlers?.onMessage(m, sock); } catch {}
                }

                await handleMessage(m, sock);
            } catch (e) {
                console.log(color('messages.upsert error:', 'red'), e);
            }
        });

        // Anti-delete: fires when someone deletes a message
        sock.ev.on('messages.delete', async (deletedInfo) => {
            try {
                global._lastActivity = Date.now();
                const keys = deletedInfo?.keys || (deletedInfo?.key ? [deletedInfo.key] : []);
                if (keys.length > 0) {
                    await global.securityHandlers?.onDelete(keys, sock);
                }
            } catch {}
        });

        // Welcome / Goodbye / Anti-raid: fires when members join or leave
        sock.ev.on('group-participants.update', async (update) => {
            try {
                global._lastActivity = Date.now();
                await global.securityHandlers?.onParticipant(update, sock);
            } catch {}
        });

        // Pairing handled via web panel
        if (!state.creds.registered) {
            console.log(color('\n╔══════════════════════════════════════════════╗', 'yellow'));
            console.log(color('║  ⚠️  NO SESSION FOUND                         ║', 'yellow'));
            console.log(color('║  ─────────────────────────────────────────  ║', 'yellow'));
            console.log(color('║  Visit the pairing panel to link your bot:  ║', 'yellow'));
            console.log(color('║  🌐 https://an0n0tf-xmd-pairing-server.     ║', 'cyan'));
            console.log(color('║     vercel.app                              ║', 'cyan'));
            console.log(color('║  ─────────────────────────────────────────  ║', 'yellow'));
            console.log(color('║  After pairing, restart the bot.            ║', 'yellow'));
            console.log(color('╚══════════════════════════════════════════════╝\n', 'yellow'));
        }

    } catch (error) {
        console.log(color('Bot init error:', 'red'), error);
        setTimeout(startBot, 5000);
    }
}

// ==================== DEPENDENCY CHECK ====================
const required = ['@whiskeysockets/baileys','@hapi/boom','axios','qrcode-terminal','pino','chalk','colors'];
const missing = required.filter(p => { try { require(p); return false; } catch (e) { return true; } });
if (missing.length > 0) {
    console.log(color(`❌ Missing: ${missing.join(', ')}`, 'red'));
    console.log(color(`Run: npm install ${missing.join(' ')}`, 'green'));
    process.exit(1);
}

// ==================== PORT (cloud platforms) ====================
if (process.env.PORT) {
    require('net').createServer(s => { s.write('HTTP/1.1 200 OK\r\n\r\nAn0nOtF XMD Running\n'); s.end(); })
        .listen(process.env.PORT, '0.0.0.0', () => console.log(color(`📡 Port ${process.env.PORT} open`, 'cyan')));
}

// ==================== AUTO-RESTART ON CRASH ====================
let _crashCount   = 0;
let _lastStart    = Date.now();
const MAX_RETRIES = 15;
const RESET_AFTER = 5 * 60 * 1000; // reset count if ran >5min

function scheduleRestart(reason, delay = 3000) {
    if (Date.now() - _lastStart > RESET_AFTER) {
        _crashCount = 0;
        console.log(color('🔄 Bot was stable — resetting crash counter', 'green'));
    }
    _crashCount++;
    if (_crashCount > MAX_RETRIES) {
        console.log(color(`❌ Too many crashes (${MAX_RETRIES}). Fix the error and restart manually.`, 'red'));
        process.exit(1);
    }
    const wait = Math.min(delay * Math.pow(2, _crashCount - 1), 60000);
    console.log(color(`🔄 ${reason} — restarting in ${wait / 1000}s... [${_crashCount}/${MAX_RETRIES}]`, 'yellow'));
    setTimeout(() => {
        _lastStart = Date.now();
        startBot().catch(e => scheduleRestart('startBot failed: ' + e.message));
    }, wait);
}

// ==================== ERROR HANDLERS ====================
process.on('uncaughtException', e => {
    console.log(color('uncaughtException:', 'red'), e);
    scheduleRestart('Uncaught exception: ' + e.message);
});
process.on('unhandledRejection', e => {
    console.log(color('unhandledRejection:', 'red'), e);
    scheduleRestart('Unhandled rejection');
});
process.on('SIGINT', () => {
    if (global.alwaysOnlineInterval) clearInterval(global.alwaysOnlineInterval);
    console.log(color('\n👋 Goodbye!', 'cyan'));
    process.exit(0);
});

// ==================== SESSION CLEANUP (every 10 min) ====================
setInterval(() => {
    try {
        const re = /^(session-\d+)_1\.(\d+)\.json$/;
        const groups = {};
        fs.readdirSync(SESSION_NAME).forEach(f => {
            const m = f.match(re);
            if (m) {
                if (!groups[m[1]]) groups[m[1]] = [];
                groups[m[1]].push([+m[2], f]);
            }
        });
        let removed = 0;
        Object.values(groups).forEach(versions => {
            versions.sort((a, b) => a[0] - b[0]);
            versions.slice(0, -1).forEach(([, f]) => {
                fs.unlinkSync(path.join(SESSION_NAME, f));
                removed++;
            });
        });
        if (removed > 0) console.log(color(`🧹 Cleaned ${removed} old session files`, 'gray'));
    } catch (e) {}
}, 10 * 60 * 1000);

// ==================== BOOT ====================
loadPlugins();
watchPlugins();
_lastStart = Date.now();
startBot().catch(e => scheduleRestart('Startup failed: ' + e.message));
