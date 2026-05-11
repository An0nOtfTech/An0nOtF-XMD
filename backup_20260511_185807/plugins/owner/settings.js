// plugins/owner/settings.js
// All owner/settings commands

module.exports = [

{
    name: 'menu',
    category: 'owner',
    ownerOnly: false,
    description: 'Show bot menu',
    func: async (m, sock, args) => {
        const uptime = global.getUptime();
        // FIX: read prefix from settingsDB('globalPrefix') — same place index.js reads it
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        const ram = process.memoryUsage().heapUsed / 1024 / 1024;
        // FIX: read mode from settingsDB('globalMode') — same place index.js enforces it
        const mode = global.settingsDB.get('globalMode', 'public');
        const menuNum = global.getGlobalMenu();
        const totalCmds = Object.keys(global.commands).length;

        const grouped = {};
        for (const [name, cmd] of Object.entries(global.commands)) {
            const cat = (cmd.category || 'misc').toUpperCase();
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(name);
        }

        let menuText = `┏▣ ◈ *${global.BOT_NAME}* ◈
┃❖ᴏᴡɴᴇʀ  : ${global.getOwnerName()}
┃❖ᴘʀᴇғɪx  : [ ${prefix} ]
┃❖ᴍᴏᴅᴇ   : ${mode.charAt(0).toUpperCase() + mode.slice(1)}
┃❖ᴜᴘᴛɪᴍᴇ : ${uptime.formatted}
┃❖ʀᴀᴍ    : ${ram.toFixed(1)} MB
┣❖ᴄᴏᴍᴍᴀɴᴅs: ${totalCmds}\n\n`;

        for (const [cat, cmds] of Object.entries(grouped)) {
            menuText += `┏▣ ◈ *${cat}* ◈\n`;
            cmds.forEach(c => { menuText += `│ϟ ${prefix}${c}\n`; });
            menuText += `\n`;
        }
        menuText += `*© ${global.DEVELOPER}*`;

        const fs = require('fs');

        // Send menu image + text (or text only if no image)
        try {
            const menuPath = `menu${menuNum}.jpg`;
            if (fs.existsSync(menuPath)) {
                await sock.sendMessage(m.key.remoteJid, {
                    image: fs.readFileSync(menuPath),
                    caption: menuText
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
            }
        } catch (e) {
            await sock.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
        }

                // Send menu audio if it exists in bot root
          // OGG/OPUS → voice note ptt (auto-plays inline)
          // MP3/WAV/M4A → regular audio file (tap to play) — WhatsApp rejects non-OPUS as ptt
          try {
              const audioPaths = ['menu.ogg', 'menu.mp3', 'menu.wav', 'menu.m4a'];
              const audioFile = audioPaths.find(f => fs.existsSync(f));
              if (audioFile) {
                  const ext = audioFile.split('.').pop().toLowerCase();
                  const mimeMap = {
                      mp3: 'audio/mpeg',
                      ogg: 'audio/ogg; codecs=opus',
                      wav: 'audio/wav',
                      m4a: 'audio/mp4'
                  };
                  await sock.sendMessage(m.key.remoteJid, {
                      audio: fs.readFileSync(audioFile),
                      mimetype: mimeMap[ext] || 'audio/mpeg',
                      ptt: ext === 'ogg'
                  });
              }
          } catch (e) {}
    }
},

{
    name: 'setprefix',
    category: 'owner',
    ownerOnly: true,
    description: 'Change bot prefix',
    func: async (m, sock, args) => {
        const currentPrefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${currentPrefix}setprefix [prefix]` }, { quoted: m });
        if (args[0].length > 3) return sock.sendMessage(m.key.remoteJid, { text: '❌ Max 3 characters!' }, { quoted: m });
        // FIX: was writing to prefixDB('global') but index.js reads from settingsDB('globalPrefix')
        global.settingsDB.set('globalPrefix', args[0]);
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Prefix changed to: ${args[0]} (applies to all chats)` }, { quoted: m });
    }
},

{
    name: 'setmenu',
    category: 'owner',
    ownerOnly: true,
    description: 'Change menu image (1-6)',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}setmenu [1-6]\nCurrent: menu${global.getGlobalMenu()}.jpg` }, { quoted: m });
        if (!['1','2','3','4','5','6'].includes(args[0])) return sock.sendMessage(m.key.remoteJid, { text: '❌ Use numbers 1-6 only!' }, { quoted: m });
        global.setGlobalMenu(args[0]);
        const exists = require('fs').existsSync(`menu${args[0]}.jpg`);
        await sock.sendMessage(m.key.remoteJid, {
            text: `✅ Menu image set to: menu${args[0]}.jpg${!exists ? '\n⚠️ File not found — upload menu' + args[0] + '.jpg to bot folder' : ''}`
        }, { quoted: m });
    }
},

{
    name: 'mode',
    category: 'owner',
    ownerOnly: true,
    description: 'Change bot mode (public/private/pm)',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            // FIX: was reading from modeDB('global') but index.js enforces from settingsDB('globalMode')
            const curMode = global.settingsDB.get('globalMode', 'public');
            return sock.sendMessage(m.key.remoteJid, {
                text: `Current: ${curMode}\n\nUsage: ${prefix}mode [public/private/pm]\n• public — anyone\n• private — owner only\n• pm — private chat only`
            }, { quoted: m });
        }
        const mode = args[0].toLowerCase();
        if (!['public','private','pm'].includes(mode)) return sock.sendMessage(m.key.remoteJid, { text: '❌ Use: public, private, or pm' }, { quoted: m });
        // FIX: was writing to modeDB('global') but index.js reads from settingsDB('globalMode')
        global.settingsDB.set('globalMode', mode);
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Mode: ${mode.toUpperCase()} (applies globally)` }, { quoted: m });
    }
},

