const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Gunakan middleware untuk menerima JSON
app.use(express.json());

// Webhook untuk menerima pesan dari Telegram
app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  // Jika ada pesan yang diterima
  if (update.message) {
    const chatId = update.message.chat.id;

    // Jika pesan teks adalah "/start"
    if (update.message.text === '/start') {
      sendMessage(chatId, '👋 Hallo pelajar, Selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

    // Jika ada pesan dengan gambar
    if (update.message.photo) {
      // Proses gambar tanpa menunggu proses sebelumnya
      handleImage(update.message, chatId);
    }
  }

  res.sendStatus(200); // Kirimkan status 200 untuk memberitahukan Telegram bahwa pesan diterima
});

// Fungsi untuk mengirim pesan ke Telegram
async function sendMessage(chatId, text) {
  try {
    await fetch(`${telegramApiUrl}sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, text }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Fungsi untuk menangani gambar yang dikirim oleh pengguna
async function handleImage(message, chatId) {
  try {
    const fileId = message.photo[message.photo.length - 1].file_id; // Ambil file_id dari gambar
    const fileUrl = await getTelegramFileUrl(fileId); // Dapatkan URL file gambar

    if (!fileUrl) {
      sendMessage(chatId, 'Gagal mendapatkan gambar, coba kirimkan foto soal lagi.');
      return; // Jika URL gambar tidak ditemukan, hentikan proses
    }

    const buffer = await fetch(fileUrl).then(res => res.buffer()); // Ambil gambar dalam bentuk buffer
    console.log('Buffer gambar diterima:', buffer);

    const randomFilename = generateRandomFilename();
    const form = new FormData();
    form.append('file', buffer, {
      filename: randomFilename,
      contentType: 'image/jpeg',
    });

    // Proses gambar dengan API Asisten secara asinkron
    processImageWithApi(form, chatId);
  } catch (error) {
    console.error('Error handling image:', error);
    sendMessage(chatId, 'Gagal memproses gambar.');
  }
}

// Fungsi untuk mengambil URL gambar dari Telegram
async function getTelegramFileUrl(fileId) {
  try {
    const response = await fetch(`${telegramApiUrl}getFile?file_id=${fileId}`);
    const data = await response.json();

    if (data.ok) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    } else {
      throw new Error('Error fetching file URL');
    }
  } catch (error) {
    console.error('Error fetching file URL:', error);
    return null;
  }
}

// Fungsi untuk memproses gambar dengan API Asisten
async function processImageWithApi(form, chatId) {
  try {
    const apiUrl = 'https://nitahai.vercel.app/asisten'; // Ganti dengan URL API Asisten Anda
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    const apiResult = await apiResponse.json();
    console.log('Hasil API:', apiResult);

    if (apiResult.ok) {
      sendMessage(chatId, '✨ Nitah udah beri jawabannya nih.');
      sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
    } else {
      sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
    }
  } catch (error) {
    console.error('API Error:', error);
    sendMessage(chatId, 'Gagal memproses gambar dengan API Asisten.');
  }
}

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '.jpeg';
}

// Fungsi untuk set webhook
async function setWebhook() {
  const url = `https://nitahbot.vercel.app/webhook/${token}`;
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

setWebhook(); // Memastikan webhook aktif

module.exports = app;
