const axios = require("axios");

async function notifyTelegram(user, mensaje) {
  const url = `https://api.telegram.org/bot${user.telegramBotToken}/sendMessage`;

  console.log(`📤 POST a ${url} con mensaje:`, mensaje);

  await axios.post(url, {
    chat_id: user.telegramChatId,
    text: mensaje,
  });
}

module.exports = { notifyTelegram };
