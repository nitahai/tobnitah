const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();
const port = process.env.PORT || 3000;

// Ganti dengan token bot Telegram Anda yang baru
const token = '7799759103:AAEn03hiwvEVBmG7_2H11t4eC3JFS78v-DU';
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Fungsi untuk menangani webhook Telegram
app.use(express.json());

// Webhook endpoint untuk menerima pembaruan Telegram
app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  // Pastikan ada pesan dalam update dan periksa jika itu perintah /start
  if (update.message && update.message.text === '/start') {
    const chatId = update.message.chat.id;
    await sendMessage(chatId, 'Hallo pelajar, silahkan kirim foto pelajaran kamu!');
  }

  // Periksa jika ada pesan dengan gambar
  if (update.message && update.message.photo) {
    const chatId = update.message.chat.id;
    const fileId = update.message.photo[update.message.photo.length - 1].file_id;

    try {
      // Kirim pesan "Sebentar, foto soal kamu sedang diproses mencari jawaban..."
      await sendMessage(chatId, 'Sebentar, foto soal kamu sedang diproses mencari jawaban...');

      // Mendapatkan URL file gambar dari Telegram
      const fileUrl = await getTelegramFileUrl(fileId);

      // Mengambil gambar dan mengirimkannya ke API roast
      const buffer = await fetch(fileUrl).then(res => res.buffer());

      // Menghasilkan nama file acak
      const randomFilename = generateRandomFilename();

      // Kirim gambar ke API roast
      const apiUrl = 'https://nitah.vercel.app/roast';
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
  }

  // Mengirimkan status OK untuk webhook Telegram
  res.sendStatus(200);
});

// Fungsi untuk mendapatkan URL gambar dari Telegram
async function getTelegramFileUrl(fileId) {
  const response = await fetch(`${telegramApiUrl}getFile?file_id=${fileId}`);
  const data = await response.json();
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

// Fungsi untuk mengirim pesan ke Telegram
async function sendMessage(chatId, text) {
  await fetch(`${telegramApiUrl}sendMessage`, {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '.jpeg'; // Nama file acak
}

// Mengatur webhook untuk bot Telegram
async function setWebhook() {
  const url = `https://botku-sigma.vercel.app/webhook/${token}`;  // Gantilah dengan URL endpoint webhook Anda
  try {
    const response = await fetch(`${telegramApiUrl}setWebhook?url=${url}`);
    const result = await response.json();
    if (result.ok) {
      console.log(`Webhook set to: ${url}`);
    } else {
      console.log('Webhook setup failed:', result.description);
    }
  } catch (error) {
    console.error('Failed to set webhook:', error);
  }
}

// Menyusun Webhook Telegram
setWebhook();

// Menjalankan server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
