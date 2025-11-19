// src/lib/firebase/server-init.ts
// Client SDK für Server-Side Rendering (SSR) und Client-Komponenten
// Für Backend-APIs und Webhooks siehe admin-init.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialisiere separate App-Instanz für Server-Side
let serverApp;
const existingApps = getApps();
const serverAppInstance = existingApps.find(app => app.name === 'server');

if (!serverAppInstance) {
  serverApp = initializeApp(firebaseConfig, 'server');
} else {
  serverApp = serverAppInstance;
}

// Exportiere Firestore Client Instance für Server
export const serverDb = getFirestore(serverApp);

// Helper um zu prüfen ob wir server-side sind
export const isServerSide = () => typeof window === 'undefined';