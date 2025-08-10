// src/components/profile/DeleteAccount.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Checkbox, CheckboxField } from '@/components/ui/checkbox';
import { 
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  ExclamationTriangleIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

export function DeleteAccount() {
  const { user } = useAuth();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'initial' | 'confirm' | 'final'>('initial');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [understandConsequences, setUnderstandConsequences] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitiateDelete = () => {
    setShowDeleteDialog(true);
    setConfirmStep('initial');
    setPassword('');
    setConfirmText('');
    setUnderstandConsequences(false);
    setError(null);
  };

  const handleProceedToConfirm = () => {
    if (!understandConsequences) {
      setError('Du musst bestätigen, dass du die Konsequenzen verstehst');
      return;
    }
    setConfirmStep('confirm');
    setError(null);
  };

  const handleProceedToFinal = () => {
    if (confirmText !== 'LÖSCHEN') {
      setError('Bitte gib "LÖSCHEN" ein, um fortzufahren');
      return;
    }
    setConfirmStep('final');
    setError(null);
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    if (!password) {
      setError('Passwort ist erforderlich');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // 1. Reauthentifizierung
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // 2. Firestore Daten löschen (soft delete)
      const { userService } = await import('@/lib/firebase/user-service');
      await userService.deleteProfile(user.uid);

      // 3. Storage Daten löschen (Avatar)
      try {
        const ProfileImageService = (await import('@/lib/services/profile-image-service')).default;
        const orgId = localStorage.getItem('currentOrganizationId');
        if (orgId) {
          await ProfileImageService.deleteProfileImage(user, orgId);
        }
      } catch (storageError) {
        // Storage-Fehler ignorieren, Account wird trotzdem gelöscht
        console.error('Storage cleanup error:', storageError);
      }

      // 4. Firebase Auth Account löschen
      await deleteUser(user);

      // 5. Weiterleitung zur Startseite
      router.push('/');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setError('Falsches Passwort');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Bitte melde dich erneut an und versuche es dann nochmal');
      } else {
        setError('Fehler beim Löschen des Accounts. Bitte versuche es später erneut.');
      }
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowDeleteDialog(false);
    setConfirmStep('initial');
    setPassword('');
    setConfirmText('');
    setUnderstandConsequences(false);
    setError(null);
  };

  if (!user) return null;

  return (
    <>
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <Subheading level={3} className="text-red-900">
              Gefahrenzone
            </Subheading>
            <Text className="mt-2 text-sm text-red-700">
              Das Löschen deines Accounts ist permanent und kann nicht rückgängig gemacht werden. 
              Alle deine Daten, Einstellungen und der Zugang zur Plattform werden unwiderruflich gelöscht.
            </Text>
            
            <Button
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2"
              onClick={handleInitiateDelete}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Account löschen
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleCancel}>
        <DialogTitle className="px-6 py-4 text-red-900">
          {confirmStep === 'initial' && 'Account löschen - Warnung'}
          {confirmStep === 'confirm' && 'Account löschen - Bestätigung'}
          {confirmStep === 'final' && 'Account löschen - Finale Bestätigung'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {confirmStep === 'initial' && (
            <>
              <div className="mb-4 p-4 bg-red-50 rounded-lg">
                <Text className="font-medium text-red-900 mb-2">
                  ⚠️ Diese Aktion hat folgende Konsequenzen:
                </Text>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  <li>Dein Account wird permanent gelöscht</li>
                  <li>Alle deine persönlichen Daten werden entfernt</li>
                  <li>Deine E-Mail-Adresse kann nicht wiederverwendet werden</li>
                  <li>Du verlierst den Zugang zu allen Organisationen</li>
                  <li>Alle deine Einstellungen und Präferenzen gehen verloren</li>
                  <li>Diese Aktion kann NICHT rückgängig gemacht werden</li>
                </ul>
              </div>

              <CheckboxField>
                <Checkbox
                  checked={understandConsequences}
                  onChange={setUnderstandConsequences}
                />
                <Label className="text-sm">
                  Ich verstehe die Konsequenzen und möchte fortfahren
                </Label>
              </CheckboxField>
            </>
          )}

          {confirmStep === 'confirm' && (
            <>
              <Text className="mb-4">
                Um sicherzustellen, dass du diese Aktion wirklich durchführen möchtest, 
                gib bitte <strong>LÖSCHEN</strong> in das Feld unten ein:
              </Text>
              
              <Field>
                <Label>Bestätigungstext</Label>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Gib LÖSCHEN ein"
                />
              </Field>
            </>
          )}

          {confirmStep === 'final' && (
            <>
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <TrashIcon className="h-8 w-8 text-red-600" />
                </div>
                <Text className="font-medium text-lg text-red-900">
                  Letzte Chance - Bist du dir wirklich sicher?
                </Text>
              </div>

              <Text className="mb-4 text-sm text-gray-600">
                Gib dein Passwort ein, um deinen Account endgültig zu löschen:
              </Text>
              
              <Field>
                <Label>Passwort</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dein Passwort"
                />
              </Field>
            </>
          )}
        </DialogBody>

        <DialogActions className="px-6 py-4">
          {confirmStep === 'initial' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={handleCancel}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleProceedToConfirm}
                disabled={!understandConsequences}
              >
                Weiter
              </Button>
            </>
          )}

          {confirmStep === 'confirm' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={() => setConfirmStep('initial')}
              >
                Zurück
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleProceedToFinal}
                disabled={confirmText !== 'LÖSCHEN'}
              >
                Weiter zur finalen Bestätigung
              </Button>
            </>
          )}

          {confirmStep === 'final' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={handleCancel}
                disabled={deleting}
              >
                Abbrechen - Account behalten
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleDeleteAccount}
                disabled={deleting || !password}
              >
                {deleting ? 'Account wird gelöscht...' : 'Account endgültig löschen'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}