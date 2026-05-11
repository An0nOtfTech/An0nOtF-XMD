// plugins/fun/fun.js

module.exports = [

{
    name: 'joke',
    category: 'fun',
    ownerOnly: false,
    description: 'Random joke',
    func: async (m, sock, args) => {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "What do you call a fake noodle? An impasta!",
            "Why don't eggs tell jokes? They'd crack each other up!",
            "What do you call a bear with no teeth? A gummy bear!",
            "Why can't you give Elsa a balloon? Because she'll let it go!",
            "Why did the bicycle fall over? It was two-tired!",
            "What do you call cheese that isn't yours? Nacho cheese!"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `😂 *Joke:*\n\n${jokes[Math.floor(Math.random() * jokes.length)]}` }, { quoted: m });
    }
},

{
    name: 'meme',
    category: 'fun',
    ownerOnly: false,
    description: 'Programming meme',
    func: async (m, sock, args) => {
        const memes = [
            "Why did the JS dev wear glasses?\nBecause he couldn't C#!",
            "Why do programmers prefer dark mode?\nBecause light attracts bugs!",
            "What's a programmer's favorite hangout?\nFoo Bar!",
            "Why did the dev go broke?\nHe used up all his cache!",
            "How many programmers to change a bulb?\nNone, that's a hardware problem!"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `😂 *Meme:*\n\n${memes[Math.floor(Math.random() * memes.length)]}` }, { quoted: m });
    }
},

{
    name: 'fact',
    category: 'fun',
    ownerOnly: false,
    description: 'Random fact',
    func: async (m, sock, args) => {
        const facts = [
            "Honey never spoils. 3,000 year old honey found in Egyptian tombs was still good!",
            "Octopuses have three hearts.",
            "A group of flamingos is called a 'flamboyance'.",
            "Bananas are berries, but strawberries aren't.",
            "The shortest war lasted 38 minutes — Britain vs Zanzibar, 1896.",
            "A day on Venus is longer than a year on Venus.",
            "Cleopatra lived closer to the Moon landing than to the pyramids being built."
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `🤯 *Fact:*\n\n${facts[Math.floor(Math.random() * facts.length)]}` }, { quoted: m });
    }
},

{
    name: 'quote',
    category: 'fun',
    ownerOnly: false,
    description: 'Random quote',
    func: async (m, sock, args) => {
        const quotes = [
            "The only way to do great work is to love what you do. — Steve Jobs",
            "Life is what happens while you're busy making other plans. — John Lennon",
            "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
            "In our darkest moments we must focus to see the light. — Aristotle",
            "Whoever is happy will make others happy too. — Anne Frank"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `💭 *Quote:*\n\n"${quotes[Math.floor(Math.random() * quotes.length)]}"` }, { quoted: m });
    }
},

{
    name: 'truth',
    category: 'fun',
    ownerOnly: false,
    description: 'Truth or dare — truth',
    func: async (m, sock, args) => {
        const truths = [
            "What's the most embarrassing thing you've ever done?",
            "Have you ever cheated on a test?",
            "What's your biggest fear?",
            "Have you ever lied to get out of trouble?",
            "What's the worst thing you've ever said to someone?"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `🤔 *Truth:*\n\n${truths[Math.floor(Math.random() * truths.length)]}` }, { quoted: m });
    }
},

{
    name: 'dare',
    category: 'fun',
    ownerOnly: false,
    description: 'Truth or dare — dare',
    func: async (m, sock, args) => {
        const dares = [
            "Do 10 pushups right now!",
            "Send a funny selfie to the group!",
            "Sing a song for 30 seconds!",
            "Tell a joke to the next person you see!",
            "Do your best dance move!"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `😈 *Dare:*\n\n${dares[Math.floor(Math.random() * dares.length)]}` }, { quoted: m });
    }
},

