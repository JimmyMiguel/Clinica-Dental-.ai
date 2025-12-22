import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    // Verificar que todas las variables de entorno necesarias estén presentes
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Faltan variables de entorno de Firebase. Asegúrate de configurar: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // El replace es vital para que Vercel lea bien los saltos de línea
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log("✅ Firebase Admin inicializado correctamente con variables de entorno.");
    db = admin.firestore();
  } catch (error) {
    console.error("❌ Error CRÍTICO inicializando Firebase:", error);
    // En producción, esto causará un error claro en lugar de fallar silenciosamente
    throw error;
  }
} else {
  db = admin.firestore();
}

export { db };