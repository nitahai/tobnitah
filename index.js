const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Flag untuk memastikan hanya satu proses pengiriman dalam satu waktu
app.use(express.json());

app.post(`/webhook/${token}`, (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;

    // Jika pesan teks adalah "/start"
    if (update.message.text === '/start') {
      sendMessage(chatId, '👋 Hallo pelajar, Selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

    // Jika ada pesan dengan gambar
    if (update.message.photo) {
      // Dapatkan file_id gambar yang dikirim
      const fileId = update.message.photo[update.message.photo.length - 1].file_id;

      // Mendapatkan URL file gambar dan mengirim pesan
      getTelegramFileUrl(fileId)
        .then(fileUrl => {
          if (!fileUrl) {
            sendMessage(chatId, 'Maaf, gambar tidak dapat diambil. Silakan kirim foto soal yang lain agar tidak terjadi pending.');
            return; // Jika URL tidak ditemukan, hentikan proses
          }

          // Mendapatkan informasi ukuran file gambar
          return getFileInfo(fileUrl)
            .then(fileInfo => {
              const fileSize = fileInfo.file_size;
              const minSize = 10 * 1024;  // 10 KB dalam byte
              const maxSize = 6 * 1024 * 1024;  // 6 MB dalam byte

              if (fileSize < minSize || fileSize > maxSize) {
                sendMessage(chatId, 'Ukuran foto kamu terlalu kecil atau terlalu besar. Maksimal foto yang bisa dikirim adalah 10KB hingga 6MB.');
                return; // Jangan proses lebih lanjut jika ukuran tidak sesuai
              }

              // Ambil gambar dari Telegram
              return fetch(fileUrl)
                .then(res => res.buffer())
                .then(buffer => {
                  const randomFilename = generateRandomFilename();

                  // Persiapkan form-data untuk kirim gambar
                  const form = new FormData();
                  form.append('file', buffer, {
                    filename: randomFilename,
                    contentType: 'image/jpeg',
                  });

                  const apiUrl = 'https://nitahai.vercel.app/asisten';
                  return fetch(apiUrl, {
                    method: 'POST',
                    body: form,
                    headers: form.getHeaders(),
                  });
                })
                .then(apiResponse => {
                  if (apiResponse.status === 504) {
                    sendMessage(chatId, 'Terjadi kesalahan pada server, tidak dapat menghubungi asisten untuk memproses gambar. Silahkan kirim foto soal yang lain.');
                    sendPhoto(chatId, 'https://img-9gag-fun.9cache.com/photo/ayNeMQb_460swp.webp'); // Ganti dengan URL gambar default jika diperlukan
                  } else {
                    return apiResponse.json();
                  }
                })
                .then(apiResult => {
                  if (apiResult.ok) {
                    sendMessage(chatId, '✨ Nitah udah beri jawabannya nih.');
                    sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
                  } else {
                    sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
                  }
                })
                .catch(error => {
                  console.error('Error:', error);
                  sendMessage(chatId, 'Gagal memproses gambar.');
                });
            });
        })
        .catch(error => {
          console.error('Error fetching file URL:', error);
          sendMessage(chatId, 'Gagal memproses gambar.');
        });
    }
  }

  res.sendStatus(200);
});

// Fungsi untuk mendapatkan URL file gambar dari Telegram
function getTelegramFileUrl(fileId) {
  return fetch(`${telegramApiUrl}getFile?file_id=${fileId}`)
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
      } else {
        throw new Error('Error fetching file URL');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      return null;
    });
}

// Fungsi untuk mendapatkan informasi file (termasuk ukuran) dari Telegram
function getFileInfo(fileUrl) {
  return fetch(fileUrl)
    .then(response => response.buffer())
    .then(data => ({ file_size: data.length })) // Kembalikan ukuran file dalam byte
    .catch(error => {
      console.error('Error getting file info:', error);
      return { file_size: 0 };
    });
}

// Fungsi untuk mengirim pesan ke Telegram
function sendMessage(chatId, text) {
  fetch(`${telegramApiUrl}sendMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, text }),
    headers: { 'Content-Type': 'application/json' },
  }).catch(error => console.error('Error sending message:', error));
}

// Fungsi untuk mengirim foto ke Telegram
function sendPhoto(chatId, photoUrl) {
  fetch(`${telegramApiUrl}sendPhoto`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl }),
    headers: { 'Content-Type': 'application/json' },
  }).catch(error => console.error('Error sending photo:', error));
}

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '.jpeg';
}

// Fungsi untuk mengatur webhook Telegram
function setWebhook() {
  const url = `https://nitahbot.vercel.app/webhook/${token}`; // Ganti dengan domain Vercel kamu
  fetch(`${telegramApiUrl}setWebhook?url=${url}`)
    .then(response => response.json())
    .then(result => {
      if (result.ok) {
        console.log(`Webhook set to: ${url}`);
      } else {
        console.log('Webhook setup failed:', result.description);
      }
    })
    .catch(error => {
      console.error('Failed to set webhook:', error);
    });
}

setWebhook();

module.exports = app; // Ekspor app untuk Vercel