{
    name: '8ball',
    category: 'fun',
    ownerOnly: false,
    description: 'Magic 8-ball',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}8ball [question]` }, { quoted: m });
        const responses = [
            "It is certain 🎱","Definitely so 🎱","Without a doubt 🎱","Yes! 🎱",
            "Most likely 🎱","Signs point to yes 🎱","Ask again later 🎱","Cannot predict 🎱",
            "Don't count on it 🎱","Very doubtful 🎱","My reply is no 🎱","Outlook not good 🎱"
        ];
        await sock.sendMessage(m.key.remoteJid, {
            text: `🎱 *Magic 8-Ball*\n\n❓ ${args.join(' ')}\n💬 ${responses[Math.floor(Math.random() * responses.length)]}`
        }, { quoted: m });
    }
},

{
    name: 'ship',
    category: 'fun',
    ownerOnly: false,
    description: 'Love calculator',
    func: async (m, sock, args) => {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const participant = m.message?.extendedTextMessage?.contextInfo?.participant;
        let user1, user2;
        if (mentioned.length >= 2) { user1 = mentioned[0]; user2 = mentioned[1]; }
        else if (mentioned.length === 1 && participant) { user1 = participant; user2 = mentioned[0]; }
        else if (args.length >= 2) { user1 = args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net'; user2 = args[1].replace(/[^0-9]/g,'') + '@s.whatsapp.net'; }
        else return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}ship @user1 @user2` }, { quoted: m });

        const score = Math.floor(Math.random() * 101);
        const status = score < 20 ? "Not a match ❌" : score < 40 ? "Better as friends 👫" : score < 60 ? "Possible match 💕" : score < 80 ? "Great match! 💖" : "Perfect match! 💘";
        const n1 = user1.split('@')[0], n2 = user2.split('@')[0];
        await sock.sendMessage(m.key.remoteJid, {
            text: `💘 *Love Calculator*\n\n👤 @${n1} + @${n2}\n❤️ Score: ${score}%\n📛 Ship: ${n1.slice(0,3)}${n2.slice(0,3)}\n💌 ${status}\n\n${'❤️'.repeat(Math.floor(score/10))}`,
            mentions: [user1, user2]
        }, { quoted: m });
    }
},

{
    name: 'rate',
    category: 'fun',
    ownerOnly: false,
    description: 'Rate something',
    func: async (m, sock, args) => {
        if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: `Usage: ${global.DEFAULT_PREFIX}rate [something]` }, { quoted: m });
        const rating = Math.floor(Math.random() * 101);
        const stars = '⭐'.repeat(Math.floor(rating/10)) + '☆'.repeat(10-Math.floor(rating/10));
        await sock.sendMessage(m.key.remoteJid, { text: `⭐ *Rating: ${args.join(' ')}*\n\n${rating}/100\n${stars}` }, { quoted: m });
    }
},

{
    name: 'coin',
    category: 'fun',
    ownerOnly: false,
    description: 'Flip a coin',
    func: async (m, sock, args) => {
        const r = Math.random() > 0.5 ? 'HEADS 👑' : 'TAILS 🐉';
        await sock.sendMessage(m.key.remoteJid, { text: `🪙 *Coin Flip:* ${r}` }, { quoted: m });
    }
},

{
    name: 'dice',
    category: 'fun',
    ownerOnly: false,
    description: 'Roll a dice',
    func: async (m, sock, args) => {
        const roll = Math.floor(Math.random() * 6) + 1;
        const emoji = ['⚀','⚁','⚂','⚃','⚄','⚅'][roll-1];
        await sock.sendMessage(m.key.remoteJid, { text: `🎲 *Dice Roll:* ${roll} ${emoji}` }, { quoted: m });
    }
},

{
    name: 'draw',
    category: 'fun',
    ownerOnly: false,
    description: 'Draw ASCII art (heart/square/triangle/smiley)',
    func: async (m, sock, args) => {
        const shapes = {
            heart: `❤️\n💖💖\n💕💕💕\n💓💓💓💓\n 💗💗💗\n  💝💝\n   💘`,
            square: `⬛⬛⬛⬛\n⬛      ⬛\n⬛      ⬛\n⬛⬛⬛⬛`,
            triangle: `   🔺\n  🔺🔺\n 🔺  🔺\n🔺🔺🔺🔺`,
            smiley: `😊😊😊\n😊  😊\n😊😊😊\n  😊😊\n   😊`
        };
        const shape = args[0]?.toLowerCase() || 'heart';
        await sock.sendMessage(m.key.remoteJid, { text: `*🎨 ${shape.toUpperCase()}*\n\n${shapes[shape] || shapes.heart}` }, { quoted: m });
    }
},

{
    name: 'advice',
    category: 'fun',
    ownerOnly: false,
    description: 'Random life advice',
    func: async (m, sock, args) => {
        const list = [
            "Sleep 8 hours daily 😴","Drink 2L water every day 💧","Save 20% of your income 💰",
            "Exercise 30 minutes daily 🏃","Eat more fruits and vegetables 🍎",
            "Limit screen time before bed 📵","Practice gratitude daily 🙏","Read 30 minutes daily 📚"
        ];
        await sock.sendMessage(m.key.remoteJid, { text: `💡 *Advice:*\n\n${list[Math.floor(Math.random() * list.length)]}` }, { quoted: m });
    }
},

{
    name: 'bug',
    category: 'fun',
    ownerOnly: false,
    description: 'Bug simulator (fun)',
    func: async (m, sock, args) => {
        const bugs = ['Unlimited Lag','Fusion Lag','Airforce Lag','iOS Kill','Benkai','Zenitsu','Ride or Die','Zoro','Elite']
            .map((b,i) => `🔹 ${b} (98765432${10+i})`).join('\n');
        await sock.sendMessage(m.key.remoteJid, { text: `🐛 *BUGS (Simulation)*\n\n${bugs}\n\n⚠️ Fun only!` }, { quoted: m });
    }
}

];

