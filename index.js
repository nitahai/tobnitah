const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

app.post(`/webhook/${token}`, (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;

    // Jika pesan teks adalah "/start"
    if (update.message.text === '/start') {
      sendMessage(chatId, '👋 Hallo pelajar, Selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

    // Jika pesan teks adalah "/informasi"
    if (update.message.text === '/informasi') {
      sendMessage(chatId, 'Bot Nitah ini dirancang untuk membantu memproses gambar soal pelajaran sekolah kamu dan mencari jawaban dengan cepat. Cukup kirimkan gambar soalmu, dan Nitah akan memperoses untuk memberikan jawaban yang cepat dan tepat!');
    }

    // Jika pesan teks adalah "/tentang"
    if (update.message.text === '/tentang') {
      sendMessage(chatId, 'Bot Nitah ini dibuat oleh Zakia dengan tujuan untuk membantu pelajar dalam menyelesaikan soal pelajaran secara cepat dan tepat. Cukup kirimkan foto soal, dan bot Nitah akan mencari jawaban untuk kamu.\n\n' +
        'Untuk informasi lebih lanjut, kunjungi situs kami: 🌐 https://nitah.web.id\n' +
        'Dukung kami melalui: ✨ https://saweria.co/zakiakaidzan');
    }

    // Jika ada pesan dengan gambar
    if (update.message.photo) {
      // Proses pengiriman gambar dilakukan tanpa menunggu selesai
      handleImageProcessing(chatId, update.message.photo[update.message.photo.length - 1].file_id);
    }
  }

  res.sendStatus(200);
});

// Fungsi untuk mendapatkan URL file gambar dari Telegram
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
    console.error('Error:', error);
    return null;
  }
}

// Fungsi untuk mengirim pesan ke Telegram
async function sendMessage(chatId, text) {
  await fetch(`${telegramApiUrl}sendMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, text }),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fungsi untuk mengirim foto ke Telegram
async function sendPhoto(chatId, photoUrl) {
  await fetch(`${telegramApiUrl}sendPhoto`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl }),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fungsi untuk menghandle proses gambar secara paralel
async function handleImageProcessing(chatId, fileId) {
  try {
    // Mendapatkan file URL dari Telegram
    const fileUrl = await getTelegramFileUrl(fileId);

    if (!fileUrl) {
      sendMessage(chatId, 'Maaf, gambar tidak dapat diambil. Silakan kirim foto soal yang lain agar tidak terjadi pending.');
      return;
    }

    // Ambil gambar dari Telegram
    const buffer = await fetch(fileUrl).then(res => res.buffer());
    const randomFilename = generateRandomFilename();

    // Persiapkan form-data untuk kirim gambar
    const form = new FormData();
    form.append('file', buffer, {
      filename: randomFilename,
      contentType: 'image/jpeg',
    });

    const apiUrl = 'https://nitahai.vercel.app/asisten';
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (apiResponse.status === 504) {
      // Menangani kesalahan 504 Gateway Timeout
      sendMessage(chatId, 'Terjadi kesalahan pada server, tidak dapat menghubungi asisten untuk memproses gambar. Silahkan kirim foto soal yang lain.');
      sendPhoto(chatId, 'https://img-9gag-fun.9cache.com/photo/ayNeMQb_460swp.webp'); // Ganti dengan URL gambar default jika diperlukan
    } else {
      const apiResult = await apiResponse.json();

      // Kirim pesan untuk memberitahukan bahwa gambar sudah diproses
      if (apiResult.ok) {
        sendMessage(chatId, '✨ Nitah udah beri jawabannya nih.');
        sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
      } else {
        sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    sendMessage(chatId, 'Gagal memproses gambar.');
  }
}

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '.jpeg';
}

// Fungsi untuk mengatur webhook Telegram
async function setWebhook() {
  const url = `https://nitahbot.vercel.app/webhook/${token}`; // Ganti dengan domain Vercel kamu
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

setWebhook();

module.exports = app; // Ekspor app untuk Vercel
