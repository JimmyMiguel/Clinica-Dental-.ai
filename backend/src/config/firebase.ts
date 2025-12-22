import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;
let initializationError: Error | null = null;

function initializeFirebase(): admin.firestore.Firestore {
  // Si ya está inicializado, retornar la instancia
  
  if (db) {
    return db;
  }

  // Si hay un error previo, lanzarlo
  if (initializationError) {
    throw initializationError;
  }

  try {
    // Si Firebase Admin ya tiene una app, usar esa
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return db;
    }

    // Verificar que todas las variables de entorno necesarias estén presentes
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    console.log('Variables de entorno:', { projectId, clientEmail, privateKey: privateKey ? 'OK' : 'NO' });


    if (!projectId || !clientEmail || !privateKey) {
      const error = new Error(
        'Faltan variables de entorno de Firebase. Asegúrate de configurar: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
      initializationError = error;
      throw error;
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
    return db;
  } catch (error) {
    console.error("❌ Error CRÍTICO inicializando Firebase:", error);
    initializationError = error as Error;
    throw error;
  }
}

// Función getter que inicializa Firebase de forma lazy
export function getDb(): admin.firestore.Firestore {
  return initializeFirebase();
}