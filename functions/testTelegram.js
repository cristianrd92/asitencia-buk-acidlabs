const { notifyTelegram } = require("./notifyTelegram");
const functions = require("firebase-functions");
const users = require("./user-config");

exports.testTelegramNotification = functions.https.onRequest(async (req, res) => {
    const user = {
        nombre: users[0].nombre,
        telegramBotToken: users[0].telegramBotToken,
        telegramChatId: users[0].telegramChatId
    };

    try {
        console.log("🚀 Enviando mensaje a Telegram para:", user);

        await notifyTelegram(user, `✅ Hola ${user.nombre}, tu bot BukCheckin está funcionando 👋`);

        console.log("✅ Mensaje enviado correctamente");
        res.status(200).send("Mensaje enviado correctamente");
    } catch (error) {
        console.error("❌ Error al enviar mensaje de prueba:");
        console.error(error.response?.data || error.message || error);

        res.status(500).send("Error al enviar mensaje de prueba: " + (error.response?.data?.description || error.message));
    }
});
