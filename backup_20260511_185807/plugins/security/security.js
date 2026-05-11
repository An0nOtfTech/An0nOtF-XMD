	// plugins/security/security.js
// Security plugin — anti-link, anti-spam, anti-bad-word, anti-delete, anti-raid, welcome, goodbye

const secDB = new global.SimpleDB('security.json');

// ── In-memory trackers (no persistence needed) ─────────────────
const spamTracker = new Map();   // `${group}_${user}` → { count, first }
const raidTracker = new Map();   // groupJid → [timestamp, ...]
const warnTracker = new Map();   // `${group}_${user}` → warnCount

const SPAM_LIMIT   = 5;          // messages
const SPAM_WINDOW  = 5000;       // ms
const RAID_LIMIT   = 5;          // joins
const RAID_WINDOW  = 10000;      // ms

// ── Helpers ────────────────────────────────────────────────────

function groupKey(feature, jid)  { return `${feature}_${jid}`; }
function isEnabled(feature, jid) { return secDB.get(groupKey(feature, jid), false); }

function getBadWords() { return secDB.get('badwords', []); }

const LINK_REGEX = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

async function isGroupAdmin(sock, groupJid, userJid) {
    try {
        const meta = await sock.groupMetadata(groupJid);
        return meta.participants.some(p => p.id === userJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch { return false; }
}

function getWarn(group, user) {
    return warnTracker.get(`${group}_${user}`) || 0;
}
function addWarn(group, user) {
    const n = getWarn(group, user) + 1;
    warnTracker.set(`${group}_${user}`, n);
    return n;
}
function clearWarn(group, user) { warnTracker.delete(`${group}_${user}`); }

// ── Security event handlers (called from index.js) ─────────────

global.securityHandlers = {

    // Called on every non-command message (and before command check)
    onMessage: async (m, sock) => {
        try {
            const jid = m.key.remoteJid;
            if (!jid?.endsWith('@g.us')) return;   // groups only

            const sender = m.key.participant || m.key.remoteJid;
            if (global.isOwner(sender, m.key)) return;

            const msgContent = m.message?.ephemeralMessage?.message
                || m.message?.viewOnceMessage?.message
                || m.message;

            const text = msgContent?.conversation
                || msgContent?.extendedTextMessage?.text
                || msgContent?.imageMessage?.caption
                || msgContent?.videoMessage?.caption
                || '';

            const activeSock = global.sock || sock;

            // ── Anti-link ──────────────────────────────────────
            if (isEnabled('antilink', jid) && LINK_REGEX.test(text)) {
                const isAdmin = await isGroupAdmin(activeSock, jid, sender);
                if (!isAdmin) {
                    try { await activeSock.sendMessage(jid, { delete: m.key }); } catch {}
                    const warns = addWarn(jid, sender);
                    if (warns >= 3) {
                        clearWarn(jid, sender);
                        try { await activeSock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                        await activeSock.sendMessage(jid, {
                            text: `🚫 @${sender.split('@')[0]} was kicked for sending links repeatedly.`,
                            mentions: [sender]
                        });
                    } else {
                        await activeSock.sendMessage(jid, {
                            text: `⚠️ @${sender.split('@')[0]} links are not allowed here!\n` +
                                  `Warning *${warns}/3* — next violations will get you kicked.`,
                            mentions: [sender]
                        }, { quoted: m });
                    }
                    return;
                }
            }

            // ── Anti-spam ──────────────────────────────────────
            if (isEnabled('antispam', jid)) {
                const key = `${jid}_${sender}`;
                const now = Date.now();
                const entry = spamTracker.get(key) || { count: 0, first: now };
                if (now - entry.first > SPAM_WINDOW) {
                    entry.count = 1; entry.first = now;
                } else {
                    entry.count++;
                }
                spamTracker.set(key, entry);

                if (entry.count >= SPAM_LIMIT) {
                    spamTracker.delete(key);
                    const isAdmin = await isGroupAdmin(activeSock, jid, sender);
                    if (!isAdmin) {
                        try { await activeSock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                        await activeSock.sendMessage(jid, {
                            text: `🚫 @${sender.split('@')[0]} was kicked for spamming.`,
                            mentions: [sender]
                        });
                    }
                }
            }

            // ── Anti-bad word ──────────────────────────────────
            if (isEnabled('antibadword', jid) && text) {
                const lower = text.toLowerCase();
                const badWords = getBadWords();
                const found = badWords.find(w => lower.includes(w.toLowerCase()));
                if (found) {
                    const isAdmin = await isGroupAdmin(activeSock, jid, sender);
                    if (!isAdmin) {
                        try { await activeSock.sendMessage(jid, { delete: m.key }); } catch {}
                        const warns = addWarn(jid, sender);
                        if (warns >= 3) {
                            clearWarn(jid, sender);
                            try { await activeSock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                            await activeSock.sendMessage(jid, {
                                text: `🚫 @${sender.split('@')[0]} was kicked for repeated use of banned words.`,
                                mentions: [sender]
                            });
                        } else {
                            await activeSock.sendMessage(jid, {
                                text: `⚠️ @${sender.split('@')[0]} banned word detected!\n` +
                                      `Warning *${warns}/3* — next violations will get you kicked.`,
                                mentions: [sender]
                            }, { quoted: m });
                        }
                    }
                }
            }

        } catch {}
    },

    // Called when messages are deleted
    onDelete: async (deletedKeys, sock) => {
        try {
            const activeSock = global.sock || sock;
            for (const key of deletedKeys) {
                const jid = key.remoteJid;
                if (!jid?.endsWith('@g.us')) continue;
                if (!isEnabled('antidelete', jid)) continue;

                const deletedBy = key.participant || jid;
                if (global.isOwner(deletedBy)) continue;

                await activeSock.sendMessage(jid, {
                    text: `👁️ *Anti-Delete*\n\n` +
                          `@${deletedBy.split('@')[0]} deleted a message.\n` +
                          `_(Message content could not be recovered — WhatsApp does not share it)_`,
                    mentions: [deletedBy]
                });
            }
        } catch {}
    },

    // Called on group participant changes (join/leave)
    onParticipant: async (update, sock) => {
        try {
            const { id: jid, participants, action } = update;
            const activeSock = global.sock || sock;

            // ── Anti-raid ──────────────────────────────────────
            if (action === 'add' && isEnabled('antiraid', jid)) {
                const now = Date.now();
                const joins = (raidTracker.get(jid) || []).filter(t => now - t < RAID_WINDOW);
                joins.push(...participants.map(() => now));
                raidTracker.set(jid, joins);

                if (joins.length >= RAID_LIMIT) {
                    raidTracker.set(jid, []);
                    for (const p of participants) {
                        try { await activeSock.groupParticipantsUpdate(jid, [p], 'remove'); } catch {}
                    }
                    await activeSock.sendMessage(jid, {
                        text: `🛡️ *Anti-Raid* — Raid detected!\n` +
                              `${participants.length} account(s) were removed automatically.`
                    });
                    return;
                }
            }

            // ── Welcome ────────────────────────────────────────
            if (action === 'add' && isEnabled('welcome', jid)) {
                for (const p of participants) {
                    const name = p.split('@')[0];
                    let msg = secDB.get(groupKey('welcomemsg', jid),
                        `👋 Welcome @{user} to the group!\nEnjoy your stay 🎉`);
                    msg = msg.replace('{user}', `@${name}`);
                    await activeSock.sendMessage(jid, { text: msg, mentions: [p] });
                }
            }

            // ── Goodbye ────────────────────────────────────────
            if ((action === 'remove' || action === 'leave') && isEnabled('goodbye', jid)) {
                for (const p of participants) {
                    const name = p.split('@')[0];
                    let msg = secDB.get(groupKey('goodbyemsg', jid),
                        `👋 Goodbye @{user}, we'll miss you!`);
                    msg = msg.replace('{user}', `@${name}`);
                    await activeSock.sendMessage(jid, { text: msg, mentions: [p] });
                }
            }

        } catch {}
    }
};

// ── Commands ───────────────────────────────────────────────────

module.exports = [

    // ==================== antilink ====================
    {
        name: 'antilink',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle anti-link in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}antilink on/off`
            }, { quoted: m });
            secDB.set(groupKey('antilink', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `🔗 *Anti-Link* is now *${val.toUpperCase()}*\n` +
                      (val === 'on' ? '• Members get 3 warnings before kick.' : '')
            }, { quoted: m });
        }
    },

    // ==================== antispam ====================
    {
        name: 'antispam',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle anti-spam in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}antispam on/off`
            }, { quoted: m });
            secDB.set(groupKey('antispam', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `🚫 *Anti-Spam* is now *${val.toUpperCase()}*\n` +
                      (val === 'on' ? `• Kicks after ${SPAM_LIMIT} messages in ${SPAM_WINDOW/1000}s.` : '')
            }, { quoted: m });
        }
    },

    // ==================== antibadword ====================
    {
        name: 'antibadword',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle anti-bad-word filter in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}antibadword on/off`
            }, { quoted: m });
            secDB.set(groupKey('antibadword', jid), val === 'on');
            const words = getBadWords();
            await sock.sendMessage(jid, {
                text: `🤬 *Anti-Bad-Word* is now *${val.toUpperCase()}*\n` +
                      (val === 'on' ? `• ${words.length} banned word(s) active.\n• Use ${global.getPrefix()}badwords to manage the list.` : '')
            }, { quoted: m });
        }
    },

    // ==================== badwords ====================
    {
        name: 'badwords',
        category: 'security',
        ownerOnly: false,
        description: 'Manage banned word list',
        func: async (m, sock, args) => {
            const prefix = global.getPrefix();
            const sub = args[0]?.toLowerCase();
            const word = args.slice(1).join(' ').toLowerCase().trim();

            if (sub === 'add' && word) {
                const words = getBadWords();
                if (words.includes(word)) return sock.sendMessage(m.key.remoteJid, { text: `⚠️ "${word}" is already in the list.` }, { quoted: m });
                words.push(word);
                secDB.set('badwords', words);
                return sock.sendMessage(m.key.remoteJid, { text: `✅ Added "*${word}*" to banned words list.` }, { quoted: m });
            }

            if (sub === 'remove' && word) {
                const words = getBadWords().filter(w => w !== word);
                secDB.set('badwords', words);
                return sock.sendMessage(m.key.remoteJid, { text: `✅ Removed "*${word}*" from banned words list.` }, { quoted: m });
            }

            if (sub === 'list') {
                const words = getBadWords();
                return sock.sendMessage(m.key.remoteJid, {
                    text: words.length
                        ? `🤬 *Banned Words (${words.length}):*\n\n${words.map((w,i) => `${i+1}. ${w}`).join('\n')}`
                        : '📭 No banned words set yet.'
                }, { quoted: m });
            }

            await sock.sendMessage(m.key.remoteJid, {
                text: `*Banned Words Manager*\n\n` +
                      `${prefix}badwords add [word] — add a word\n` +
                      `${prefix}badwords remove [word] — remove a word\n` +
                      `${prefix}badwords list — show all banned words`
            }, { quoted: m });
        }
    },

    // ==================== antidelete ====================
    {
        name: 'antidelete',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle anti-delete in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}antidelete on/off`
            }, { quoted: m });
            secDB.set(groupKey('antidelete', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `👁️ *Anti-Delete* is now *${val.toUpperCase()}*\n` +
                      (val === 'on' ? '• Deleted messages will be flagged.' : '')
            }, { quoted: m });
        }
    },

    // ==================== antiraid ====================
    {
        name: 'antiraid',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle anti-raid in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}antiraid on/off`
            }, { quoted: m });
            secDB.set(groupKey('antiraid', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `🛡️ *Anti-Raid* is now *${val.toUpperCase()}*\n` +
                      (val === 'on' ? `• Auto-kicks if ${RAID_LIMIT}+ users join within ${RAID_WINDOW/1000}s.` : '')
            }, { quoted: m });
        }
    },

    // ==================== welcome ====================
    {
        name: 'welcome',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle welcome messages in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}welcome on/off\nSet message: ${global.getPrefix()}setwelcome [text] (use {user} for mention)`
            }, { quoted: m });
            secDB.set(groupKey('welcome', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `👋 *Welcome Messages* are now *${val.toUpperCase()}*`
            }, { quoted: m });
        }
    },

    // ==================== setwelcome ====================
    {
        name: 'setwelcome',
        category: 'security',
        ownerOnly: false,
        description: 'Set custom welcome message',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const msg = args.join(' ');
            if (!msg) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}setwelcome [message]\nUse {user} where you want the mention.`
            }, { quoted: m });
            secDB.set(groupKey('welcomemsg', jid), msg);
            await sock.sendMessage(jid, {
                text: `✅ Welcome message updated!\n\nPreview:\n${msg.replace('{user}', '@User')}`
            }, { quoted: m });
        }
    },

    // ==================== goodbye ====================
    {
        name: 'goodbye',
        category: 'security',
        ownerOnly: false,
        description: 'Toggle goodbye messages in this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const val = args[0]?.toLowerCase();
            if (!['on','off'].includes(val)) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}goodbye on/off\nSet message: ${global.getPrefix()}setgoodbye [text] (use {user} for mention)`
            }, { quoted: m });
            secDB.set(groupKey('goodbye', jid), val === 'on');
            await sock.sendMessage(jid, {
                text: `👋 *Goodbye Messages* are now *${val.toUpperCase()}*`
            }, { quoted: m });
        }
    },

    // ==================== setgoodbye ====================
    {
        name: 'setgoodbye',
        category: 'security',
        ownerOnly: false,
        description: 'Set custom goodbye message',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });
            const msg = args.join(' ');
            if (!msg) return sock.sendMessage(jid, {
                text: `Usage: ${global.getPrefix()}setgoodbye [message]\nUse {user} where you want the mention.`
            }, { quoted: m });
            secDB.set(groupKey('goodbyemsg', jid), msg);
            await sock.sendMessage(jid, {
                text: `✅ Goodbye message updated!\n\nPreview:\n${msg.replace('{user}', '@User')}`
            }, { quoted: m });
        }
    },

    // ==================== secstatus ====================
    {
        name: 'secstatus',
        category: 'security',
        ownerOnly: false,
        description: 'Show all security settings for this group',
        func: async (m, sock, args) => {
            const jid = m.key.remoteJid;
            if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Group only command.' }, { quoted: m });

            const on  = '🟢 ON';
            const off = '🔴 OFF';

            await sock.sendMessage(jid, {
                text: `🛡️ *Security Status*\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      `🔗 Anti-Link    : ${isEnabled('antilink',    jid) ? on : off}\n` +
                      `🚫 Anti-Spam    : ${isEnabled('antispam',    jid) ? on : off}\n` +
                      `🤬 Anti-BadWord : ${isEnabled('antibadword', jid) ? on : off}\n` +
                      `👁️ Anti-Delete  : ${isEnabled('antidelete',  jid) ? on : off}\n` +
                      `🛡️ Anti-Raid    : ${isEnabled('antiraid',    jid) ? on : off}\n` +
                      `👋 Welcome      : ${isEnabled('welcome',     jid) ? on : off}\n` +
                      `👋 Goodbye      : ${isEnabled('goodbye',     jid) ? on : off}\n` +
                      `🤬 Bad Words    : ${getBadWords().length} word(s) set\n` +
                      `━━━━━━━━━━━━━━━\n` +
                      ` ╚━━━━━━「🅰️n0nOtF  𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘」━━━━━━╝`
            }, { quoted: m });
        }
    }

];

