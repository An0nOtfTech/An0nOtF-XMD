// plugins/tools/tools.js

module.exports = [

{
    name: 'getpp',
    category: 'tools',
    ownerOnly: false,
    description: 'Get profile picture',
    func: async (m, sock, args) => {
        let jid = m.key.remoteJid;
        if (m.message?.extendedTextMessage?.contextInfo?.participant) jid = m.message.extendedTextMessage.contextInfo.participant;
        else if (args[0]) jid = args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net';
        try {
            const url = await sock.profilePictureUrl(jid, 'image');
            await sock.sendMessage(m.key.remoteJid, { image: { url }, caption: `📸 @${jid.split('@')[0]}`, mentions: [jid] }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: '❌ No profile picture found!' }, { quoted: m }); }
    }
},

{
    name: 'qrcode',
    category: 'tools',
    ownerOnly: false,
    description: 'Generate QR code',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}qrcode [text]` }, { quoted: m });
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(args.join(' '))}`;
        try {
            const res = await global.axios.get(url, { responseType: 'arraybuffer' });
            await sock.sendMessage(m.key.remoteJid, { image: Buffer.from(res.data), caption: `📱 QR: ${args.join(' ')}` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: '❌ Error generating QR code' }, { quoted: m }); }
    }
},

{
    name: 'weather',
    category: 'tools',
    ownerOnly: false,
    description: 'Get weather for a city',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}weather [city]` }, { quoted: m });
        try {
            const res = await global.axios.get(`https://wttr.in/${encodeURIComponent(args.join(' '))}?format=%C+%t+%w`);
            await sock.sendMessage(m.key.remoteJid, { text: `🌤️ *Weather in ${args.join(' ')}:*\n${res.data}` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ Could not fetch weather` }, { quoted: m }); }
    }
},

{
    name: 'time',
    category: 'tools',
    ownerOnly: false,
    description: 'Current time (EAT)',
    func: async (m, sock, args) => {
        const t = new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        await sock.sendMessage(m.key.remoteJid, { text: `🕒 *Time (EAT):*\n${t}` }, { quoted: m });
    }
},

{
    name: 'calc',
    category: 'tools',
    ownerOnly: false,
    description: 'Calculate math expression',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}calc [expression]` }, { quoted: m });
        try {
            const expr = args.join('').replace(/[^-()\d/*+.]/g, '');
            if (!expr) throw new Error('Empty expression');
            // eslint-disable-next-line no-eval
            const result = eval(expr);
            await sock.sendMessage(m.key.remoteJid, { text: `🧮 *Calc*\n\n${expr} = *${result}*` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: '❌ Invalid expression!' }, { quoted: m }); }
    }
},

{
    name: 'tobase64',
    category: 'tools',
    ownerOnly: false,
    description: 'Convert replied media to base64',
    func: async (m, sock, args) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return sock.sendMessage(m.key.remoteJid, { text: '❌ Reply to an image, video, audio or document!' }, { quoted: m });
        let msgObj = null, type = null;
        if (quoted.imageMessage)    { msgObj = quoted.imageMessage; type = 'image'; }
        else if (quoted.videoMessage)    { msgObj = quoted.videoMessage; type = 'video'; }
        else if (quoted.audioMessage)    { msgObj = quoted.audioMessage; type = 'audio'; }
        else if (quoted.documentMessage) { msgObj = quoted.documentMessage; type = 'document'; }
        else return sock.sendMessage(m.key.remoteJid, { text: '❌ Unsupported file type!' }, { quoted: m });
        try {
            const stream = await global.downloadContentFromMessage(msgObj, type);
            let buf = Buffer.from([]);
            for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
            const b64 = buf.toString('base64');
            await sock.sendMessage(m.key.remoteJid, {
                text: `*📁 BASE64 (${type.toUpperCase()})*\n\n\`\`\`${b64.slice(0, 2000)}\`\`\`${b64.length > 2000 ? '\n\n⚠️ Truncated' : ''}`
            }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'charcount',
    category: 'tools',
    ownerOnly: false,
    description: 'Count characters/words in text',
    func: async (m, sock, args) => {
        const qt = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
            || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
        const text = args.join(' ') || qt;
        if (!text) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}charcount [text]` }, { quoted: m });
        await sock.sendMessage(m.key.remoteJid, {
            text: `*📊 TEXT ANALYSIS*\n\n*Chars:* ${text.length}\n*Words:* ${text.trim().split(/\s+/).filter(Boolean).length}\n*Lines:* ${text.split('\n').length}`
        }, { quoted: m });
    }
},

{
    name: 'case',
    category: 'tools',
    ownerOnly: false,
    description: 'Convert text case (upper/lower/title/reverse/alternating)',
    func: async (m, sock, args) => {
        if (args.length < 2) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}case [upper|lower|title|reverse|alternating] [text]` }, { quoted: m });
        const type = args[0].toLowerCase(), text = args.slice(1).join(' ');
        const c = {
            upper: text.toUpperCase(), lower: text.toLowerCase(),
            title: text.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()),
            reverse: text.split('').reverse().join(''),
            alternating: text.split('').map((c,i) => i%2 ? c.toLowerCase() : c.toUpperCase()).join('')
        };
        if (!c[type]) return sock.sendMessage(m.key.remoteJid, { text: `Types: ${Object.keys(c).join(', ')}` }, { quoted: m });
        await sock.sendMessage(m.key.remoteJid, { text: `*🔄 ${type.toUpperCase()}*\n\n${c[type]}` }, { quoted: m });
    }
},

{
    name: 'color',
    category: 'tools',
    ownerOnly: false,
    description: 'Generate random color preview',
    func: async (m, sock, args) => {
        const hex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        try {
            await sock.sendMessage(m.key.remoteJid, { image: { url: `https://singlecolorimage.com/get/${hex.slice(1)}/400x400` }, caption: `🎨 HEX: ${hex}\nRGB: ${r}, ${g}, ${b}` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `🎨 HEX: ${hex}\nRGB: ${r}, ${g}, ${b}` }, { quoted: m }); }
    }
},

{
    name: 'temp',
    category: 'tools',
    ownerOnly: false,
    description: 'Temperature converter (c/f/k)',
    func: async (m, sock, args) => {
        if (args.length < 2) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}temp [value] [from] [to]\nExample: .temp 100 c f` }, { quoted: m });
        const val = parseFloat(args[0]), from = args[1].toLowerCase(), to = (args[2] || (from === 'c' ? 'f' : 'c')).toLowerCase();
        const conversions = { 'c-f': v => v*9/5+32, 'f-c': v => (v-32)*5/9, 'c-k': v => v+273.15, 'k-c': v => v-273.15, 'f-k': v => (v-32)*5/9+273.15, 'k-f': v => (v-273.15)*9/5+32 };
        const fn = conversions[`${from}-${to}`];
        if (!fn) return sock.sendMessage(m.key.remoteJid, { text: '❌ Invalid units. Use: c, f, k' }, { quoted: m });
        await sock.sendMessage(m.key.remoteJid, { text: `🌡️ ${val}°${from.toUpperCase()} = *${fn(val).toFixed(2)}°${to.toUpperCase()}*` }, { quoted: m });
    }
},

{
    name: 'memory',
    category: 'tools',
    ownerOnly: false,
    description: 'Show bot memory usage',
    func: async (m, sock, args) => {
        const os = require('os');
        const u = process.memoryUsage();
        const fmt = b => Math.round(b/1024/1024) + 'MB';
        await sock.sendMessage(m.key.remoteJid, {
            text: `*💾 MEMORY*\n\nHeap Used: ${fmt(u.heapUsed)}\nHeap Total: ${fmt(u.heapTotal)}\nRSS: ${fmt(u.rss)}\nSystem: ${fmt(os.freemem())} free / ${fmt(os.totalmem())} total`
        }, { quoted: m });
    }
},

{
    name: 'tempmail',
    category: 'tools',
    ownerOnly: false,
    description: 'Temporary email (create/inbox/read)',
    func: async (m, sock, args) => {
        const action = args[0]?.toLowerCase();
        const sender = m.key.participant || m.key.remoteJid;

        if (!action || action === 'create') {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let user = '';
            for (let i = 0; i < 10; i++) user += chars[Math.floor(Math.random() * chars.length)];
            const domains = ['1secmail.com','1secmail.org','1secmail.net'];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            global.tempMails[sender] = { address: `${user}@${domain}`, login: user, domain };
            await sock.sendMessage(m.key.remoteJid, { text: `📧 *Temp Email Created*\n\n\`\`\`${global.tempMails[sender].address}\`\`\`\n\nUse: ${global.DEFAULT_PREFIX}tempmail inbox` }, { quoted: m });

        } else if (action === 'inbox') {
            const mail = global.tempMails[sender];
            if (!mail) return sock.sendMessage(m.key.remoteJid, { text: `❌ No email. Use ${global.DEFAULT_PREFIX}tempmail first.` }, { quoted: m });
            try {
                const res = await global.axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${mail.login}&domain=${mail.domain}`);
                if (!res.data?.length) return sock.sendMessage(m.key.remoteJid, { text: `📭 Inbox for ${mail.address}\n\nNo messages yet.` }, { quoted: m });
                let text = `📬 *Inbox for ${mail.address}*\n\n`;
                res.data.slice(0,5).forEach((msg, i) => { text += `*[${i+1}]* From: ${msg.from}\nSubject: ${msg.subject}\nID: ${msg.id}\n---\n`; });
                text += `\nUse: ${global.DEFAULT_PREFIX}tempmail read [ID]`;
                await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
            } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }

        } else if (action === 'read') {
            if (!args[1]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}tempmail read [ID]` }, { quoted: m });
            const mail = global.tempMails[sender];
            if (!mail) return sock.sendMessage(m.key.remoteJid, { text: '❌ No active email.' }, { quoted: m });
            try {
                const res = await global.axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${mail.login}&domain=${mail.domain}&id=${args[1]}`);
                const msg = res.data;
                await sock.sendMessage(m.key.remoteJid, { text: `✉️ *Message*\n\nFrom: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.date}\n\n${msg.textBody || msg.htmlBody?.replace(/<[^>]*>/g,'') || 'Empty'}` }, { quoted: m });
            } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }

        } else {
            await sock.sendMessage(m.key.remoteJid, { text: `📧 *Tempmail*\n\n${global.DEFAULT_PREFIX}tempmail — create\n${global.DEFAULT_PREFIX}tempmail inbox — check\n${global.DEFAULT_PREFIX}tempmail read [ID] — read` }, { quoted: m });
        }
    }
},

{
    name: 'obfuscate',
    category: 'tools',
    ownerOnly: false,
    description: 'Alternating case obfuscation',
    func: async (m, sock, args) => {
        const qt = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '';
        const text = args.join(' ') || qt || 'Hello World';
        const out = text.split('').map((c,i) => i%2 ? c.toLowerCase() : c.toUpperCase()).join('');
        await sock.sendMessage(m.key.remoteJid, { text: `*🌀 OBFUSCATED*\n\n\`\`\`${out}\`\`\`` }, { quoted: m });
    }
},

{
    name: 'encode',
    category: 'tools',
    ownerOnly: false,
    description: 'Encode text to base64',
    func: async (m, sock, args) => {
        const qt = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '';
        const text = args.join(' ') || qt;
        if (!text) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}encode [text]` }, { quoted: m });
        await sock.sendMessage(m.key.remoteJid, { text: `*📤 BASE64*\n\n\`\`\`${Buffer.from(text).toString('base64')}\`\`\`` }, { quoted: m });
    }
},

{
    name: 'decode',
    category: 'tools',
    ownerOnly: false,
    description: 'Decode base64 text',
    func: async (m, sock, args) => {
        const text = args.join(' ');
        if (!text) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}decode [base64]` }, { quoted: m });
        try { await sock.sendMessage(m.key.remoteJid, { text: `*📥 DECODED*\n\n\`\`\`${Buffer.from(text,'base64').toString('utf8')}\`\`\`` }, { quoted: m }); }
        catch { await sock.sendMessage(m.key.remoteJid, { text: '❌ Invalid base64' }, { quoted: m }); }
    }
}

];

