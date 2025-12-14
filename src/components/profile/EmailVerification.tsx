// src/components/profile/EmailVerification.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.profile.emailVerification');
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
        text: t('successMessage')
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('errorSending')
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
              {t('title')}
            </h3>
            {user.emailVerified ? (
              <Badge color="green">{t('status.verified')}</Badge>
            ) : (
              <Badge color="yellow">{t('status.notVerified')}</Badge>
            )}
          </div>

          <Text className="mt-2 text-sm text-gray-600">
            {user.emailVerified ? (
              t.rich('verifiedText', {
                email: user.email || '',
                strong: (chunks) => <strong>{chunks}</strong>
              })
            ) : (
              t.rich('notVerifiedText', {
                email: user.email || '',
                strong: (chunks) => <strong>{chunks}</strong>
              })
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
                {sending ? t('sendButton.sending') : t('sendButton.label')}
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