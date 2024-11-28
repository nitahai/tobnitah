const fetch = require('node-fetch');
const crypto = require('crypto');

// Fungsi untuk mendapatkan URL file gambar dari Telegram
async function getTelegramFileUrl(fileId) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await response.json();
  if (data.ok) {
    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${data.result.file_path}`;
  }
  throw new Error('File tidak ditemukan');
}

// Fungsi untuk menghasilkan nama file acak (misalnya, menggunakan UUID atau hash)
function generateRandomFilename() {
  return crypto.randomBytes(16).toString('hex') + '.jpg'; // Menghasilkan nama file acak dengan ekstensi .jpg
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

module.exports = { getTelegramFileUrl, generateRandomFilename, sendMessage };
