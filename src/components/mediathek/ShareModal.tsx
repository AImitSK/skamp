// src/components/mediathek/ShareModal.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { MediaFolder, MediaAsset } from "@/types/media";
import {
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { toastService } from '@/lib/utils/toast';

interface ShareModalProps {
  target: MediaFolder | MediaAsset;
  type: 'folder' | 'file';
  onClose: () => void;
  onSuccess?: () => void;
  organizationId: string; // NEW: Required for multi-tenancy
  userId: string; // NEW: Required for tracking who creates the share
}

interface CreatedShareLink {
  id: string;
  shareId: string;
  title: string;
  type: 'folder' | 'file';
  downloadAllowed: boolean;
  passwordRequired?: string;
  accessCount: number;
}

export default function ShareModal({
  target,
  type,
  onClose,
  onSuccess,
  organizationId, // NEW
  userId // NEW
}: ShareModalProps) {
  const t = useTranslations('mediathek.shareModal');

  const defaultTitle = type === 'folder'
    ? (target as MediaFolder).name
    : (target as MediaAsset).fileName;

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    if (!title.trim()) return;

    setCreating(true);
    try {
      // ✅ Verwende API-Route für bcrypt-Hashing
      const response = await fetch('/api/media/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          createdBy: userId,
          type,
          targetId: target.id!,
          title: title.trim(),
          description: description.trim() || undefined,
          settings: {
            downloadAllowed,
            showFileList: type === 'folder',
            expiresAt: null,
            passwordRequired: passwordRequired.trim() || null, // ✅ Wird von API gehashed
            watermarkEnabled: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(t('errors.apiError'));
      }

      const result = await response.json();

      if (!result.shareId) {
        throw new Error(t('errors.noShareId'));
      }

      // Erstelle ein lokales Objekt für die Anzeige
      const linkData: CreatedShareLink = {
        id: result.shareId,
        shareId: result.shareId,
        title: title.trim(),
        type,
        downloadAllowed,
        passwordRequired: passwordRequired.trim() || undefined,
        accessCount: 0,
      };

      setCreatedLink(linkData);
      toastService.success('Share-Link erfolgreich erstellt');

    } catch (error) {
      console.error('Share-Link Error:', error);
      toastService.error('Fehler beim Erstellen des Share-Links. Bitte versuchen Sie es erneut');
    } finally {
      setCreating(false);
    }
  };

  const getShareUrl = () => {
    if (!createdLink) return '';
    return `${window.location.origin}/share/${createdLink.shareId}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Error handling could be improved with proper user feedback
    }
  };

  const handleClose = () => {
    // Beim Schließen erst onSuccess aufrufen, falls ein Link erstellt wurde
    if (createdLink && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  if (createdLink) {
    // Link wurde erstellt - Erfolgsansicht
    return (
      <Dialog open={true} onClose={handleClose} size="lg">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-green-600" />
            {t('success.title')}
          </div>
        </DialogTitle>

        <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <Text className="text-lg font-medium text-gray-900 mb-2">
                {t('success.message')}
              </Text>
              <Text className="text-sm text-gray-500 mb-6">
                {t('success.subtitle')}
              </Text>
              
              {/* Share URL */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between gap-2">
                  <code className="text-sm text-gray-700 flex-1 min-w-0 break-all leading-relaxed">
                    {getShareUrl()}
                  </code>
                  <Button
                    plain
                    onClick={handleCopyLink}
                    className={`whitespace-nowrap flex-shrink-0 ${copied ? 'text-green-600' : 'text-gray-600'}`}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        {t('success.copied')}
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {t('success.copyButton')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Link Details */}
              <div className="text-left bg-white border rounded-lg p-4">
                <Text className="font-medium text-gray-900 mb-2">{t('success.details.title')}</Text>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>{t('success.details.labelTitle')}</strong> {createdLink.title}</li>
                  <li><strong>{t('success.details.labelType')}</strong> {type === 'folder' ? t('success.details.typeFolder') : t('success.details.typeFile')}</li>
                  <li><strong>{t('success.details.labelDownload')}</strong> {createdLink.downloadAllowed ? t('success.details.downloadAllowed') : t('success.details.downloadNotAllowed')}</li>
                  {createdLink.passwordRequired && (
                    <li><strong>{t('success.details.labelPassword')}</strong> {t('success.details.passwordRequired')}</li>
                  )}
                  <li><strong>{t('success.details.labelAccess')}</strong> {createdLink.accessCount}</li>
                </ul>
              </div>
            </div>
        </DialogBody>

        <DialogActions>
          <Button
            onClick={handleClose}
            className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap h-10 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {t('success.doneButton')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Link-Erstellung
  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          {t('create.title')}
        </div>
      </DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
        <FieldGroup>
            <Field>
              <Label>{t('create.form.titleLabel')}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('create.form.titlePlaceholder')}
                autoFocus
              />
            </Field>

            <Field>
              <Label>{t('create.form.descriptionLabel')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('create.form.descriptionPlaceholder')}
                rows={3}
              />
            </Field>

            <Field>
              <Label>{t('create.form.settingsLabel')}</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={downloadAllowed}
                  onChange={setDownloadAllowed}
                />
                <span className="text-sm">{t('create.form.downloadAllowedLabel')}</span>
              </label>
            </Field>

            <Field>
              <Label>{t('create.form.passwordLabel')}</Label>
              <Input
                type="password"
                value={passwordRequired}
                onChange={(e) => setPasswordRequired(e.target.value)}
                placeholder={t('create.form.passwordPlaceholder')}
              />
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <Text className="text-sm font-medium text-blue-900 mb-2">{t('create.info.title')}</Text>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {t('create.info.validityUnlimited')}</li>
                    <li>• {t('create.info.canDeactivate')}</li>
                    <li>• {t('create.info.trackingEnabled')}</li>
                    {type === 'folder' && <li>• {t('create.info.folderGallery')}</li>}
                  </ul>
                </div>
              </div>
            </div>
        </FieldGroup>
      </DialogBody>

      <DialogActions>
        <Button
          plain
          onClick={onClose}
          disabled={creating}
          className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap h-10 px-6 rounded-lg transition-colors"
        >
          {t('create.cancelButton')}
        </Button>
        <Button
          onClick={handleCreateLink}
          disabled={!title.trim() || creating}
          className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap h-10 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {creating ? t('create.creatingButton') : t('create.createButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}