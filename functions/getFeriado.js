const axios = require("axios");

async function esFeriadoHoy() {
  try {
    const response = await axios.get("https://api.boostr.cl/holidays.json");
    const feriados = response.data.data || [];
    const hoy = new Date().toISOString().slice(0, 10);

    const feriado = feriados.find(f => f.date === hoy);
    return feriado ? feriado.title : null;
  } catch (error) {
    console.error("⚠️ No se pudo consultar la API de feriados:", error.message);
    return null;
  }
}

module.exports = { esFeriadoHoy };