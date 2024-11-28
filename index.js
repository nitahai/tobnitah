const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '7580171291:AAFAD8UG0xhCVkfih4j072CEwvR_YCXlnhw'; // Ganti dengan token bot kamu
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

// Flag untuk memastikan hanya satu proses pengiriman dalam satu waktu
const processingChats = new Set();

app.use(express.json());

app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;

    // Jika pesan teks adalah "/start"
    if (update.message.text === '/start') {
      await sendMessage(chatId, 'Hallo pelajar, selamat datang di bot Nitah! Silahkan kirim foto soal pelajaran sekolah kamu');
    }

// Jika pesan teks adalah "/informasi"
if (update.message.text === '/informasi') {
  await sendMessage(chatId, 'Bot Nitah ini dirancang untuk membantu memproses gambar soal pelajaran kamu dan mencari jawaban dengan cepat. Cukup kirimkan gambar soalmu, dan Nitah akan memperoses untuk memberikan jawaban yang cepat dan tepat!');
}

  // Jika pesan teks adalah "/tentang"
if (update.message.text === '/tentang') {
  await sendMessage(chatId, 'Bot ini dibuat oleh zakia dengan tujuan untuk membantu pelajar dalam memahami dan mempelajari materi pelajaran. Nikmati kemudahan menggunakan bot ini untuk memecahkan soal pelajaran kamu dengan cepat dan tepat!\n\n' +
                            'Untuk informasi lebih lanjut, kunjungi situs kami: [https://nitah.web.id](https://nitah.web.id)\n' +
                            'Dukung kami melalui: [Saweria](https://saweria.co/zakiakaidzan)');
}

    // Jika ada pesan dengan gambar
    if (update.message.photo) {
      // Cek apakah chat sedang diproses
      if (processingChats.has(chatId)) {
        console.log(`Chat ID ${chatId} sedang diproses, abaikan pengiriman ulang.`);
        return res.sendStatus(200);
      }

      // Tandai chat sedang diproses
      processingChats.add(chatId);

      try {
        // Kirim pesan sekali
        await sendMessage(chatId, 'Sebentar, foto soal kamu sedang diproses mencari jawaban...');

        const fileId = update.message.photo[update.message.photo.length - 1].file_id;
        const fileUrl = await getTelegramFileUrl(fileId);

        const buffer = await fetch(fileUrl).then(res => res.buffer());
        const randomFilename = generateRandomFilename();

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

        const apiResult = await apiResponse.json();

        if (apiResult.ok) {
          await sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
        } else {
          await sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
        }
      } catch (error) {
        console.error('Error:', error);
        await sendMessage(chatId, 'Gagal memproses gambar.');
      } finally {
        // Hapus tanda chat dari processingChats
        processingChats.delete(chatId);
      }
    }
  }

  res.sendStatus(200);
});

// Fungsi untuk mendapatkan URL file gambar dari Telegram
async function getTelegramFileUrl(fileId) {
  const response = await fetch(`${telegramApiUrl}getFile?file_id=${fileId}`);
  const data = await response.json();
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

// Fungsi untuk mengirim pesan ke Telegram
async function sendMessage(chatId, text) {
  await fetch(`${telegramApiUrl}sendMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, text }),
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
