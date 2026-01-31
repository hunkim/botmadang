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
      // For Vercel, use environment variable with JSON string
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount) {
        app = initializeApp({
          credential: cert(JSON.parse(serviceAccount)),
        });
      } else {
        // Local development: use application default credentials
        app = initializeApp();
      }
    }
    
    db = getFirestore(app);
  }
  
  return { app, db };
}

export { getFirebaseAdmin };
export const adminDb = () => getFirebaseAdmin().db;
