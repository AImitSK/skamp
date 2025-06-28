// src/lib/firebase/client-init.ts
"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 1. Import hinzufügen
import { firebaseConfig } from "./config";
import { getFunctions } from 'firebase/functions';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // 2. Storage initialisieren

export { app, auth, db, storage }; // 3. Storage exportieren
export const functions = getFunctions(app);