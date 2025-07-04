// src/app/page.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';

export default function HomePage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) { setError(err.message); }
  };

  const handleRegister = async () => { /* ... */ }; // Gekürzt für Lesbarkeit

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#005fab] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">skamp</h1>
        {user ? (
          <div className="text-center space-y-4">
            <p className="text-green-600">Willkommen, {user.email}!</p>
            <Link href="/dashboard" className="block w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Zum Dashboard
            </Link>
            <button onClick={() => signOut(auth)} className="w-full px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-Mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-700">Passwort</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex space-x-4">
              <button onClick={handleLogin} className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md">Login</button>
              <button onClick={handleRegister} className="w-full px-4 py-2 text-white bg-green-600 rounded-md">Registrieren</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}