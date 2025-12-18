// src/config/firebase.ts
import * as admin from 'firebase-admin';
import * as path from 'path';

// 1. Buscamos el archivo de credenciales en la raíz del backend
const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');

// 2. Inicializamos Firebase solo si no ha sido inicializado antes (Patrón Singleton)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log("✅ Firebase Admin inicializado correctamente.");
  } catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
  }
}

// 3. Exportamos la instancia de Firestore (la base de datos)
export const db = admin.firestore();