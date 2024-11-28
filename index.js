const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Menanggapi perintah /start
bot.start((ctx) => {
  ctx.reply('Hallo pelajar, silahkan upload foto soal oalahan kamu');
});

// Menangani gambar yang dikirim
bot.on('photo', (ctx) => {
  const photo = ctx.message.photo;
  const file_id = photo[photo.length - 1].file_id;
  
  // Kirim file gambar ke API asisten
  fetch('https://nitahai.vercel.app/asisten', {
    method: 'POST',
    body: JSON.stringify({ file: file_id }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) {
      const text = data.text;
      ctx.reply(text);
    } else {
      ctx.reply('Terjadi kesalahan saat mengirim gambar.');
    }
  })
  .catch(error => {
    ctx.reply('Terjadi kesalahan koneksi.');
  });
});

// Mulai bot
bot.launch();
