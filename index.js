const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { generateRandomFilename, getTelegramFileUrl, sendMessage } = require('./utils'); // Import fungsi-fungsi dari utils.js

require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Menangani gambar yang dikirim
bot.on('photo', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const photo = ctx.message.photo;
  const fileId = photo[photo.length - 1].file_id;

  try {
    // Mendapatkan URL file gambar dari Telegram
    const fileUrl = await getTelegramFileUrl(fileId);

    // Mengambil gambar dan mengirimkannya ke API roast
    const buffer = await fetch(fileUrl).then(res => res.buffer());

    // Menghasilkan nama file acak
    const randomFilename = generateRandomFilename();

    // Kirim gambar ke API roast
    const apiUrl = 'https://nitahai.vercel.app/asisten';
    const form = new FormData();
    form.append('file', buffer, {
      filename: randomFilename,
      contentType: 'image/jpeg'
    });

    // Kirim request POST ke API roast
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    // Mendapatkan respons dari API roast
    const apiResult = await apiResponse.json();

    if (apiResult.ok) {
      // Mengirimkan respons teks dari API roast ke pengguna Telegram
      await sendMessage(chatId, apiResult.text || 'Gambar berhasil dikirim ke API!');
    } else {
      await sendMessage(chatId, 'Terjadi kesalahan saat mengirim gambar ke API roast.');
    }
  } catch (error) {
    console.error('Error:', error);
    await sendMessage(chatId, 'Gagal mengirim gambar ke API.');
  }
});

// Menanggapi perintah /start
bot.start((ctx) => {
  ctx.reply('Hallo pelajar, silahkan upload foto soal oalahan kamu');
});

// Mulai bot
bot.launch();
