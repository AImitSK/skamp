// src/components/profile/EmailVerification.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';

export function EmailVerification() {
  const { user, sendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSendVerification = async () => {
    setSending(true);
    setMessage(null);

    try {
      await sendVerificationEmail();
      setMessage({ 
        type: 'success', 
        text: 'Verifizierungs-E-Mail wurde gesendet! Bitte überprüfe dein Postfach.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Fehler beim Senden der Verifizierungs-E-Mail' 
      });
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {user.emailVerified ? (
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-gray-900">
              E-Mail-Verifizierung
            </h3>
            {user.emailVerified ? (
              <Badge color="green">Verifiziert</Badge>
            ) : (
              <Badge color="yellow">Nicht verifiziert</Badge>
            )}
          </div>
          
          <Text className="mt-2 text-sm text-gray-600">
            {user.emailVerified ? (
              <>Deine E-Mail-Adresse <strong>{user.email}</strong> wurde erfolgreich verifiziert.</>
            ) : (
              <>
                Deine E-Mail-Adresse <strong>{user.email}</strong> ist noch nicht verifiziert. 
                Verifiziere deine E-Mail-Adresse, um alle Funktionen nutzen zu können.
              </>
            )}
          </Text>

          {!user.emailVerified && (
            <div className="mt-4">
              <Button
                className="bg-[#005fab] hover:bg-[#004a8c] px-4 py-2"
                onClick={handleSendVerification}
                disabled={sending}
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {sending ? 'Sende...' : 'Verifizierungs-E-Mail senden'}
              </Button>
            </div>
          )}

          {message && (
            <div className={`mt-3 text-sm ${
              message.type === 'success' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}