// src/components/profile/SocialProviders.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { 
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';

interface ProviderInfo {
  id: string;
  name: string;
  email?: string;
  isLinked: boolean;
}

export function SocialProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      updateProvidersList(user);
    }
  }, [user]);

  const updateProvidersList = (currentUser: User) => {
    const linkedProviders = currentUser.providerData.map(p => p.providerId);
    
    setProviders([
      {
        id: 'google.com',
        name: 'Google',
        email: currentUser.providerData.find(p => p.providerId === 'google.com')?.email,
        isLinked: linkedProviders.includes('google.com')
      }
    ]);
  };

  const handleLinkGoogle = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      
      // Bessere Konfiguration für OAuth
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });
      
      const result = await linkWithPopup(user, provider);
      
      updateProvidersList(result.user);
      setMessage({ 
        type: 'success', 
        text: 'Google-Konto erfolgreich verknüpft!' 
      });
    } catch (error: any) {
      console.error('Google Link Error:', error);
      
      if (error.code === 'auth/credential-already-in-use') {
        setMessage({ 
          type: 'error', 
          text: 'Dieses Google-Konto ist bereits mit einem anderen Account verknüpft.' 
        });
      } else if (error.code === 'auth/unauthorized-domain') {
        setMessage({ 
          type: 'error', 
          text: 'Domain nicht für OAuth autorisiert. Bitte kontaktiere den Support.' 
        });
      } else if (error.code === 'auth/popup-blocked') {
        setMessage({ 
          type: 'error', 
          text: 'Popup wurde blockiert. Bitte erlaube Popups für diese Website.' 
        });
      } else if (error.code === 'auth/popup-canceled-by-user') {
        // Benutzer hat Popup geschlossen - keine Fehlermeldung nötig
      } else {
        setMessage({ 
          type: 'error', 
          text: `Fehler beim Verknüpfen des Google-Kontos: ${error.message}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!user) return;

    // Prüfe ob noch andere Auth-Methoden vorhanden sind
    const hasPassword = user.providerData.some(p => p.providerId === 'password');
    const providerCount = user.providerData.length;

    if (providerCount <= 1 && !hasPassword) {
      setMessage({ 
        type: 'error', 
        text: 'Du kannst die letzte Anmeldemethode nicht entfernen. Füge zuerst ein Passwort hinzu.' 
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await unlink(user, 'google.com');
      
      // Aktualisiere die Provider-Liste
      if (auth.currentUser) {
        updateProvidersList(auth.currentUser);
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Google-Konto erfolgreich entfernt!' 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: 'Fehler beim Entfernen des Google-Kontos. Bitte versuche es erneut.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const googleProvider = providers.find(p => p.id === 'google.com');

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4">
        <Subheading level={3}>Anmeldedienste</Subheading>
        <Text className="text-sm text-gray-600 mt-1">
          Verknüpfe externe Dienste für schnellere Anmeldung
        </Text>
      </div>

      <div className="space-y-3">
        {/* Google Provider */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {/* Google Icon */}
            <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <Text className="font-medium">Google</Text>
              {googleProvider?.isLinked && googleProvider.email && (
                <Text className="text-sm text-gray-500">{googleProvider.email}</Text>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {googleProvider?.isLinked ? (
              <>
                <Badge color="green">Verknüpft</Badge>
                <Button
                  className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                  onClick={handleUnlinkGoogle}
                  disabled={loading}
                >
                  Entfernen
                </Button>
              </>
            ) : (
              <Button
                className="bg-[#005fab] hover:bg-[#004a8c] px-4 py-2"
                onClick={handleLinkGoogle}
                disabled={loading}
              >
                {loading ? 'Verknüpfe...' : 'Verknüpfen'}
              </Button>
            )}
          </div>
        </div>

        {/* Weitere Provider können hier hinzugefügt werden */}
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Info-Box */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <Text className="text-sm text-blue-700">
          <strong>Hinweis:</strong> Du kannst mehrere Anmeldemethoden verknüpfen. 
          Stelle sicher, dass mindestens eine Methode aktiv bleibt.
        </Text>
      </div>
    </div>
  );
}