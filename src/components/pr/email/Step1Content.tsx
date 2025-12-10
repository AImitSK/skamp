// src/components/pr/email/Step1Content.tsx
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation } from '@/types/email-composer';
import { EmailSignature } from '@/types/email-enhanced';
import EmailEditor from '@/components/pr/email/EmailEditor';
import VariablesModal from '@/components/pr/email/VariablesModal';
import { InfoTooltip } from '@/components/InfoTooltip';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import { useOrganization } from '@/context/OrganizationContext';
import { emailSignatureService } from '@/lib/email/email-signature-service';

interface Step1ContentProps {
  content: EmailDraft['content'];
  onChange: (content: Partial<EmailDraft['content']>) => void;
  validation: StepValidation['step1'];
  campaign: PRCampaign;
}

export default function Step1Content({
  content,
  onChange,
  validation,
  campaign
}: Step1ContentProps) {
  const t = useTranslations('email.step1');
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';

  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loadingSignatures, setLoadingSignatures] = useState(true);

  // Signaturen laden
  useEffect(() => {
    const loadSignatures = async () => {
      if (!organizationId) return;

      try {
        setLoadingSignatures(true);
        const sigs = await emailSignatureService.getByOrganization(organizationId);
        setSignatures(sigs);
      } catch (error) {
        console.error('Fehler beim Laden der Signaturen:', error);
      } finally {
        setLoadingSignatures(false);
      }
    };

    loadSignatures();
  }, [organizationId]);

  // Handler für Content-Änderungen
  const handleContentChange = useCallback((newContent: string) => {
    onChange({ body: newContent });
  }, [onChange]);

  // Handler für Signatur-Auswahl
  const handleSignatureChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const signatureId = e.target.value || undefined;
    onChange({ signatureId });
  }, [onChange]);

  // Handler für Variable einfügen
  const handleInsertVariable = useCallback((variable: string) => {
    // Verwende die globale Funktion vom Editor
    if ((window as any).emailEditorInsertVariable) {
      (window as any).emailEditorInsertVariable(variable);
    }
  }, []);

  // Öffne Modal im Insert-Modus (vom Editor)
  const openVariablesForInsert = useCallback(() => {
    setShowVariablesModal(true);
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* TipTap Editor */}
        <div className="space-y-4">
          <EmailEditor
            content={content.body}
            onChange={handleContentChange}
            placeholder="{{salutationFormal}} {{title}} {{firstName}} {{lastName}},

ich freue mich, Ihnen unsere neueste Pressemitteilung zukommen zu lassen..."
            onOpenVariables={openVariablesForInsert}
            error={validation.errors.body}
            minHeight="320px"
          />

          {/* Fehleranzeige */}
          {validation.errors.body && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <InformationCircleIcon className="h-4 w-4" />
              {validation.errors.body}
            </p>
          )}

          {/* Email-Signatur Auswahl */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">{t('signature.title')}</h4>
              <InfoTooltip content={t('signature.tooltip')} />
            </div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              value={content.signatureId || ''}
              onChange={handleSignatureChange}
              disabled={loadingSignatures}
            >
              <option value="">
                {loadingSignatures ? t('signature.loading') : t('signature.none')}
              </option>
              {signatures.map((signature) => (
                <option key={signature.id} value={signature.id}>
                  {signature.name}
                  {signature.isDefault ? ` (${t('signature.default')})` : ''}
                </option>
              ))}
            </select>
            {!loadingSignatures && signatures.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {t('signature.empty')}{' '}
                <a href="/dashboard/settings/email" className="text-[#005fab] hover:underline">
                  {t('signature.settingsLink')}
                </a>.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Variablen Modal */}
      <VariablesModal
        isOpen={showVariablesModal}
        onClose={() => setShowVariablesModal(false)}
        onInsert={handleInsertVariable}
      />
    </div>
  );
}