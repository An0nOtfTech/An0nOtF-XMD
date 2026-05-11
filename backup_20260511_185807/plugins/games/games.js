// plugins/games/games.js

module.exports = [

{
    name: 'guess',
    category: 'games',
    ownerOnly: false,
    description: 'Number guessing game',
    func: async (m, sock, args) => {
        const num = Math.floor(Math.random() * 10) + 1;
        await sock.sendMessage(m.key.remoteJid, { text: `🎮 *Guess the Number (1-10)*\n\nAnswer: *${num}* 🎉` }, { quoted: m });
    }
},

{
    name: 'hangman',
    category: 'games',
    ownerOnly: false,
    description: 'Hangman word game',
    func: async (m, sock, args) => {
        const words = ['javascript','python','programming','computer','algorithm','database','network','terminal'];
        const word = words[Math.floor(Math.random() * words.length)];
        const hidden = '\\_ '.repeat(word.length).trim();
        await sock.sendMessage(m.key.remoteJid, {
            text: `🎮 *Hangman*\n\nWord: ${hidden}\nLength: ${word.length}\nCategory: Programming\n💡 Hint: starts with "${word[0]}", ends with "${word[word.length-1]}"`
        }, { quoted: m });
    }
},

{
    name: 'tictactoe',
    category: 'games',
    ownerOnly: false,
    description: 'Tic Tac Toe board',
    func: async (m, sock, args) => {
        await sock.sendMessage(m.key.remoteJid, {
            text: `🎮 *Tic Tac Toe*\n\n1️⃣ 2️⃣ 3️⃣\n4️⃣ 5️⃣ 6️⃣\n7️⃣ 8️⃣ 9️⃣\n\nUse ${global.DEFAULT_PREFIX}tictactoe [1-9] to play`
        }, { quoted: m });
    }
},

{
    name: 'math',
    category: 'games',
    ownerOnly: false,
    description: 'Random math challenge',
    func: async (m, sock, args) => {
        const ops = ['+','-','*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        const ans = op === '+' ? a+b : op === '-' ? a-b : a*b;
        await sock.sendMessage(m.key.remoteJid, { text: `🧮 *Math Challenge*\n\n${a} ${op} ${b} = ?\n\nAnswer: *${ans}* ✅` }, { quoted: m });
    }
},

{
    name: 'countdown',
    category: 'games',
    ownerOnly: false,
    description: 'Countdown timer',
    func: async (m, sock, args) => {
        const secs = Math.min(parseInt(args[0]) || 10, 300);
        const sender = m.key.participant || m.key.remoteJid;
        await sock.sendMessage(m.key.remoteJid, { text: `⏱️ Countdown: *${secs}s* started!` }, { quoted: m });
        setTimeout(async () => {
            // FIX: use global.sock so reconnects don't break delayed messages
            try {
                await (global.sock || sock).sendMessage(m.key.remoteJid, {
                    text: `⏰ *TIME'S UP!*\n\n@${sender.split('@')[0]} — ${secs}s done!`,
                    mentions: [sender]
                });
            } catch (e) {}
        }, secs * 1000);
    }
}

];
