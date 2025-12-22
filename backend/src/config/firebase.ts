import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // El replace es vital para que Vercel lea bien los saltos de línea
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("✅ Firebase Admin inicializado correctamente con variables de entorno.");
  } catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
  }
}

export const db = admin.firestore();