{
    name: 'alwaysonline',
    category: 'owner',
    ownerOnly: true,
    description: 'Keep bot online 24/7',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            const cur = global.getSetting('alwaysonline', false);
            return sock.sendMessage(m.key.remoteJid, { text: `🔌 Always Online: ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: ${prefix}alwaysonline [on/off]` }, { quoted: m });
        }
        const on = ['yes','on','true'].includes(args[0].toLowerCase());
        const off = ['no','off','false'].includes(args[0].toLowerCase());
        if (!on && !off) return sock.sendMessage(m.key.remoteJid, { text: '❌ Use: on/off' }, { quoted: m });
        global.setSetting('alwaysonline', on);
        // FIX: immediately start or stop the interval — no need to reconnect
        if (on) {
            if (global.alwaysOnlineInterval) clearInterval(global.alwaysOnlineInterval);
            global.alwaysOnlineInterval = setInterval(async () => {
                try { await global.sock?.sendPresenceUpdate('available'); } catch (e) {}
            }, 60000);
        } else {
            if (global.alwaysOnlineInterval) { clearInterval(global.alwaysOnlineInterval); global.alwaysOnlineInterval = null; }
        }
        await sock.sendMessage(m.key.remoteJid, { text: on ? '✅ Always Online: ENABLED (active now)' : '❌ Always Online: DISABLED' }, { quoted: m });
    }
},

{
    name: 'autoviewstatus',
    category: 'owner',
    ownerOnly: true,
    description: 'Auto-view WhatsApp status',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            const cur = global.getSetting('autoviewstatus', false);
            return sock.sendMessage(m.key.remoteJid, { text: `👀 Auto View Status: ${cur ? '✅ ON' : '❌ OFF'}\nUsage: ${prefix}autoviewstatus [on/off]` }, { quoted: m });
        }
        const on = ['yes','on','true'].includes(args[0].toLowerCase());
        global.setSetting('autoviewstatus', on);
        await sock.sendMessage(m.key.remoteJid, { text: on ? '✅ Auto View Status: ENABLED' : '❌ Auto View Status: DISABLED' }, { quoted: m });
    }
},

{
    name: 'autolikestatus',
    category: 'owner',
    ownerOnly: true,
    description: 'Auto-like WhatsApp status',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            const cur = global.getSetting('autolikestatus', false);
            return sock.sendMessage(m.key.remoteJid, { text: `❤️ Auto Like Status: ${cur ? '✅ ON' : '❌ OFF'}\nUsage: ${prefix}autolikestatus [on/off]` }, { quoted: m });
        }
        const on = ['yes','on','true'].includes(args[0].toLowerCase());
        global.setSetting('autolikestatus', on);
        await sock.sendMessage(m.key.remoteJid, { text: on ? '✅ Auto Like Status: ENABLED' : '❌ Auto Like Status: DISABLED' }, { quoted: m });
    }
},

