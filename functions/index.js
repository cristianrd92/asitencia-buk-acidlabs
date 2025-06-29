const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}
const functions = require("firebase-functions");
const { esFeriadoHoy } = require("./getFeriado");
const { esVacaciones } = require("./getVacaciones");
const { marcarEnBuk } = require("./markBuk");
const { notifyTelegram } = require("./notifyTelegram");
const users = require("./user-config");
const db = admin.firestore();

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
      const vacacionesActivas = await esVacaciones()
      let esDiaLibreProgramadoHoy = false;

      // Si ambas son falsas, verificamos si hay un día libre programado, si no, simplemente omitimos busqueda en bd      
      if (!feriado && !vacacionesActivas) {
        const marcajeConfigDoc = await db.collection("config").doc("marcaje").get();
        if (marcajeConfigDoc.exists && marcajeConfigDoc.data().fechaDiaLibreProgramado) {
          const fechaDiaLibreTimestamp = marcajeConfigDoc.data().fechaDiaLibreProgramado;
          const fechaDiaLibre = fechaDiaLibreTimestamp.toDate();

          const today = new Date();

          fechaDiaLibre.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          if (fechaDiaLibre.getTime() === today.getTime()) {
            esDiaLibreProgramadoHoy = true;
            console.log(`🗓️ Hoy es un día libre programado: ${fechaDiaLibre.toISOString().split('T')[0]}`);
          } else if (fechaDiaLibre.getTime() < today.getTime()) {
            console.log(`🗓️ Día libre programado vencido (${fechaDiaLibre.toISOString().split('T')[0]}), limpiando.`);
            await db.collection("config").doc("marcaje").set({ fechaDiaLibreProgramado: admin.firestore.FieldValue.delete() }, { merge: true });
          }
        }
      }

      if (feriado || vacacionesActivas || esDiaLibreProgramadoHoy) {
        let motivo = "desconocido";
        if (feriado) {
          motivo = `feriado: *${feriado}*`;
        } else if (vacacionesActivas) {
          motivo = "vacaciones";
        } else if (esDiaLibreProgramadoHoy) {
          motivo = "día libre";
        }
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
exports.toggleFromTelegram = require("./toggleFromTelegram").toggleFromTelegram;