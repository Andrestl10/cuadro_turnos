import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getDatabase, type Database } from 'firebase/database';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

type FirebaseEnv = FirebaseConfig & { databaseURL: string };

function readFirebaseConfigFromEnv(): FirebaseEnv {
  const cfg: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  const databaseURL: string = import.meta.env.VITE_FIREBASE_DATABASE_URL;

  const missing = [
    ...Object.entries(cfg)
      .filter(([key, val]) => key !== 'measurementId' && (!val || String(val).trim().length === 0))
      .map(([key]) => key),
    ...(!databaseURL || String(databaseURL).trim().length === 0 ? ['databaseURL'] : [])
  ];

  if (missing.length > 0) {
    throw new Error(
      `Firebase env vars missing: ${missing.join(', ')}. ` +
        `Create a .env.local based on .env.example.`
    );
  }

  return { ...cfg, databaseURL };
}

const firebaseConfig = readFirebaseConfigFromEnv();

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseDb: Database = getDatabase(firebaseApp, firebaseConfig.databaseURL);

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  // Analytics may be unsupported in some environments (e.g. some browsers, privacy mode).
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(firebaseApp);
}

