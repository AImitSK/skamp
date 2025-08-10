// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  EnvelopeIcon, 
  LockClosedIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, login, register, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [resolver, setResolver] = useState<any>(null);

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Login-Handler mit 2FA Support
  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.toLowerCase(), password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Login Fehler:", err);
      
      // 2FA Handling
      if (err.code === 'auth/multi-factor-auth-required') {
        const mfaResolver = getMultiFactorResolver(auth, err);
        setResolver(mfaResolver);
        
        // Wenn SMS 2FA aktiviert ist
        if (mfaResolver.hints[0].factorId === PhoneMultiFactorGenerator.FACTOR_ID) {
          const phoneInfoOptions = {
            multiFactorHint: mfaResolver.hints[0],
            session: mfaResolver.session
          };
          
          const phoneAuthProvider = new PhoneAuthProvider(auth);
          const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, undefined as any);
          setVerificationId(verificationId);
          setRequires2FA(true);
        }
      } else if (err.code === 'auth/wrong-password') {
        setError("Falsches Passwort. Bitte erneut versuchen.");
      } else if (err.code === 'auth/user-not-found') {
        setError("Kein Account mit dieser E-Mail-Adresse gefunden.");
      } else {
        setError("Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2FA Verifizierung
  const handle2FAVerification = async () => {
    if (!verificationCode || !verificationId || !resolver) return;
    
    setLoading(true);
    setError(null);

    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await resolver.resolveSignIn(multiFactorAssertion);
      
      router.push('/dashboard');
    } catch (error) {
      setError('Ungültiger Verifizierungscode. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      // Prüfe ob User-Dokument existiert, wenn nicht erstelle es
      await setDoc(doc(db, "users", googleUser.uid), {
        userId: googleUser.uid,
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoURL: googleUser.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        provider: 'google'
      }, { merge: true });

      // Erstelle Owner-Organisation wenn neu
      const { teamMemberService } = await import('@/lib/firebase/team-service-enhanced');
      await teamMemberService.createOwner({
        userId: googleUser.uid,
        organizationId: googleUser.uid,
        email: googleUser.email || '',
        displayName: googleUser.displayName || googleUser.email || '',
        photoUrl: googleUser.photoURL || undefined
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error("Google Sign-In Fehler:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User hat Popup geschlossen - keine Fehlermeldung nötig
      } else {
        setError("Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Registrierungs-Handler
  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    
    // Validierung
    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await register(email.toLowerCase(), password);
      const newUser = userCredential.user;

      // Erstelle User-Dokument in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        userId: newUser.uid,
        email: newUser.email,
        createdAt: new Date(),
        emailVerified: false,
        twoFactorEnabled: false,
        linkedProviders: ['password']
      });

      // Erstelle Owner-Organisation
      const { teamMemberService } = await import('@/lib/firebase/team-service-enhanced');
      await teamMemberService.createOwner({
        userId: newUser.uid,
        organizationId: newUser.uid,
        email: newUser.email || '',
        displayName: newUser.displayName || newUser.email || '',
        photoUrl: newUser.photoURL || undefined
      });

      // Sende Verifizierungs-E-Mail
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(newUser);

      router.push('/dashboard');
    } catch (err: any) {
      console.error("Registrierungsfehler:", err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError("Diese E-Mail-Adresse wird bereits verwendet.");
      } else if (err.code === 'auth/weak-password') {
        setError("Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Ungültige E-Mail-Adresse.");
      } else {
        setError("Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Wenn bereits eingeloggt, zeige nichts (redirect läuft)
  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#005fab] to-[#004a8c] p-4">
      <div className="w-full max-w-md">
        {/* Logo und Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CeleroPress</h1>
          <p className="text-blue-100">PR-Management neu definiert</p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 2FA Verification Screen */}
          {requires2FA ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-[#005fab]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Zwei-Faktor-Authentifizierung
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Gib den Verifizierungscode ein, der an dein Telefon gesendet wurde
                </p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Verifizierungscode
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
                  placeholder="123456"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handle2FAVerification}
                className="w-full px-6 py-3 text-white bg-[#005fab] hover:bg-[#004a8c] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? "Verifiziere..." : "Verifizieren"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isRegisterMode ? 'Konto erstellen' : 'Willkommen zurück'}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {isRegisterMode 
                    ? 'Starte deine PR-Revolution mit CeleroPress' 
                    : 'Melde dich bei deinem CeleroPress-Konto an'}
                </p>
              </div>

              {/* E-Mail Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-Mail-Adresse
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
                    placeholder="name@firma.de"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Passwort Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Passwort
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={isRegisterMode ? handleRegister : handleLogin}
                className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#005fab] hover:bg-[#004a8c] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  "Verarbeite..."
                ) : (
                  <>
                    {isRegisterMode ? 'Registrieren' : 'Anmelden'}
                    <ArrowRightIcon className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Oder</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Mit Google anmelden
              </button>

              {/* Toggle Register/Login */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setError(null);
                  }}
                  className="text-sm text-[#005fab] hover:text-[#004a8c] font-medium"
                >
                  {isRegisterMode 
                    ? 'Bereits registriert? Jetzt anmelden' 
                    : 'Noch kein Konto? Jetzt registrieren'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-100 text-sm">
          <p>© 2025 CeleroPress. Alle Rechte vorbehalten.</p>
          <div className="mt-2 space-x-4">
            <a href="https://www.celeropress.com/datenschutz" className="hover:text-white">
              Datenschutz
            </a>
            <a href="https://www.celeropress.com/impressum" className="hover:text-white">
              Impressum
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}