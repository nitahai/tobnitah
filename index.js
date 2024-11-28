const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const FormData = require('form-data');
const express = require('express');
const app = express();

// Gantilah dengan token Telegram Anda
const BOT_TOKEN = process.env.TELEGRAM_TOKEN; // Pastikan token Anda ada di .env

const bot = new Telegraf(BOT_TOKEN);

// Setup route untuk webhook
app.use(express.json());

// Perintah /start
bot.start((ctx) => {
  ctx.reply('Hallo pelajar, silahkan upload foto soal pelajaran kamu');
});

// Menangani gambar yang dikirimkan
bot.on('photo', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  
  try {
    await ctx.reply('Foto soal pelajaran kamu sedang diproses, sedang mencari jawabannya.');

    const fileUrl = await getTelegramFileUrl(fileId);
    const buffer = await fetch(fileUrl).then(res => res.buffer());

    const form = new FormData();
    form.append('file', buffer, {
      filename: 'soal.jpg',
      contentType: 'image/jpeg'
    });

    const apiUrl = 'https://nitahai.vercel.app/asisten';
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const apiResult = await apiResponse.json();

    if (apiResult.ok) {
      await ctx.reply(apiResult.text || 'Gambar berhasil dikirim ke API!');
    } else {
      await ctx.reply('Terjadi kesalahan saat mengirim gambar ke API.');
    }
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Gagal mengirim gambar ke API.');
  }
});

// Set up webhook endpoint
app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Mengatur webhook Telegram
async function setWebhook() {
  const webhookUrl = `https://nitahbot.vercel.app/webhook/${BOT_TOKEN}`;
  await bot.telegram.setWebhook(webhookUrl);
  console.log('Webhook set to:', webhookUrl);
}

// Memulai bot
app.listen(3000, () => {
  setWebhook();
  console.log('Server is running on port 3000');
});
