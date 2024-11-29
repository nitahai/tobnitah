const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Flag untuk memastikan hanya satu proses pengiriman dalam satu waktu
app.use(express.json());

app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;

    // Jika pesan teks adalah "/start"
    if (update.message.text === '/start') {
      await sendMessage(chatId, '👋 Hallo pelajar, Selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

    // Jika ada pesan dengan gambar
    if (update.message.photo) {
      try {
        // Dapatkan file_id gambar yang dikirim
        const fileId = update.message.photo[update.message.photo.length - 1].file_id;

        // Kirim pesan terlebih dahulu untuk memberitahu user bahwa proses sedang berjalan
        await sendMessage(chatId, '✨ Sedang memproses gambar kamu, tunggu sebentar ya...');

        // Mendapatkan URL file gambar dan mengirim pesan
        const fileUrl = await getTelegramFileUrl(fileId);

        if (!fileUrl) {
          await sendMessage(chatId, 'Maaf, gambar tidak dapat diambil. Silakan kirim foto soal yang lain agar tidak terjadi pending.');
          return; // Jika URL tidak ditemukan, hentikan proses
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

        // Set timeout untuk memeriksa jika bot tidak memberikan feedback dalam waktu 30 detik
        const timeout = setTimeout(async () => {
          await sendMessage(chatId, 'Silahkan kirim ulang foto soalmu.');
        }, 15000); // 15 detik

        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        });

        // Batalkan timeout jika proses selesai dalam waktu yang wajar
        clearTimeout(timeout);

        if (apiResponse.status === 504) {
          // Menangani kesalahan 504 Gateway Timeout
          await sendMessage(chatId, 'Terjadi kesalahan pada server, tidak dapat menghubungi asisten untuk memproses gambar. Silahkan kirim foto soal yang lain.');
          await sendPhoto(chatId, 'https://img-9gag-fun.9cache.com/photo/ayNeMQb_460swp.webp'); // Ganti dengan URL gambar default jika diperlukan
        } else {
          const apiResult = await apiResponse.json();

          // Kirim pesan untuk memberitahukan bahwa gambar sudah diproses
          if (apiResult.ok) {
            await sendMessage(chatId, '✨ Nitah udah beri jawabannya nih.');
            await sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
          } else {
            await sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        await sendMessage(chatId, 'Gagal memproses gambar.');
      }
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
