const functions = require("firebase-functions");
const { esFeriadoHoy } = require("./getFeriado");
const { marcarEnBuk } = require("./markBuk");
const { notifyTelegram } = require("./notifyTelegram");
const users = require("./user-config");

function programarMarcajeConDelay(sentido) {
  const sentidoTexto = sentido === 1 ? 'ENTRADA' : 'SALIDA';

  return functions
    .runWith({ memory: "1GB", timeoutSeconds: 540 }) // Máximo permitido
    .pubsub.schedule(sentido === 1 ? "54 8 * * 1-5" : "0 18 * * 1-5")
    .timeZone("America/Santiago")
    .onRun(async () => {
      const delaySegundos = Math.floor(Math.random() * 301); // 0 a 300 seg (5 min)
      console.log(`🕒 Ejecutando función de ${sentidoTexto}. Esperando ${delaySegundos} segundos...`);

      await new Promise(resolve => setTimeout(resolve, delaySegundos * 1000));

      const feriado = await esFeriadoHoy();
      const esVacaciones = false;

      if (feriado || esVacaciones) {
        const motivo = feriado ? `feriado: *${feriado}*` : "vacaciones";
        for (const user of users) {
          await notifyTelegram(user, `🚫 Hoy es ${motivo}. No se ejecutó el marcaje de ${sentidoTexto}`);
        }
        return;
      }

      for (const user of users) {
        try {
          await marcarEnBuk(user, sentido);
          await notifyTelegram(user, `✅ ${sentidoTexto} registrada correctamente para ${user.nombre}`);
        } catch (error) {
          await notifyTelegram(user, `❌ Error al registrar ${sentidoTexto} para ${user.nombre}: ${error.message}`);
        }
      }

      console.log(`✅ Finalizó marcaje ${sentidoTexto}`);
    });
}

exports.marcarEntrada = programarMarcajeConDelay(1); // 08:54 con delay aleatorio
exports.marcarSalida = programarMarcajeConDelay(2);  // 17:59 con delay aleatorio
exports.testTelegramNotification = require("./testTelegram").testTelegramNotification;
exports.marcarEntradaManual = require("./manualCheckin").marcarEntradaManual;
exports.marcarSalidaManual = require("./manualCheckin").marcarSalidaManual;