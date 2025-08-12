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
    key + ': ' + (runtimeConfig[key as keyof typeof runtimeConfig] ? '***SET***' : 'MISSING')
  ).join(', '));
  
  return runtimeConfig;
};

try {
  const firebaseConfig = getFirebaseConfig();
  
  console.log('=== FIREBASE INIT DEBUG ===');
  console.log('Config loaded, attempting to initialize...');
  
  // Initialize Firebase
  if (!getApps().length) {
    console.log('Initializing new Firebase app');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('Using existing Firebase app');
    app = getApp();
  }
  
  // Initialize services
  console.log('Initializing Firebase services...');
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('Firebase services initialized successfully');
  console.log('DB instance type:', typeof db);
  console.log('DB instance valid:', !!db);
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Always throw error in production and Vercel runtime
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error('Production/Vercel environment - cannot continue without Firebase');
    throw error;
  }
  
  // Development fallback only for local development
  console.warn('Using fallback config for local development only');
  try {
    if (!getApps().length) {
      app = initializeApp(defaultConfig);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    
    console.log('Fallback Firebase services initialized');
  } catch (fallbackError) {
    console.error('Even fallback initialization failed:', fallbackError);
    throw fallbackError;
  }
}

export { app, auth, db, storage, functions };