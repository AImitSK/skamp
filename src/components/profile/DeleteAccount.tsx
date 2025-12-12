// src/components/profile/DeleteAccount.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('profile.deleteAccount');
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
      setError(t('errors.mustConfirm'));
      return;
    }
    setConfirmStep('confirm');
    setError(null);
  };

  const handleProceedToFinal = () => {
    if (confirmText !== 'LÖSCHEN') {
      setError(t('errors.mustTypeDelete'));
      return;
    }
    setConfirmStep('final');
    setError(null);
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    if (!password) {
      setError(t('errors.passwordRequired'));
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
        setError(t('errors.wrongPassword'));
      } else if (error.code === 'auth/requires-recent-login') {
        setError(t('errors.recentLoginRequired'));
      } else {
        setError(t('errors.deleteFailed'));
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
              {t('dangerZone.title')}
            </Subheading>
            <Text className="mt-2 text-sm text-red-700">
              {t('dangerZone.description')}
            </Text>

            <Button
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2"
              onClick={handleInitiateDelete}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('dangerZone.deleteButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleCancel}>
        <DialogTitle className="px-6 py-4 text-red-900">
          {confirmStep === 'initial' && t('dialog.titleWarning')}
          {confirmStep === 'confirm' && t('dialog.titleConfirm')}
          {confirmStep === 'final' && t('dialog.titleFinal')}
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
                  {t('dialog.initial.warningTitle')}
                </Text>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  <li>{t('dialog.initial.consequences.accountDeleted')}</li>
                  <li>{t('dialog.initial.consequences.dataRemoved')}</li>
                  <li>{t('dialog.initial.consequences.emailNotReusable')}</li>
                  <li>{t('dialog.initial.consequences.organizationsLost')}</li>
                  <li>{t('dialog.initial.consequences.settingsLost')}</li>
                  <li>{t('dialog.initial.consequences.irreversible')}</li>
                </ul>
              </div>

              <CheckboxField>
                <Checkbox
                  checked={understandConsequences}
                  onChange={setUnderstandConsequences}
                />
                <Label className="text-sm">
                  {t('dialog.initial.checkboxLabel')}
                </Label>
              </CheckboxField>
            </>
          )}

          {confirmStep === 'confirm' && (
            <>
              <Text className="mb-4">
                {t.rich('dialog.confirm.instruction', {
                  strong: (chunks) => <strong>{chunks}</strong>
                })}
              </Text>

              <Field>
                <Label>{t('dialog.confirm.label')}</Label>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t('dialog.confirm.placeholder')}
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
                  {t('dialog.final.lastChance')}
                </Text>
              </div>

              <Text className="mb-4 text-sm text-gray-600">
                {t('dialog.final.instruction')}
              </Text>

              <Field>
                <Label>{t('dialog.final.passwordLabel')}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('dialog.final.passwordPlaceholder')}
                  autoComplete="current-password"
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
                {t('dialog.actions.cancel')}
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleProceedToConfirm}
                disabled={!understandConsequences}
              >
                {t('dialog.actions.proceed')}
              </Button>
            </>
          )}

          {confirmStep === 'confirm' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={() => setConfirmStep('initial')}
              >
                {t('dialog.actions.back')}
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleProceedToFinal}
                disabled={confirmText !== 'LÖSCHEN'}
              >
                {t('dialog.actions.proceedFinal')}
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
                {t('dialog.actions.cancelKeep')}
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={handleDeleteAccount}
                disabled={deleting || !password}
              >
                {deleting ? t('dialog.actions.deleting') : t('dialog.actions.deleteConfirm')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}