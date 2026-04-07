import { initializeApp, getApps } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' &&
  !window.__ASSESSMENT_DB_EMULATOR_CONNECTED__
) {
  connectDatabaseEmulator(
    rtdb,
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1',
    Number(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT || 9000)
  );
  window.__ASSESSMENT_DB_EMULATOR_CONNECTED__ = true;
}

export { rtdb };
