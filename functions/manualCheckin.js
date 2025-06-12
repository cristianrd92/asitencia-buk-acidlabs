const functions = require("firebase-functions");
const { marcarEnBuk } = require("./markBuk");
const { notifyTelegram } = require("./notifyTelegram");
const users = require("./user-config");

exports.marcarEntradaManual = functions
    .runWith({ memory: "1GB", timeoutSeconds: 60 })
    .https.onRequest(async (req, res) => {
        const user = users[0];

        try {
            await marcarEnBuk(user, 1);
            const msg = `✅ Entrada registrada manualmente para ${user.nombre}`;
            await notifyTelegram(user, msg);
            res.status(200).send(msg);
        } catch (error) {
            const errMsg = `❌ Error al registrar entrada manual: ${error.message}`;
            await notifyTelegram(user, errMsg);
            res.status(500).send(errMsg);
        }
    });

exports.marcarSalidaManual = functions
    .runWith({ memory: "1GB", timeoutSeconds: 60 })
    .https.onRequest(async (req, res) => {
        const user = users[0];

        try {
            await marcarEnBuk(user, 2);
            const msg = `✅ Salida registrada manualmente para ${user.nombre}`;
            await notifyTelegram(user, msg);
            res.status(200).send(msg);
        } catch (error) {
            const errMsg = `❌ Error al registrar salida manual: ${error.message}`;
            await notifyTelegram(user, errMsg);
            res.status(500).send(errMsg);
        }
    });