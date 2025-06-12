# Buk Auto Check-in 🔒🕒

Este proyecto automatiza el proceso de marcaje de **entrada** y **salida** en el portal de colaboradores de Buk, utilizando **Firebase Functions** y **Puppeteer**.

---

## 🚀 Funcionalidades

- ✅ Marca automática programada de lunes a viernes
- ✅ Funciones HTTP manuales (`/marcarEntradaManual`, `/marcarSalidaManual`)
- ✅ Detección y cancelación de marcaje en feriados chilenos (via API)
- ✅ Simulación de login paso a paso (email → Next → password → Sign In)
- ✅ Click automatizado en los botones `Entrada` o `Salida`
- ✅ Inyección de latitud/longitud en los botones si no están presentes
- ✅ Notificación por Telegram ante éxito o fallo

---

## 📁 Estructura del proyecto

```
functions/
│
├── index.js                 // Entrypoint con funciones programadas
├── getFeriado.js            // Lógica para detectar feriados desde API
├── markBuk.js               // Lógica de navegación y marcaje en Buk
├── manualCheckin.js         // Funciones HTTP por demanda
├── notifyTelegram.js        // Notificador por Telegram
├── testTelegram.js          // Función de prueba de conexión Telegram
├── user-config.js           // Config de usuarios, URLs y geolocalización
└── package.json             // Dependencias y entorno
```

---

## 🛠️ Instalación

1. Instalar dependencias:

```bash
cd functions
npm install --legacy-peer-deps
```

2. Configurar variables de entorno:

```bash
firebase functions:config:set \
  buk.email="TU_EMAIL" \
  buk.pass="TU_PASSWORD" \
  telegram.token="TELEGRAM_BOT_TOKEN" \
  telegram.chat="TELEGRAM_CHAT_ID"
```

3. Desplegar funciones:

```bash
firebase deploy --only functions
```

---

## 👤 `user-config.js`

Ejemplo:

```js
module.exports = [
  {
    nombre: "Manuel Gonzalez",
    email: "m3gonzalez.cl@gmail.com",
    password: process.env.BUK_PASSWORD,
    telegramBotToken: process.env.TELEGRAM_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT,
    latitud: -33.4528512,
    longitud: -70.6281472,
    urlLogin: "https://23people.buk.cl/users/sign_in",
    urlPortal: "https://23people.buk.cl/static_pages/portal"
  }
];
```

> ✅ Permite múltiples usuarios por empresa

---

## 📆 Evitar marcaje en feriados

- Se consulta la API: `https://api.boostr.cl/holidays.json`
- Si hoy es feriado en Chile, **se cancela el marcaje automáticamente**
- Se notifica por Telegram con el nombre del feriado

---

## 🧪 Funciones manuales

Podés llamarlas desde navegador, Postman o botón:

```
https://us-central1-TU_PROYECTO.cloudfunctions.net/marcarEntradaManual
https://us-central1-TU_PROYECTO.cloudfunctions.net/marcarSalidaManual
```

---

## 🧠 Requisitos especiales

- Plan Firebase Blaze (necesario para cron)
- `runWith({ memory: "1GB", timeoutSeconds: 60 })`
- `puppeteer-core@10.4.0` + `chrome-aws-lambda@10.1.0`

---

## 📬 Créditos

Automatizador serial + Telegram + Puppeteer + Firebase = ❤️