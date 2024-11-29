const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Menggunakan objek untuk melacak status pesan yang sedang diproses
const processingMessages = new Map(); // Map untuk menyimpan status setiap pesan berdasarkan chatId dan messageId

app.use(express.json());

app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;

    // Cek apakah pesan baru adalah /start
    if (update.message.text === '/start') {
      await sendMessage(chatId, '👋 Hallo pelajar, Selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

    // Cek apakah pesan baru adalah /stop
    if (update.message.text === '/stop') {
      // Hentikan proses pengiriman foto jika ada
      if (processingMessages.has(chatId)) {
        await sendMessage(chatId, '❌ Proses dihentikan. Kirim ulang foto soalmu jika perlu.');
        processingMessages.delete(chatId); // Hapus status pengolahan
      } else {
        await sendMessage(chatId, 'Tidak ada proses yang sedang berjalan.');
      }
      return;
    }

    // Proses pesan gambar (jika ada)
    if (update.message.photo) {
      await processImage(chatId, messageId, update.message.photo);
    }
  }

  res.sendStatus(200); // Mengirimkan status 200 OK ke Telegram API
});

async function processImage(chatId, messageId, photo) {
  try {
    // Menambahkan status pesan ke dalam Map agar dapat diproses secara independen
    processingMessages.set(chatId, { messageId });

    // Dapatkan file_id gambar yang dikirim
    const fileId = photo[photo.length - 1].file_id;

    // Kirim pesan terlebih dahulu untuk memberitahu user bahwa proses sedang berjalan
    await sendMessage(chatId, '✨ Sedang memproses gambar kamu, tunggu sebentar ya...');

    // Mendapatkan URL file gambar
    const fileUrl = await getTelegramFileUrl(fileId);
    if (!fileUrl) {
      await sendMessage(chatId, 'Maaf, gambar tidak dapat diambil. Silakan kirim foto soal yang lain.');
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

    // Simulasi pengiriman gambar untuk diproses
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    // Tangani respon API
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
  } finally {
    // Menghapus status pesan setelah selesai
    processingMessages.delete(chatId);
  }
}

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

// Fungsi untuk menghapus pesan di Telegram
async function deleteMessage(chatId, messageId) {
  await fetch(`${telegramApiUrl}deleteMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
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
