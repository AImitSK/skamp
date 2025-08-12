// src/lib/firebase/build-safe-init.ts
/**
 * Build-Safe Firebase Initialization
 * Verhindert Firebase-Fehler während des Build-Prozesses
 */

import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from 'firebase/functions';

// Default-Konfiguration für Build-Zeit
const defaultConfig = {
  apiKey: "build-placeholder",
  authDomain: "build-placeholder",
  projectId: "build-placeholder",
  storageBucket: "build-placeholder",
  messagingSenderId: "build-placeholder",
  appId: "build-placeholder"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

// Dynamische Konfiguration basierend auf Umgebung
const getFirebaseConfig = () => {
  // Prüfe ob wir zur Build-Zeit sind
  const isBuildTime = typeof window === 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (isBuildTime) {
    console.log('Build-time detected, using placeholder config');
    return defaultConfig;
  }
  
  // Runtime Konfiguration
  const runtimeConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
  };
  
  console.log('=== FIREBASE BUILD-SAFE-INIT DEBUG ===');
  console.log('Runtime config loaded:', Object.keys(runtimeConfig).map(key => 
    key + ': ' + (runtimeConfig[key] ? '***SET***' : 'MISSING')
  ).join(', '));
  
  return runtimeConfig;
};

try {
  const firebaseConfig = getFirebaseConfig();
  
  // Initialize Firebase
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Re-throw error in production to catch configuration issues
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  
  // Development fallback
  console.warn('Using fallback config for development');
  if (!getApps().length) {
    app = initializeApp(defaultConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
}

export { app, auth, db, storage, functions };