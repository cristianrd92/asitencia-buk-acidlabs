const functions = require("firebase-functions");
const { esFeriadoHoy } = require("./getFeriado");
const { marcarEnBuk } = require("./markBuk");
const { notifyTelegram } = require("./notifyTelegram");
const users = require("./user-config");

function programarMarcaje(hora, sentido) {
    const sentidoTexto = sentido == 1 ? 'ENTRADA' : 'SALIDA';
    return functions
        .runWith({ memory: "1GB", timeoutSeconds: 60 })
        .pubsub.schedule(hora)
        .timeZone("America/Santiago")
        .onRun(async () => {
            console.log(`🕒 Ejecutando marcaje programado para sentido: ${sentidoTexto} a las ${hora}`);

            const feriado = await esFeriadoHoy();
            const esVacaciones = false;
            if (feriado) {
                console.log(`🚫 Hoy es feriado: ${feriado}. No se ejecutará el marcaje.`);

                for (const user of users) {
                    const mensaje = `🚫 Hoy es feriado en Chile: *${feriado}* – no se ejecutó el marcaje de ${sentidoTexto}`;
                    await notifyTelegram(user, mensaje);
                }
                return;
            }
            
            if (esVacaciones) {
                console.log(`🚫 Hoy se encuentra de vacaciones. No se ejecutará el marcaje.`);

                for (const user of users) {
                    const mensaje = `🚫 Hoy se encuentra de vacaciones. No se ejecutará el marcaje de ${sentidoTexto}`;
                    await notifyTelegram(user, mensaje);
                }
                return;
            }

            for (const user of users) {
                try {
                    console.log(`🚀 Iniciando proceso de marcaje para: ${user.nombre}`);
                    await marcarEnBuk(user, sentido);
                    const mensaje = `✅ ${sentidoTexto} registrada correctamente para ${user.nombre}`;
                    await notifyTelegram(user, mensaje);
                    console.log(`📬 Notificación enviada a Telegram para ${user.nombre}`);
                } catch (error) {
                    const errorMsg = `❌ Error al registrar ${sentidoTexto} para ${user.nombre}: ${error.message}`;
                    console.error(errorMsg);
                    await notifyTelegram(user, errorMsg);
                }
            }

            console.log(`✅ Finalizó ejecución de marcaje ${sentidoTexto}`);
        });
}

exports.marcarEntrada = programarMarcaje("00 9 * * 1-5", 1);
exports.marcarSalida = programarMarcaje("00 18 * * 1-5", 2);
exports.testTelegramNotification = require("./testTelegram").testTelegramNotification;
exports.marcarEntradaManual = require("./manualCheckin").marcarEntradaManual;
exports.marcarSalidaManual = require("./manualCheckin").marcarSalidaManual;