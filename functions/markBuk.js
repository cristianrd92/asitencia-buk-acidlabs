const axios = require("axios");

async function marcarEnBuk(user, sentido) {
  const sentidoTexto = sentido == 1 ? "ENTRADA" : "SALIDA";
  const baseUrl = "https://app.ctrlit.cl/ctrl/dial";

  const urlRegistro = `${baseUrl}/registrarweb/n7w65IeJt5?sentido=${sentido}&latitud=${user.latitud}&longitud=${user.longitud}&rut=${user.rut}`;
  const urlInfo = `${baseUrl}/infotrab/n7w65IeJt5?sentido=${sentido}&rut=${user.rut}`;

  console.log(`🔐 Iniciando marcaje de ${sentidoTexto} para ${user.nombre} (${user.rut})`);

  try {
    const resRegistro = await axios.get(urlRegistro);
    console.log("✅ Marcaje registrado:", resRegistro.data);

    const resInfo = await axios.get(urlInfo);
    console.log("📄 Info post-marcaje:", resInfo.data);

    console.log(`🎉 Marcaje de ${sentidoTexto} exitoso para ${user.nombre}`);
  } catch (error) {
    const mensajeError = `❌ Error al marcar ${sentidoTexto} para ${user.nombre} - ${error.message}`;
    console.error(mensajeError);

    try {
      const { notifyTelegram } = require("./notifyTelegram");
      await notifyTelegram(user, mensajeError);
    } catch (notifyError) {
      console.error("❌ También falló notificar por Telegram:", notifyError.message);
    }

    throw error;
  }
}

module.exports = { marcarEnBuk };