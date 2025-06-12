const functions = require("firebase-functions");
const { esFeriadoHoy } = require("./getFeriado");
const { marcarEnBuk } = require("./markBuk");
const { notifyTelegram } = require("./notifyTelegram");
const users = require("./user-config");

function programarMarcaje(hora, sentido) {
    return functions
        .runWith({ memory: "1GB", timeoutSeconds: 60 })
        .pubsub.schedule(hora)
        .timeZone("America/Santiago")
        .onRun(async () => {
            console.log(`🕒 Ejecutando marcaje programado para sentido: ${sentido} a las ${hora}`);

            const feriado = await esFeriadoHoy();
            const esVacaciones = false;
            if (feriado) {
                console.log(`🚫 Hoy es feriado: ${feriado}. No se ejecutará el marcaje.`);

                for (const user of users) {
                    const mensaje = `🚫 Hoy es feriado en Chile: *${feriado}* – no se ejecutó el marcaje de ${sentido}`;
                    await notifyTelegram(user, mensaje);
                }
                return;
            }
            
            if (esVacaciones) {
                console.log(`🚫 Hoy se encuentra de vacaciones. No se ejecutará el marcaje.`);

                for (const user of users) {
                    const mensaje = `🚫 Hoy se encuentra de vacaciones. No se ejecutará el marcaje de ${sentido}`;
                    await notifyTelegram(user, mensaje);
                }
                return;
            }

            for (const user of users) {
                try {
                    console.log(`🚀 Iniciando proceso de marcaje para: ${user.nombre}`);
                    await marcarEnBuk(user, sentido);
                    const mensaje = `✅ ${sentido} registrada correctamente para ${user.nombre}`;
                    await notifyTelegram(user, mensaje);
                    console.log(`📬 Notificación enviada a Telegram para ${user.nombre}`);
                } catch (error) {
                    const errorMsg = `❌ Error al registrar ${sentido} para ${user.nombre}: ${error.message}`;
                    console.error(errorMsg);
                    await notifyTelegram(user, errorMsg);
                }
            }

            console.log(`✅ Finalizó ejecución de marcaje ${sentido}`);
        });
}

exports.marcarEntrada = programarMarcaje("00 9 * * 1-5", "ENTRADA");
exports.marcarSalida = programarMarcaje("00 18 * * 1-5", "SALIDA");
exports.testTelegramNotification = require("./testTelegram").testTelegramNotification;
exports.marcarEntradaManual = require("./manualCheckin").marcarEntradaManual;
exports.marcarSalidaManual = require("./manualCheckin").marcarSalidaManual;