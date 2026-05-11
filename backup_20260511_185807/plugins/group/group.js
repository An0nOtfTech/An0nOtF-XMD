// plugins/group/group.js

module.exports = [

{
    name: 'kick',
    category: 'group',
    ownerOnly: false,
    description: 'Kick user from group',
    func: async (m, sock, args) => {
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}kick @user` }, { quoted: m });
        try { await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'remove'); await sock.sendMessage(m.key.remoteJid, { text: '✅ User kicked!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'add',
    category: 'group',
    ownerOnly: false,
    description: 'Add user to group',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}add [number]` }, { quoted: m });
        const num = args[0].replace(/[^0-9]/g,'');
        if (num.length < 10) return sock.sendMessage(m.key.remoteJid, { text: '❌ Invalid number!' }, { quoted: m });
        try { await sock.groupParticipantsUpdate(m.key.remoteJid, [`${num}@s.whatsapp.net`], 'add'); await sock.sendMessage(m.key.remoteJid, { text: `✅ Added +${num}!` }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'promote',
    category: 'group',
    ownerOnly: false,
    description: 'Promote user to admin',
    func: async (m, sock, args) => {
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}promote @user` }, { quoted: m });
        try { await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'promote'); await sock.sendMessage(m.key.remoteJid, { text: '✅ Promoted to admin!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'demote',
    category: 'group',
    ownerOnly: false,
    description: 'Demote admin to member',
    func: async (m, sock, args) => {
        const user = m.message?.extendedTextMessage?.contextInfo?.participant
            || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!user) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}demote @user` }, { quoted: m });
        try { await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'demote'); await sock.sendMessage(m.key.remoteJid, { text: '✅ Demoted!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'mute',
    category: 'group',
    ownerOnly: false,
    description: 'Mute group (admins only)',
    func: async (m, sock, args) => {
        try { await sock.groupSettingUpdate(m.key.remoteJid, 'announcement'); await sock.sendMessage(m.key.remoteJid, { text: '🔇 Group muted!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'unmute',
    category: 'group',
    ownerOnly: false,
    description: 'Unmute group',
    func: async (m, sock, args) => {
        try { await sock.groupSettingUpdate(m.key.remoteJid, 'not_announcement'); await sock.sendMessage(m.key.remoteJid, { text: '🔊 Group unmuted!' }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'tagall',
    category: 'group',
    ownerOnly: false,
    description: 'Tag all group members',
    func: async (m, sock, args) => {
        try {
            const meta = await sock.groupMetadata(m.key.remoteJid);
            const mentions = meta.participants.map(p => p.id);
            const text = mentions.map(id => `@${id.split('@')[0]}`).join(' ');
            await sock.sendMessage(m.key.remoteJid, { text: `👥 *Tag All*\n\n${text}`, mentions }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'hidetag',
    category: 'group',
    ownerOnly: false,
    description: 'Tag all silently',
    func: async (m, sock, args) => {
        const text = args.join(' ') || 'Hello everyone!';
        try {
            const meta = await sock.groupMetadata(m.key.remoteJid);
            await sock.sendMessage(m.key.remoteJid, { text, mentions: meta.participants.map(p => p.id) }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'link',
    category: 'group',
    ownerOnly: false,
    description: 'Get group invite link',
    func: async (m, sock, args) => {
        try {
            const code = await sock.groupInviteCode(m.key.remoteJid);
            await sock.sendMessage(m.key.remoteJid, { text: `🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'resetlink',
    category: 'group',
    ownerOnly: true,
    description: 'Reset group invite link',
    func: async (m, sock, args) => {
        try {
            const code = await sock.groupRevokeInvite(m.key.remoteJid);
            await sock.sendMessage(m.key.remoteJid, { text: `🔄 New link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: m });
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'setname',
    category: 'group',
    ownerOnly: false,
    description: 'Change group name',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}setname [name]` }, { quoted: m });
        try { await sock.groupUpdateSubject(m.key.remoteJid, args.join(' ')); await sock.sendMessage(m.key.remoteJid, { text: `✅ Name changed!` }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'setdesc',
    category: 'group',
    ownerOnly: false,
    description: 'Change group description',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}setdesc [text]` }, { quoted: m });
        try { await sock.groupUpdateDescription(m.key.remoteJid, args.join(' ')); await sock.sendMessage(m.key.remoteJid, { text: `✅ Description updated!` }, { quoted: m }); }
        catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
},

{
    name: 'vcf',
    category: 'group',
    ownerOnly: false,
    description: 'Export group contacts as VCF',
    func: async (m, sock, args) => {
        try {
            const fs = require('fs');
            const meta = await sock.groupMetadata(m.key.remoteJid);
            let vcf = '';
            for (const p of meta.participants) {
                const name = p.notify || `User_${p.id.split('@')[0]}`;
                vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:+${p.id.split('@')[0]}\nEND:VCARD\n`;
            }
            const filePath = `./temp/${Date.now()}_contacts.vcf`;
            fs.writeFileSync(filePath, vcf);
            await sock.sendMessage(m.key.remoteJid, {
                document: fs.readFileSync(filePath),
                fileName: 'Group_Contacts.vcf',
                mimetype: 'text/vcard',
                caption: `✅ ${meta.participants.length} contacts exported`
            }, { quoted: m });
            fs.unlinkSync(filePath);
        } catch (e) { await sock.sendMessage(m.key.remoteJid, { text: `❌ ${e.message}` }, { quoted: m }); }
    }
}

];
