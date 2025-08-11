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

try {
  // Versuche echte Konfiguration zu laden
  const { firebaseConfig } = require('./config');
  
  console.log('=== FIREBASE BUILD-SAFE-INIT DEBUG ===');
  console.log('Config loaded:', Object.keys(firebaseConfig).map(key => 
    key + ': ' + (firebaseConfig[key] ? '***SET***' : 'MISSING')
  ).join(', '));
  
  // Prüfe ob alle erforderlichen Config-Werte gesetzt sind
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field] || firebaseConfig[field] === 'build-placeholder');
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase config fields:', missingFields);
    throw new Error('Firebase config incomplete');
  }
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  // Fallback für Build-Zeit ohne Umgebungsvariablen
  console.warn('Firebase config not available during build, using placeholder:', error);
  
  if (!getApps().length) {
    app = initializeApp(defaultConfig);
  } else {
    app = getApp();
  }
  
  // Mock-Services für Build-Zeit
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
  functions = {} as Functions;
}

export { app, auth, db, storage, functions };