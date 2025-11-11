// src/components/pr/email/Step1Content.tsx
"use client";

import { useState, useCallback } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation } from '@/types/email-composer';
import EmailEditor from '@/components/pr/email/EmailEditor';
import VariablesModal from '@/components/pr/email/VariablesModal';
import { InfoTooltip } from '@/components/InfoTooltip';
import { InformationCircleIcon } from '@heroicons/react/20/solid';

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
  const [showVariablesModal, setShowVariablesModal] = useState(false);

  // Handler für Content-Änderungen
  const handleContentChange = useCallback((newContent: string) => {
    onChange({ body: newContent });
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Anschreiben verfassen</h3>
            <InfoTooltip content="Verfassen Sie Ihre E-Mail mit persönlicher Ansprache. Die Pressemitteilung wird automatisch aus der Kampagne übernommen und unterhalb Ihres Textes eingefügt." />
          </div>
        </div>

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
              <h4 className="text-sm font-semibold text-gray-900">E-Mail-Signatur</h4>
              <InfoTooltip content="Die ausgewählte Signatur wird automatisch am Ende der E-Mail eingefügt." />
            </div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
              defaultValue=""
            >
              <option value="">Signatur auswählen...</option>
              <option value="standard">Standard-Signatur</option>
              <option value="formal">Formelle Signatur</option>
              <option value="short">Kurz-Signatur</option>
            </select>
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