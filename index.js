const fetch = require('node-fetch');
const FormData = require('form-data');
const express = require('express');
const app = express();

// Token Telegram Bot
const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA';
const apiUrl = `https://api.telegram.org/bot${token}/`;

// Fungsi untuk mengirim pesan ke Telegram
async function sendMessage(chatId, text) {
  const response = await fetch(`${apiUrl}sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
  return response.json();
}

// Fungsi untuk mengirim foto ke Telegram
async function sendPhoto(chatId, file) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('photo', file);

  const response = await fetch(`${apiUrl}sendPhoto`, {
    method: 'POST',
    body: form,
  });
  return response.json();
}

// Fungsi untuk memproses update yang masuk dari Telegram
app.use(express.json());  // Middleware untuk menerima JSON body

app.post('/api/telegram', async (req, res) => {
  const { message } = req.body;

  // Pastikan ada pesan dan ada file gambar
  if (message) {
    const { chat, photo, text } = message;
    const chatId = chat.id;

    if (text === '/start') {
      // Kirim pesan saat user mengirim /start
      await sendMessage(chatId, 'Halo! Kirim gambar untuk diproses!');
      return res.sendStatus(200);
    }

    if (photo) {
      // Cek ukuran gambar
      const fileId = photo[photo.length - 1].file_id;  // Ambil gambar dengan ukuran terbesar
      const fileInfo = await fetch(`${apiUrl}getFile?file_id=${fileId}`).then(res => res.json());

      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

      // Ambil ukuran gambar
      const imageBuffer = await fetch(fileUrl).then(res => res.buffer());
      const imageSize = imageBuffer.length / 1024;  // Ukuran dalam KB

      // Cek apakah ukuran gambar sesuai batas
      if (imageSize >= 10 && imageSize <= 6000) {
        // Proses gambar dan kirim pesan
        await sendMessage(chatId, '📸 Gambar sedang kami proses...');
        
        // Simulasi mengirim gambar untuk diproses oleh API eksternal
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const apiResponse = await fetch('https://nitahai.vercel.app/asisten', {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        });

        const apiResult = await apiResponse.json();

        if (apiResult.ok) {
          await sendMessage(chatId, '✨ Gambar berhasil diproses!');
        } else {
          await sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
        }
      } else {
        // Gambar terlalu besar atau kecil
        await sendMessage(chatId, 'Gambar harus antara 10KB dan 6MB.');
      }
    } else {
      // Pesan bukan gambar
      await sendMessage(chatId, 'Silakan kirim gambar!');
    }
  }

  // Beri respons HTTP 200 agar Telegram mengetahui bahwa pesan diterima
  res.sendStatus(200);
});

// Ekspor app untuk digunakan di Vercel (tanpa port)
module.exports = app;
