// src/app/invite/[token]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/button';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ClockIcon,
  KeyIcon,
  EnvelopeIcon,
  UserIcon
} from '@heroicons/react/20/solid';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';

interface InvitationData {
  email: string;
  role: string;
  organizationId: string;
  invitedBy: string;
  displayName: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const token = params.token as string;
  const invitationId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [valid, setValid] = useState(false);
  
  // Form State für Account-Erstellung
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  
  // Role configuration
  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Team-Mitglied',
    client: 'Kunde',
    guest: 'Gast'
  };
  
  // Token validieren
  useEffect(() => {
    if (!token || !invitationId) {
      setError('Ungültiger Einladungslink');
      setLoading(false);
      return;
    }
    
    validateInvitation();
  }, [token, invitationId]);
  
  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prüfe nochmal ob invitationId existiert
      if (!invitationId) {
        throw new Error('Keine Einladungs-ID gefunden');
      }
      
      // Lade Einladung direkt aus Firestore
      const memberRef = doc(db, 'team_members', invitationId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        throw new Error('Einladung nicht gefunden');
      }
      
      const memberData = memberDoc.data();
      
      // Prüfe Status
      if (memberData.status !== 'invited') {
        throw new Error('Diese Einladung wurde bereits verwendet');
      }
      
      // Prüfe Token
      if (memberData.invitationToken !== token) {
        throw new Error('Ungültiger Einladungstoken');
      }
      
      // Prüfe Ablauf
      if (memberData.invitationTokenExpiry && memberData.invitationTokenExpiry.toDate() < new Date()) {
        throw new Error('Diese Einladung ist abgelaufen');
      }
      
      // Setze Einladungsdaten
      setInvitation({
        email: memberData.email,
        role: memberData.role,
        organizationId: memberData.organizationId,
        invitedBy: memberData.invitedBy,
        displayName: memberData.displayName || memberData.email.split('@')[0]
      });
      setDisplayName(memberData.displayName || memberData.email.split('@')[0]);
      setValid(true);
      
      // Zeige Account-Form nur wenn kein User eingeloggt ist oder der richtige User
      if (!user || user.email === memberData.email) {
        setShowAccountForm(true);
      }
      
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      setError(error.message || 'Fehler beim Validieren der Einladung');
      setValid(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateAccountAndAccept = async () => {
    if (!invitation || !invitationId) return;
    
    // Validiere Formular
    if (!displayName.trim()) {
      setError('Bitte geben Sie Ihren Namen ein');
      return;
    }
    
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }
    
    try {
      setAccepting(true);
      setError(null);
      
      // 1. Account erstellen
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invitation.email,
        password
      );
      
      // 2. Display Name setzen
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      // 3. Einladung akzeptieren - DIREKT mit updateDoc
      const memberRef = doc(db, 'team_members', invitationId);
      await updateDoc(memberRef, {
        userId: userCredential.user.uid,
        displayName: displayName,
        photoUrl: userCredential.user.photoURL || null,
        status: 'active',
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        invitationToken: null,
        invitationTokenExpiry: null
      });
      
      // Erfolg - weiterleiten zum Dashboard
      router.push('/dashboard?welcome=true');
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      
      // Spezifische Fehlermeldungen
      if (error.code === 'auth/email-already-in-use') {
        setError('Ein Account mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.');
        setShowAccountForm(false);
      } else if (error.code === 'auth/weak-password') {
        setError('Das Passwort ist zu schwach');
      } else if (error.code === 'permission-denied') {
        setError('Keine Berechtigung. Bitte kontaktieren Sie den Administrator.');
      } else {
        setError(error.message || 'Fehler beim Erstellen des Accounts');
      }
    } finally {
      setAccepting(false);
    }
  };
  
  const handleLoginAndAccept = async () => {
    if (!invitation || !invitationId || !password) return;
    
    try {
      setAccepting(true);
      setError(null);
      
      // 1. Mit bestehendem Account anmelden
      const userCredential = await signInWithEmailAndPassword(
        auth,
        invitation.email,
        password
      );
      
      // 2. Einladung akzeptieren - DIREKT mit updateDoc
      const memberRef = doc(db, 'team_members', invitationId);
      await updateDoc(memberRef, {
        userId: userCredential.user.uid,
        displayName: userCredential.user.displayName || displayName,
        photoUrl: userCredential.user.photoURL || null,
        status: 'active',
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        invitationToken: null,
        invitationTokenExpiry: null
      });
      
      // Erfolg - weiterleiten zum Dashboard
      router.push('/dashboard?welcome=true');
      
    } catch (error: any) {
      console.error('Error logging in:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError('Falsches Passwort oder Account existiert nicht');
      } else if (error.code === 'permission-denied') {
        setError('Keine Berechtigung. Bitte kontaktieren Sie den Administrator.');
      } else {
        setError(error.message || 'Fehler beim Anmelden');
      }
    } finally {
      setAccepting(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Seite neu laden um Einladung erneut zu prüfen
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <p className="mt-4 text-center text-sm text-gray-600">
              Einladung wird geprüft...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-full bg-red-100 p-3 mx-auto w-fit">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <Heading level={2} className="mt-6 text-center">
              Ungültige Einladung
            </Heading>
            <Text className="mt-2 text-center text-gray-600">
              {error}
            </Text>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
              >
                Zur Anmeldung
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Valid invitation
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="rounded-full bg-blue-100 p-3 mx-auto w-fit">
            <UserGroupIcon className="h-8 w-8 text-[#005fab]" />
          </div>
          
          <Heading level={2} className="mt-6 text-center">
            Team-Einladung
          </Heading>
          
          <div className="mt-6 space-y-4">
            {/* Einladungsdetails */}
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">E-Mail:</dt>
                  <dd className="text-sm text-gray-900">{invitation?.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Rolle:</dt>
                  <dd className="text-sm text-gray-900">
                    {invitation && roleLabels[invitation.role] || invitation?.role}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Organisation:</dt>
                  <dd className="text-sm text-gray-900">CeleroPress</dd>
                </div>
              </dl>
            </div>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Account-Erstellungsformular oder Ausloggen-Option bei falschem User */}
            {user && user.email !== invitation?.email ? (
              <>
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        Sie sind als <span className="font-medium">{user.email}</span> angemeldet, 
                        aber diese Einladung ist für <span className="font-medium">{invitation?.email}</span>.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSignOut}
                    className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
                  >
                    Abmelden und mit {invitation?.email} fortfahren
                  </Button>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    plain
                    className="w-full"
                  >
                    Zum Dashboard (ohne Einladung anzunehmen)
                  </Button>
                </div>
              </>
            ) : showAccountForm ? (
              <>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateAccountAndAccept(); }}>
                  <div className="space-y-4">
                    <Field>
                      <Label>
                        <UserIcon className="inline h-4 w-4 mr-1" />
                        Ihr Name
                      </Label>
                      <Input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Max Mustermann"
                        required
                      />
                    </Field>
                    
                    <Field>
                      <Label>
                        <KeyIcon className="inline h-4 w-4 mr-1" />
                        Passwort
                      </Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mindestens 6 Zeichen"
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                    
                    <Field>
                      <Label>
                        <KeyIcon className="inline h-4 w-4 mr-1" />
                        Passwort bestätigen
                      </Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Passwort wiederholen"
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={accepting || !displayName || !password || !confirmPassword}
                    className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white mt-4"
                  >
                    {accepting ? (
                      <>
                        <ClockIcon className="mr-2 h-4 w-4 animate-spin" />
                        Account wird erstellt...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="mr-2 h-4 w-4" />
                        Account erstellen & Einladung annehmen
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">
                      Haben Sie bereits einen Account?
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={() => setShowAccountForm(false)}
                  plain
                  className="w-full"
                >
                  Mit bestehendem Account anmelden
                </Button>
              </>
            ) : (
              <>
                {/* Login mit bestehendem Account */}
                <Text className="text-center text-sm text-gray-600">
                  Melden Sie sich mit Ihrem bestehenden Passwort an:
                </Text>
                
                <form onSubmit={(e) => { e.preventDefault(); handleLoginAndAccept(); }}>
                  <Field>
                    <Label>
                      <KeyIcon className="inline h-4 w-4 mr-1" />
                      Passwort
                    </Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ihr Passwort"
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  
                  <Button
                    type="submit"
                    disabled={accepting || !password}
                    className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white mt-4"
                  >
                    {accepting ? (
                      <>
                        <ClockIcon className="mr-2 h-4 w-4 animate-spin" />
                        Wird angemeldet...
                      </>
                    ) : (
                      <>
                        <ArrowRightIcon className="mr-2 h-4 w-4" />
                        Anmelden & Einladung annehmen
                      </>
                    )}
                  </Button>
                </form>
                
                <Button
                  onClick={() => setShowAccountForm(true)}
                  plain
                  className="w-full mt-2"
                >
                  Neuen Account erstellen
                </Button>
              </>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <Text className="text-xs text-gray-500">
              Probleme? Kontaktieren Sie den Administrator.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}