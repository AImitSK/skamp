// src/components/email/SignatureEditor.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label, Description } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmailEditor from '@/components/pr/email/EmailEditor';
import { InfoTooltip } from '@/components/InfoTooltip';
import { EmailSignature } from '@/types/email-enhanced';
import { useOrganization } from '@/context/OrganizationContext';
import {
  PencilSquareIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface SignatureEditorProps {
  signature: EmailSignature | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EmailSignature>) => Promise<void>;
  emailAddresses: Array<{ id: string; email: string; displayName: string }>;
}

export function SignatureEditor({
  signature,
  isOpen,
  onClose,
  onSave,
  emailAddresses
}: SignatureEditorProps) {
  const t = useTranslations('email.signatures');
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    emailAddressIds: [] as string[]
  });

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (signature) {
      setFormData({
        name: signature.name,
        content: signature.content,
        emailAddressIds: signature.emailAddressIds || []
      });
    } else {
      // Reset für neue Signatur
      setFormData({
        name: '',
        content: '',
        emailAddressIds: []
      });
    }
  }, [signature]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired');
    }

    if (!formData.content.trim()) {
      newErrors.content = t('validation.contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: t('validation.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const toggleEmailAddress = (emailId: string) => {
    setFormData(prev => ({
      ...prev,
      emailAddressIds: prev.emailAddressIds.includes(emailId)
        ? prev.emailAddressIds.filter(id => id !== emailId)
        : [...prev.emailAddressIds, emailId]
    }));
  };

  const getPreviewHtml = () => {
    return formData.content || `<p>${t('preview.noContent')}</p>`;
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
        <div className="h-[75vh] flex flex-col overflow-hidden">
          <DialogTitle className="px-6 py-4 flex-shrink-0">
            {signature ? t('editor.titleEdit') : t('editor.titleCreate')}
          </DialogTitle>
          <DialogBody className="p-6 flex-1 overflow-y-auto">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {errors.submit}
            </div>
          )}
          
          <div className="space-y-6">
            {/* Name */}
            <Field>
              <Label>{t('editor.nameLabel')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('editor.namePlaceholder')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </Field>

            {/* Signatur Content */}
            <Field>
              <div className="flex items-center gap-2 mb-2">
                <Label>{t('editor.contentLabel')}</Label>
                <InfoTooltip content={t('editor.contentTooltip')} />
                <Button
                  type="button"
                  plain
                  onClick={() => setShowPreview(true)}
                  className="text-sm ml-auto"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {t('editor.previewButton')}
                </Button>
              </div>
              <EmailEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder={t('editor.contentPlaceholder')}
                minHeight="200px"
                error={errors.content}
              />
              {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}
            </Field>

            {/* E-Mail-Adressen Zuordnung */}
            {emailAddresses.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{t('editor.assignmentLabel')}</span>
                  <InfoTooltip content={t('editor.assignmentTooltip')} />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {emailAddresses.map((email) => (
                    <label
                      key={email.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.emailAddressIds.includes(email.id)}
                        onChange={() => toggleEmailAddress(email.id)}
                        className="h-4 w-4 text-[#005fab] rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{email.email}</p>
                        {email.displayName && (
                          <p className="text-xs text-gray-500">{email.displayName}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          </DialogBody>
          <DialogActions className="px-6 py-4 flex-shrink-0">
            <Button plain onClick={onClose} disabled={saving}>
              {t('actions.cancel')}
            </Button>
            <Button
              className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? t('actions.saving') : (signature ? t('actions.save') : t('actions.create'))}
            </Button>
          </DialogActions>
        </div>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} className="sm:max-w-2xl">
        <DialogTitle className="px-6 py-4">{t('preview.title')}</DialogTitle>
        <DialogBody className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-4">{t('preview.description')}</p>
            <div
              className="bg-white rounded border p-4"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowPreview(false)}>
            {t('preview.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}