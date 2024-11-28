const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

const token = '7580171291:AAFAD8UG0xhCVkfih4j072CEwvR_YCXlnhw';
const telegramApiUrl = `https://api.telegram.org/bot${token}/`;

app.use(express.json());

// Simpan status pengolahan untuk setiap chatId
const processingChats = new Set();

app.post(`/webhook/${token}`, async (req, res) => {
  const update = req.body;

  if (update.message && update.message.text === '/start') {
    const chatId = update.message.chat.id;
    await sendMessage(chatId, 'Hallo pelajar, silahkan kirim foto pelajaran kamu!');
  }

  if (update.message && update.message.photo) {
    const chatId = update.message.chat.id;

    // Jika sudah diproses, abaikan permintaan baru
    if (processingChats.has(chatId)) {
      return res.sendStatus(200);
    }

    // Tandai chat sebagai sedang diproses
    processingChats.add(chatId);

    const fileId = update.message.photo[update.message.photo.length - 1].file_id;

    try {
      await sendMessage(chatId, 'Sebentar, foto soal kamu sedang diproses mencari jawaban...');
      const fileUrl = await getTelegramFileUrl(fileId);
      const buffer = await fetch(fileUrl).then(res => res.buffer());
      const randomFilename = generateRandomFilename();

      const apiUrl = 'https://nitahai.vercel.app/asisten';
      const form = new FormData();
      form.append('file', buffer, {
        filename: randomFilename,
        contentType: 'image/jpeg'
      });

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const apiResult = await apiResponse.json();

      if (apiResult.ok) {
        await sendMessage(chatId, apiResult.text || 'Gambar berhasil dikirim ke API!');
      } else {
        await sendMessage(chatId, 'Terjadi kesalahan saat mengirim gambar ke API roast.');
      }
    } catch (error) {
      console.error('Error:', error);
      await sendMessage(chatId, 'Gagal mengirim gambar ke API.');
    } finally {
      // Hapus status pemrosesan untuk chat ini
      processingChats.delete(chatId);
    }
  }

  res.sendStatus(200);
});

async function getTelegramFileUrl(fileId) {
  const response = await fetch(`${telegramApiUrl}getFile?file_id=${fileId}`);
  const data = await response.json();
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

async function sendMessage(chatId, text) {
  await fetch(`${telegramApiUrl}sendMessage`, {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function generateRandomFilename() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '.jpeg';
}

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

setWebhook();

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