{
    name: 'autotyping',
    category: 'owner',
    ownerOnly: true,
    description: 'Show typing indicator before replies',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            const cur = global.getSetting('autotyping', false);
            return sock.sendMessage(m.key.remoteJid, { text: `⌨️ Auto Typing: ${cur ? '✅ ON' : '❌ OFF'}\nUsage: ${prefix}autotyping [on/off]` }, { quoted: m });
        }
        const on = ['yes','on','true'].includes(args[0].toLowerCase());
        global.setSetting('autotyping', on);
        await sock.sendMessage(m.key.remoteJid, { text: on ? '✅ Auto Typing: ENABLED' : '❌ Auto Typing: DISABLED' }, { quoted: m });
    }
},

{
    name: 'autoreact',
    category: 'owner',
    ownerOnly: true,
    description: 'Auto-react to every command message with an emoji',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) {
            const cur = global.getSetting('autoreact', false);
            return sock.sendMessage(m.key.remoteJid, { text: `🎭 Auto React: ${cur ? '✅ ON' : '❌ OFF'}\nUsage: ${prefix}autoreact [on/off]` }, { quoted: m });
        }
        const on = ['yes','on','true'].includes(args[0].toLowerCase());
        global.setSetting('autoreact', on);
        await sock.sendMessage(m.key.remoteJid, { text: on ? '✅ Auto React: ENABLED' : '❌ Auto React: DISABLED' }, { quoted: m });
    }
},

{
    name: 'setownername',
    category: 'owner',
    ownerOnly: true,
    description: 'Set owner name',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}setownername [name]` }, { quoted: m });
        global.setOwnerName(args.join(' '));
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Owner name: ${global.getOwnerName()}` }, { quoted: m });
    }
},

{
    name: 'setownernumber',
    category: 'owner',
    ownerOnly: true,
    description: 'Set owner number',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}setownernumber [number]` }, { quoted: m });
        const num = args[0].replace(/[^0-9]/g, '');
        if (num.length < 10) return sock.sendMessage(m.key.remoteJid, { text: '❌ Invalid number!' }, { quoted: m });
        global.setOwnerNumber(num);
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Owner number: +${num}` }, { quoted: m });
    }
},

{
    name: 'ban',
    category: 'owner',
    ownerOnly: true,
    description: 'Ban user from bot',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}ban @user` }, { quoted: m });
        const id = user.split('@')[0];
        global.banDB.set(id, { banned: true, date: new Date().toISOString() });
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Banned: ${id}` }, { quoted: m });
    }
},

