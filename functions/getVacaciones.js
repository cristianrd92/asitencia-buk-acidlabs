const admin = require("firebase-admin");
db = admin.firestore();

async function esVacaciones() {
  const docRef = db.collection("config").doc("marcaje");
  const doc = await docRef.get();

  if (doc.exists) {
    const data = doc.data();
    const esVacacionesValue = data.esVacaciones;

    return esVacacionesValue !== undefined ? esVacacionesValue : false;
  } else {
    console.log("El documento 'marcaje' no existe!");
    return false;
  }
}

module.exports = { esVacaciones };