const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();
const port = process.env.PORT || 3000;

// Ganti dengan token bot Telegram Anda yang baru
const token = '7580171291:AAFAD8UG0xhCVkfih4j072CEwvR_YCXlnhw';
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Fungsi untuk menangani webhook Telegram
app.use(express.json());

// Webhook endpoint untuk menerima pembaruan Telegram
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (!update.message) {
    return res.sendStatus(200); // Jika tidak ada pesan, tidak perlu diproses lebih lanjut
  }

  const chatId = update.message.chat.id;

  try {
    // Periksa jika itu perintah /start
    if (update.message.text === '/start') {
      await sendMessage(chatId, 'Hallo pelajar, silahkan kirim foto pelajaran kamu!');
    }

    // Periksa jika ada pesan dengan gambar
    if (update.message.photo) {
      const fileId = update.message.photo[update.message.photo.length - 1].file_id;

      // Kirim pesan "Sebentar, foto soal kamu sedang diproses mencari jawaban..."
      await sendMessage(chatId, 'Sebentar, foto soal kamu sedang diproses mencari jawaban...');

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
    }

    // Mengirimkan status OK untuk webhook Telegram
    res.sendStatus(200);

  } catch (error) {
    console.error('Error:', error);
    await sendMessage(chatId, 'Terjadi kesalahan dalam memproses permintaan.');
    res.sendStatus(500);
  }
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

// Menyusun Webhook Telegram
async function setWebhook() {
  const url = `https://nitahbot.vercel.app/api/webhook`;  // Pastikan URL yang benar
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
