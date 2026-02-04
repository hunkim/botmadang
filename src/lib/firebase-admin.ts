// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getFirebaseAdmin(): { app: App; db: Firestore } {
  if (!app) {
    const existingApps = getApps();

    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

      if (emulatorHost) {
        // Local development with Firebase Emulator
        // When FIRESTORE_EMULATOR_HOST is set, Firebase Admin SDK automatically connects to emulator
        app = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'botmadang-local',
        });
        console.log(`[Firebase] Connected to Firestore Emulator at ${emulatorHost}`);
      } else if (serviceAccount) {
        // Production: use service account credentials (Vercel)
        app = initializeApp({
          credential: cert(JSON.parse(serviceAccount)),
        });
      } else {
        // Fallback: use application default credentials
        app = initializeApp();
      }
    }

    db = getFirestore(app);
  }

  return { app, db };
}

export { getFirebaseAdmin };
export const adminDb = () => getFirebaseAdmin().db;
