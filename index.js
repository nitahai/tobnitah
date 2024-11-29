const fetch = require('node-fetch');
const FormData = require('form-data');
const { Telegraf } = require('telegraf'); // Menggunakan Telegraf untuk Bot Telegram

const token = '8073266001:AAGq_Vmmpa0UWwoSLDKOkiRvxGK4dwd4uaA'; // Ganti dengan token bot Anda
const bot = new Telegraf(token);

let processingUser = null; // Menyimpan ID pengguna yang sedang diproses

// Fungsi untuk mengirim pesan ke chat
async function sendMessage(chatId, text) {
  try {
    await bot.telegram.sendMessage(chatId, text);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Handler untuk /start
bot.start(async (ctx) => {
  await sendMessage(ctx.chat.id, 'Selamat datang! Kirimkan foto soal pelajaranmu, dan kami akan memprosesnya.');
});

// Handler untuk menerima gambar
bot.on('photo', async (ctx) => {
  const chatId = ctx.chat.id;
  
  // Mengecek apakah ada proses yang sedang berlangsung
  if (processingUser !== null && processingUser !== chatId) {
    return await sendMessage(chatId, 'Mohon tunggu, kami sedang memproses gambar dari pengguna lain.');
  }

  // Tandai bahwa pengguna sedang memproses gambar
  processingUser = chatId;

  // Ambil gambar dan ukurannya
  const file = ctx.message.photo[ctx.message.photo.length - 1]; // Ambil gambar terbesar
  const fileId = file.file_id;
  
  // Mengambil informasi file
  const fileInfo = await bot.telegram.getFile(fileId);
  const filePath = fileInfo.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  
  // Ambil ukuran gambar
  const imageBuffer = await fetch(fileUrl).then(res => res.buffer());
  const imageSize = imageBuffer.length;

  // Cek ukuran gambar
  if (imageSize < 10240 || imageSize > 6 * 1024 * 1024) {
    processingUser = null; // Reset setelah memeriksa ukuran
    return await sendMessage(chatId, 'Ukuran gambar harus antara 10KB dan 6MB.');
  }

  // Proses gambar
  await sendMessage(chatId, 'Foto soal pelajaran kamu sedang kami proses...');

  // Persiapkan form-data untuk kirim gambar
  const form = new FormData();
  const randomFilename = `image_${Date.now()}.jpg`;
  form.append('file', imageBuffer, {
    filename: randomFilename,
    contentType: 'image/jpeg',
  });

  const apiUrl = 'https://nitahai.vercel.app/asisten'; // Ganti dengan API yang sesuai

  // Kirim gambar ke API untuk diproses
  try {
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    const apiResult = await apiResponse.json();

    // Kirim pesan ke pengguna jika gambar diproses dengan sukses
    if (apiResult.ok) {
      await sendMessage(chatId, '✨ Nitah udah beri jawabannya nih.');
      await sendMessage(chatId, apiResult.text || 'Gambar berhasil diproses!');
    } else {
      await sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
    }
  } catch (error) {
    console.error('Error processing image:', error);
    await sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
  } finally {
    // Reset proses setelah selesai
    processingUser = null;
  }
});

// Export bot sebagai app untuk Vercel
module.exports = (req, res) => {
  bot.handleUpdate(req.body, res); // Mengirimkan update dari Telegram API ke bot
};