{
    name: 'unban',
    category: 'owner',
    ownerOnly: true,
    description: 'Unban user',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}unban @user` }, { quoted: m });
        const id = user.split('@')[0];
        if (!global.banDB.has(id)) return sock.sendMessage(m.key.remoteJid, { text: `❌ ${id} is not banned.` }, { quoted: m });
        global.banDB.delete(id);
        await sock.sendMessage(m.key.remoteJid, { text: `✅ Unbanned: ${id}` }, { quoted: m });
    }
},

{
    name: 'block',
    category: 'owner',
    ownerOnly: true,
    description: 'Block user on WhatsApp',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}block @user` }, { quoted: m });
        try { await sock.updateBlockStatus(user, 'block'); await sock.sendMessage(m.key.remoteJid, { text: '✅ User blocked!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'unblock',
    category: 'owner',
    ownerOnly: true,
    description: 'Unblock user on WhatsApp',
    func: async (m, sock, args) => {
        const prefix = global.settingsDB.get('globalPrefix', global.DEFAULT_PREFIX);
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${prefix}unblock @user` }, { quoted: m });
        try { await sock.updateBlockStatus(user, 'unblock'); await sock.sendMessage(m.key.remoteJid, { text: '✅ User unblocked!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'getsession',
    category: 'owner',
    ownerOnly: true,
    description: 'Get session backup file',
    func: async (m, sock, args) => {
        const text = global.exportSession();
        if (!text) return sock.sendMessage(m.key.remoteJid, { text: '❌ No session found!' }, { quoted: m });
        await sock.sendMessage(m.key.remoteJid, { text: '🔐 Session exported! Sending file...' }, { quoted: m });
        try {
            await sock.sendMessage(m.key.remoteJid, {
                document: require('fs').readFileSync('An0nOtF.session'),
                fileName: 'An0nOtF.session',
                mimetype: 'text/plain',
                caption: '🔐 Keep this file safe!'
            }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'restart',
    category: 'owner',
    ownerOnly: true,
    description: 'Restart the bot',
    func: async (m, sock, args) => {
        await sock.sendMessage(m.key.remoteJid, { text: '🔄 Restarting...' }, { quoted: m });
        setTimeout(() => process.exit(0), 2000);
    }
},

{
    name: 'update',
    category: 'owner',
    ownerOnly: true,
    description: 'Pull updates from git and restart',
    func: async (m, sock, args) => {
        const { execSync } = require('child_process');
        try {
            await sock.sendMessage(m.key.remoteJid, { text: '🔄 Checking updates...' }, { quoted: m });
            const status = execSync('git status', { encoding: 'utf8' });
            if (status.includes('Your branch is up to date')) {
                return sock.sendMessage(m.key.remoteJid, { text: '✅ Already up to date.' }, { quoted: m });
            }
            await sock.sendMessage(m.key.remoteJid, { text: '📥 Pulling updates...' }, { quoted: m });
            execSync('git pull origin main', { encoding: 'utf8' });
            execSync('npm install', { encoding: 'utf8' });
            await sock.sendMessage(m.key.remoteJid, { text: '✅ Updated! Restarting...' }, { quoted: m });
            setTimeout(() => process.exit(0), 2000);
        } catch (e) {
            await sock.sendMessage(m.key.remoteJid, { text: `❌ Update failed: ${e.message}` }, { quoted: m });
        }
    }
},

{
    name: 'ping',
    category: 'owner',
    ownerOnly: false,
    description: 'Check bot speed',
    func: async (m, sock, args) => {
        const start = Date.now();
        await sock.sendMessage(m.key.remoteJid, { text: '🏓 Pong!' }, { quoted: m });
        const speed = Date.now() - start;
        await sock.sendMessage(m.key.remoteJid, { text: `⚡ Speed: ${speed}ms\n📊 ${speed < 500 ? 'Excellent' : 'Good'}` }, { quoted: m });
    }
},

{
    name: 'uptime',
    category: 'owner',
    ownerOnly: false,
    description: 'Check bot uptime',
    func: async (m, sock, args) => {
        const up = global.getUptime();
        await sock.sendMessage(m.key.remoteJid, { text: `🕒 *Uptime:* ${up.formatted}\n📅 Started: ${new Date(global.startTime).toLocaleString()}` }, { quoted: m });
    }
},

{
    name: 'owner',
    category: 'owner',
    ownerOnly: false,
    description: 'Show owner info',
    func: async (m, sock, args) => {
        await sock.sendMessage(m.key.remoteJid, {
            text: `👑 *OWNER*\n\n🤵 Name: ${global.getOwnerName()}\n📞 WA: +${global.getOwnerNumber()}\n📱 Telegram: ${global.TELEGRAM}\n💻 GitHub: ${global.GITHUB}\n📍 Location: ${global.LOCATION}`
        }, { quoted: m });
    }
},

{
    name: 'plugins',
    category: 'owner',
    ownerOnly: true,
    description: 'List all loaded plugins',
    func: async (m, sock, args) => {
        const cmds = Object.entries(global.commands);
        const grouped = {};
        for (const [name, cmd] of cmds) {
            const cat = cmd.category || 'misc';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(name);
        }
        let text = `📦 *Loaded Plugins (${cmds.length} commands)*\n\n`;
        for (const [cat, names] of Object.entries(grouped)) {
            text += `*${cat.toUpperCase()}* (${names.length})\n${names.join(', ')}\n\n`;
        }
        await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
    }
}

];
