// src/components/profile/PasswordChange.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export function PasswordChange() {
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validatePasswords = (): boolean => {
    const newErrors: typeof errors = {};

    if (!passwords.currentPassword) {
      newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich';
    }

    if (!passwords.newPassword) {
      newErrors.newPassword = 'Neues Passwort ist erforderlich';
    } else if (passwords.newPassword.length < 6) {
      newErrors.newPassword = 'Passwort muss mindestens 6 Zeichen lang sein';
    }

    if (!passwords.confirmPassword) {
      newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!user || !user.email) return;
    if (!validatePasswords()) return;

    setSaving(true);
    setMessage(null);
    setErrors({});

    try {
      // 1. Reauthentifizierung mit aktuellem Passwort
      const credential = EmailAuthProvider.credential(
        user.email,
        passwords.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // 2. Passwort ändern
      await updatePassword(user, passwords.newPassword);

      setMessage({ 
        type: 'success', 
        text: 'Passwort erfolgreich geändert!' 
      });
      
      // Reset form
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChanging(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      
      if (error.code === 'auth/wrong-password') {
        setErrors({ currentPassword: 'Falsches Passwort' });
        // Nur aktuelles Passwort leeren, neue Passwörter behalten
        setPasswords(prev => ({ ...prev, currentPassword: '' }));
      } else if (error.code === 'auth/weak-password') {
        setErrors({ newPassword: 'Passwort ist zu schwach' });
      } else if (error.code === 'auth/requires-recent-login') {
        setMessage({ 
          type: 'error', 
          text: 'Bitte melde dich erneut an, um dein Passwort zu ändern.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Fehler beim Ändern des Passworts: ${error.message || 'Unbekannter Fehler'}` 
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsChanging(false);
    setPasswords({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setMessage(null);
  };

  if (!user) return null;

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <KeyIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <Subheading level={3}>Passwort</Subheading>
            <Text className="text-sm text-gray-600">
              Ändere dein Passwort für erhöhte Sicherheit
            </Text>
          </div>
        </div>
        
        {!isChanging && (
          <Button
            className="bg-[#005fab] hover:bg-[#004a8c] px-4 py-2"
            onClick={() => setIsChanging(true)}
          >
            Passwort ändern
          </Button>
        )}
      </div>

      {isChanging && (
        <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
          <FieldGroup className="mt-6">
            <Field>
              <Label>Aktuelles Passwort</Label>
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                invalid={!!errors.currentPassword}
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <Text className="text-sm text-red-600 mt-1">
                  {errors.currentPassword}
                </Text>
              )}
            </Field>

            <Field>
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                invalid={!!errors.newPassword}
                autoComplete="new-password"
              />
              {errors.newPassword && (
                <Text className="text-sm text-red-600 mt-1">
                  {errors.newPassword}
                </Text>
              )}
            </Field>

            <Field>
              <Label>Neues Passwort bestätigen</Label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                invalid={!!errors.confirmPassword}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <Text className="text-sm text-red-600 mt-1">
                  {errors.confirmPassword}
                </Text>
              )}
            </Field>
          </FieldGroup>

          <div className="mt-6 flex gap-3">
            <Button
              type="submit"
              className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
              disabled={saving}
            >
              {saving ? 'Speichere...' : 'Passwort ändern'}
            </Button>
            <Button
              type="button"
              className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
              onClick={handleCancel}
              disabled={saving}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}
    </div>
  );
}