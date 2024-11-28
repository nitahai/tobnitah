const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const { TELEGRAM_TOKEN } = process.env;

// Membuat bot dengan token
const bot = new Telegraf(TELEGRAM_TOKEN);

// Handler ketika bot baru dimulai dengan /start
bot.start((ctx) => {
  ctx.reply('Hallo pelajar, silahkan upload foto soal oelajaran kamu');
});

// Handler ketika bot menerima gambar
bot.on('photo', async (ctx) => {
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const fileUrl = await ctx.telegram.getFileLink(fileId);
  
  // Mengirim gambar ke API
  const response = await fetch('https://nitahai.vercel.app/asisten', {
    method: 'POST',
    body: JSON.stringify({ file: fileUrl }),
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  
  // Mengirimkan text yang diterima dari API ke pengguna
  if (data.ok) {
    ctx.reply(data.text);
  } else {
    ctx.reply('Ada kesalahan saat mengirimkan gambar ke API.');
  }
});

// Memulai bot
bot.launch().then(() => {
  console.log('Bot is running...');
});
