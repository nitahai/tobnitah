const fetch = require('node-fetch');
const FormData = require('form-data');
const { Telegraf } = require('telegraf');
require('dotenv').config(); // Untuk memuat variabel dari .env

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
  return `file_${Math.random().toString(36).substr(2, 9)}.jpg`; // Membuat nama file acak dengan ekstensi .jpg
}

// Fungsi untuk mendapatkan URL file gambar dari Telegram
async function getTelegramFileUrl(fileId) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await response.json();
  if (data.ok) {
    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${data.result.file_path}`;
  }
  throw new Error('File tidak ditemukan');
}

// Fungsi untuk mengirim pesan ke chat Telegram
async function sendMessage(chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
  return response.json(); // Kembalikan respons jika diperlukan
}

// Menyambut pengguna dengan pesan /start
bot.start((ctx) => {
  ctx.reply('Hallo pelajar, silahkan upload foto soal pelajaran kamu');
});

// Menangani gambar yang dikirim oleh pengguna
bot.on('photo', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  try {
    // Mengirimkan pesan sebelum proses gambar dimulai
    await sendMessage(chatId, 'Foto soal pelajaran kamu sedang diproses, sedang mencari jawabannya.');

    // Mendapatkan URL file gambar dari Telegram
    const fileUrl = await getTelegramFileUrl(fileId);

    // Mengambil gambar dan mengirimkannya ke API
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
      // Mengirimkan teks dari API roast ke pengguna Telegram
      await sendMessage(chatId, apiResult.text || 'Gambar berhasil dikirim ke API!');
    } else {
      await sendMessage(chatId, 'Terjadi kesalahan saat mengirim gambar ke API roast.');
    }
  } catch (error) {
    console.error('Error:', error);
    await sendMessage(chatId, 'Gagal mengirim gambar ke API.');
  }
});

// Menjalankan bot
bot.launch();
