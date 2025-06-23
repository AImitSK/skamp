// src/app/page.tsx
"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

// ACHTUNG: NUR ZUM TESTEN! NIEMALS GEHEIME SCHLÜSSEL SO IM CODE SPEICHERN!
// Wir umgehen process.env vollständig und verwenden die Werte direkt.
const hardcodedFirebaseConfig = {
  apiKey: "AIzaSyBB4SDdaTRVMXKOJAv_FMQ8TG_nKdRkPfg",
  authDomain: "skamp-prod.firebaseapp.com",
  projectId: "skamp-prod",
  storageBucket: "skamp-prod.firebasestorage.app",
  messagingSenderId: "184547460574",
  appId: "1:184547460574:web:1a88eb71b343461fea094f"
};

const app = !getApps().length ? initializeApp(hardcodedFirebaseConfig) : getApp();
const auth = getAuth(app);

export default function HardcodedTestPage() {
  const [message, setMessage] = useState("Bereit zum finalen Test mit hartcodierten Werten.");

  const handleTestRegister = async () => {
    const randomEmail = `testuser_${Math.floor(Math.random() * 10000)}@test.com`;
    setMessage(`Versuche, ${randomEmail} zu registrieren...`);

    try {
      await createUserWithEmailAndPassword(auth, randomEmail, "password123");
      setMessage(`ERFOLG! Benutzer ${randomEmail} wurde in Firebase registriert.`);
    } catch (error: any) {
      setMessage(`FEHLER: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Finaler Test (Hartcodierte Schlüssel)</h1>
      <button 
        onClick={handleTestRegister} 
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Test-Registrierung durchführen
      </button>
      <hr style={{ margin: '1rem 0' }} />
      <p><strong>Status:</strong> {message}</p>
    </div>
  );
}