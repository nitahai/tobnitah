const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Telegraf } = require('telegraf');

const app = express();

// Bot token dari Telegram
const botToken = process.env.BOT_TOKEN; // Pastikan token bot dimasukkan di .env
const bot = new Telegraf(botToken);

// Middleware untuk menerima data JSON dari webhook
app.use(express.json());

// Endpoint untuk webhook Telegram
app.post('/webhook', async (req, res) => {
  const { message } = req.body;
  const chatId = message.chat.id;

  // Menyapa pengguna saat mengirim /start
  if (message.text && message.text === '/start') {
    await bot.telegram.sendMessage(chatId, 'Hallo pelajar, silahkan upload foto soal pelajaran kamu');
  }

  // Handle foto yang dikirim pengguna
  if (message.photo) {
    await bot.telegram.sendMessage(chatId, 'Foto soal pelajaran kamu sedang diproses, sedang mencari jawabannya.');

    // Mengambil ID file gambar dari pesan
    const fileId = message.photo[message.photo.length - 1].file_id;

    try {
      // Mendapatkan URL file gambar dari Telegram
      const fileUrl = await bot.telegram.getFileLink(fileId);

      // Mengambil gambar dan mengirimkannya ke API eksternal
      const buffer = await fetch(fileUrl).then(res => res.buffer());

      const apiUrl = 'https://nitahai.vercel.app/asisten';
      const form = new FormData();
      form.append('file', buffer, { filename: 'soal.jpg', contentType: 'image/jpeg' });

      // Kirim gambar ke API untuk diproses
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const apiResult = await apiResponse.json();
      if (apiResult.ok) {
        // Kirimkan hasil teks dari API ke pengguna
        await bot.telegram.sendMessage(chatId, apiResult.text);
      } else {
        await bot.telegram.sendMessage(chatId, 'Terjadi kesalahan saat memproses foto.');
      }
    } catch (error) {
      console.error('Error:', error);
      await bot.telegram.sendMessage(chatId, 'Gagal memproses foto.');
    }
  }

  // Kirim status OK untuk webhook Telegram
  res.sendStatus(200);
});

// Menjalankan server di port yang sudah ditentukan
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
