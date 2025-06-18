const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const users = require("./user-config");
const user = users[0];

const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = user.telegramBotToken;

exports.toggleFromTelegram = functions.https.onRequest(async (req, res) => {
  try {
    const messageText = req.body?.message?.text;
    const chatId = req.body?.message?.chat?.id;

    console.log("🔁 Recibido desde Telegram:", messageText, "desde chat", chatId);

    if (!messageText || !chatId) {
      return res.status(400).send("Mensaje inválido.");
    }

    const lowerCaseMessage = messageText.trim().toLowerCase();
    const docRef = db.collection("config").doc("marcaje");

    // Verifica si el mensaje es del comando /vacaciones
    if (lowerCaseMessage === "/vacaciones") {
      const snapshot = await docRef.get();

      const estadoActual = snapshot.exists ? !!snapshot.data().esVacaciones : false;
      const nuevoEstado = !estadoActual;

      await docRef.set({ esVacaciones: nuevoEstado }, { merge: true });

      const respuesta = nuevoEstado
        ? "🟡 *Vacaciones activadas*. No se realizarán marcajes."
        : "🟢 *Vacaciones desactivadas*. Se reanuda el marcaje automático.";

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: respuesta,
        parse_mode: "Markdown"
      });

      return res.status(200).send("OK");
    }

    if (lowerCaseMessage === "/estado_vacaciones") {
      const snapshot = await docRef.get();
      const esVacacionesActual = snapshot.exists ? !!snapshot.data().esVacaciones : false;

      const estadoTexto = esVacacionesActual
        ? "🟡 *ACTIVAS*. No se está realizando el marcaje automático."
        : "🟢 *INACTIVAS*. El marcaje automático está operativo.";

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `El estado actual de las vacaciones es: ${estadoTexto}`,
        parse_mode: "Markdown"
      });

      return res.status(200).send("OK");
    }

    // --- Lógica para /dia_libre DD-MM-YYYY ---
    const regexDiaLibre = /^\/dia_libre\s+(\d{2}-\d{2}-\d{4})$/;
    const matchDiaLibre = lowerCaseMessage.match(regexDiaLibre);

    if (matchDiaLibre) {
      const fechaStr = matchDiaLibre[1]; // DD-MM-YYYY
      const [day, month, year] = fechaStr.split('-').map(Number);

      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2200) { 
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Formato de fecha inválido. Usa DD-MM-YYYY (ej. 25-06-2025).",
          parse_mode: "Markdown"
        });
        return res.status(200).send("Formato inválido.");
      }

      const fechaLibre = new Date(year, month - 1, day, 12);

      if (fechaLibre.getFullYear() !== year ||
        fechaLibre.getMonth() !== (month - 1) ||
        fechaLibre.getDate() !== day) {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: `❌ La fecha '${fechaStr}' no es una fecha válida (ej. 30 de Febrero).`,
          parse_mode: "Markdown"
        });
        return res.status(200).send("Fecha no válida.");
      }


      await docRef.set({
        fechaDiaLibreProgramado: admin.firestore.Timestamp.fromDate(fechaLibre)
      }, { merge: true });

      const respuesta = `🎉 *Día libre programado* para el *${fechaStr}*. Los marcajes automáticos se pausarán ese día.`;

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: respuesta,
        parse_mode: "Markdown"
      });

      return res.status(200).send("OK");
    }

    // --- Lógica para /cancelar_dia_libre ---
    if (lowerCaseMessage === "/cancelar_dia_libre") {
      await docRef.set({
        fechaDiaLibreProgramado: admin.firestore.FieldValue.delete()
      }, { merge: true });

      const respuesta = "✅ *Día libre programado cancelado*. Los marcajes automáticos no se pausarán por un día libre específico.";

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: respuesta,
        parse_mode: "Markdown"
      });

      return res.status(200).send("OK");
    }

    // --- Lógica para /estado_dia_libre (¡Actualización del formato de salida!) ---
    if (lowerCaseMessage === "/estado_dia_libre") {
      const snapshot = await docRef.get();
      const data = snapshot.exists ? snapshot.data() : {};
      const fechaLibreTimestamp = data.fechaDiaLibreProgramado;

      let estadoTexto = "⚪️ No hay *día libre* programado.";

      if (fechaLibreTimestamp) {
        const fechaLibre = fechaLibreTimestamp.toDate();
        // Formatear la fecha a DD-MM-YYYY para la respuesta
        const fechaFormato = `${fechaLibre.getDate().toString().padStart(2, '0')}-${(fechaLibre.getMonth() + 1).toString().padStart(2, '0')}-${fechaLibre.getFullYear()}`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (fechaLibre.getTime() === today.getTime()) {
          estadoTexto = `🔵 Hay un *día libre programado para HOY*, ${fechaFormato}.`;
        } else if (fechaLibre > today) {
          estadoTexto = `🗓️ Hay un *día libre programado para el futuro*: *${fechaFormato}*.`;
        } else {
          estadoTexto = `🔴 Hay un *día libre programado vencido*: *${fechaFormato}*. Se limpiará automáticamente.`;
        }
      }

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `El estado del día libre programado es: ${estadoTexto}`,
        parse_mode: "Markdown"
      });

      return res.status(200).send("OK");
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `Comando enviado no reconocido.`,
        parse_mode: "Markdown"
      });
    return res.status(200).send("Comando no reconocido.");
  } catch (error) {
    console.error("❌ Error en toggleFromTelegram:", error);
    res.status(500).send("Error en el servidor");
  }
});