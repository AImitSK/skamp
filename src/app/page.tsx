// src/app/page.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Stelle sicher, dass der Pfad korrekt ist

// Importiere die notwendigen Firestore-Funktionen
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init'; // Stelle sicher, dass du deine Firestore-Instanz hier exportierst

export default function HomePage() {
  const { user, login, register, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Login-Handler ---
  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.toLowerCase(), password); // Normalisiere E-Mail zu Kleinbuchstaben
      router.push('/dashboard'); // Weiterleitung nach erfolgreichem Login
    } catch (err: any) {
      console.error("Login Fehler:", err);
      setError("Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.");
    } finally {
      setLoading(false);
    }
  };

  // --- Registrierungs-Handler (MIT DER KORREKTUR) ---
  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1. Erstelle den User in Firebase Authentication
      const userCredential = await register(email.toLowerCase(), password); // Normalisiere E-Mail
      const newUser = userCredential.user;

      // 2. Erstelle ein zugehöriges Dokument in der "users"-Collection in Firestore
      // Dies ist der entscheidende Schritt, der vorher gefehlt hat!
      await setDoc(doc(db, "users", newUser.uid), {
        userId: newUser.uid, // <-- Das ist das Feld, das deine Regel verlangt!
        email: newUser.email,
        createdAt: new Date(),
        // Du kannst hier weitere Standard-Profilinformationen hinzufügen
        // z.B. plan: 'free', role: 'user'
      });

      // 3. Erstelle Owner-Organisation für normale Registrierung
      const { teamMemberService } = await import('@/lib/firebase/team-service-enhanced');
      await teamMemberService.createOwner({
        userId: newUser.uid,
        organizationId: newUser.uid,
        email: newUser.email || '',
        displayName: newUser.displayName || newUser.email || '',
        photoUrl: newUser.photoURL || undefined
      });

      router.push('/dashboard'); // Weiterleitung nach erfolgreicher Registrierung

    } catch (err: any) {
      // Detailliertes Fehler-Logging für die Entwicklerkonsole
      console.error("Registrierungsfehler:", err);
      
      // Gib dem Nutzer eine verständliche Fehlermeldung
      if (err.code === 'auth/email-already-in-use') {
        setError("Diese E-Mail-Adresse wird bereits verwendet.");
      } else if (err.code === 'permission-denied') {
        setError("Registrierung fehlgeschlagen: Keine Berechtigung, Nutzerdaten zu speichern. Überprüfe die Firestore-Regeln.");
      }
      else {
        setError("Ein unbekannter Fehler ist aufgetreten.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#005fab] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">skamp</h1>

        {user ? (
          // --- Ansicht für eingeloggte User ---
          <div className="text-center space-y-4">
            <p className="text-green-600">Willkommen, {user.email}!</p>
            <Link href="/dashboard" className="block w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Zum Dashboard
            </Link>
            <button onClick={logout} className="w-full px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">
              Logout
            </button>
          </div>
        ) : (
          // --- Ansicht für nicht eingeloggte User (Login/Register Formular) ---
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-Mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" disabled={loading} />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-700">Passwort</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" disabled={loading} />
            </div>
            
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex space-x-4 pt-2">
              <button onClick={handleLogin} className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md disabled:bg-indigo-300" disabled={loading}>
                {loading ? "Lädt..." : "Login"}
              </button>
              <button onClick={handleRegister} className="w-full px-4 py-2 text-white bg-green-600 rounded-md disabled:bg-green-300" disabled={loading}>
                {loading ? "Lädt..." : "Registrieren"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}