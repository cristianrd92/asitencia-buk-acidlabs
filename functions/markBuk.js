const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

async function marcarEnBuk(user, sentido) {
  console.log(`🔐 Iniciando proceso de marcaje para ${user.nombre} - Sentido: ${sentido}`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath || "/usr/bin/chromium-browser",
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Navegando al login de Buk...");
    await page.goto(user.urlLogin, { waitUntil: "networkidle2" });

    console.log("✍️ Eliminando atributo readonly del email...");
    await page.evaluate(() => {
      const emailInput = document.getElementById("user_email");
      if (emailInput) emailInput.removeAttribute("readonly");
    });

    console.log("📧 Escribiendo el email...");
    await page.type("#user_email", user.email, { delay: 50 });

    console.log("➡️ Haciendo clic en 'Next'...");
    await Promise.all([
      page.click("input[name='commit'][value='Next']"),
      page.waitForSelector("#user_password", { visible: true, timeout: 5000 })
    ]);

    console.log("🔐 Escribiendo contraseña...");
    await page.type("#user_password", user.password, { delay: 50 });

    console.log("🔓 Iniciando sesión...");
    await Promise.all([
      page.click("input[name='commit'][value='Sign In']"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    console.log("📄 Navegando al portal del colaborador...");
    await page.goto(user.urlPortal, { waitUntil: "networkidle2" });

    console.log(`🖱️ Buscando botón con texto "${sentido}"...`);
    const encontrado = await page.evaluate(({ sentido, lat, lng }) => {
      const botones = Array.from(document.querySelectorAll("button.btn-asistencia"));
      const target = botones.find(boton => {
        const span = boton.querySelector("span.btn-label");
        return span && span.innerText.trim().toUpperCase() === sentido;
      });

      if (target) {
        console.log(`✅ Botón de ${sentido} encontrado`);

        const url = `/employee_portal/web_marking/marcaje?sentido=${sentido}&latitude=${lat}&longitude=${lng}`;
        target.setAttribute("ic-post-to", url);
        target.setAttribute("ic-src", url);

        console.log("📌 Latitud y longitud aplicadas al botón");
        target.click();
        return true;
      }

      return false;
    }, { sentido, lat: user.latitud, lng: user.longitud });

    if (!encontrado) {
      throw new Error(`No se encontró el botón de ${sentido} para hacer click`);
    }

    console.log("⏳ Esperando confirmación...");
    await page.waitForTimeout(3000);

    console.log(`✅ Proceso de marcaje completado para ${user.nombre} - ${sentido}`);
  } catch (error) {
    const mensajeError = `❌ Error durante el marcaje para ${user.nombre} - ${sentido}:
${error.message || error}`;
    console.error(mensajeError);

    try {
      const { notifyTelegram } = require("./notifyTelegram");
      await notifyTelegram(user, mensajeError);
    } catch (notifyError) {
      console.error("❌ También falló el intento de notificar por Telegram:", notifyError.message);
    }

    throw error;
  } finally {
    console.log("🧹 Cerrando navegador...");
    await browser.close();
  }
}

module.exports = { marcarEnBuk };