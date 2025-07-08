// src/components/pr/email/Step1Content.tsx
"use client";

import { useState, useCallback, useEffect } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation, DEFAULT_COMPOSER_CONFIG } from '@/types/email-composer';
import EmailEditor from '@/components/pr/email/EmailEditor';
import VariablesModal from '@/components/pr/email/VariablesModal';
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
  const [characterCount, setCharacterCount] = useState(0);

  // Berechne Zeichenanzahl ohne HTML-Tags
  useEffect(() => {
    const plainText = content.body.replace(/<[^>]*>/g, '').trim();
    setCharacterCount(plainText.length);
  }, [content.body]);

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

  // Fortschritts-Indikator für Mindestlänge
  const progress = Math.min(100, (characterCount / DEFAULT_COMPOSER_CONFIG.validation.minBodyLength) * 100);
  const isValidLength = characterCount >= DEFAULT_COMPOSER_CONFIG.validation.minBodyLength;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Anschreiben verfassen</h3>
          <p className="text-sm text-gray-600">
            Verfassen Sie Ihre E-Mail mit persönlicher Ansprache. Die Pressemitteilung wird automatisch 
            aus der Kampagne übernommen und unterhalb Ihres Textes eingefügt.
          </p>
        </div>

        {/* Info-Box für Struktur */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Tipp zur Bearbeitung:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Die E-Mail ist mit einem professionellen Template vorausgefüllt</li>
              <li>Passen Sie den Text nach Ihren Bedürfnissen an</li>
              <li>Die Variablen in {"{}"} werden automatisch ersetzt</li>
              <li>Die Pressemitteilung wird unterhalb Ihres Textes eingefügt</li>
            </ul>
          </div>
        </div>
        
        {/* TipTap Editor */}
        <div className="space-y-4">
          <EmailEditor
            content={content.body}
            onChange={handleContentChange}
            placeholder="Sehr geehrte/r {{firstName}} {{lastName}},

ich freue mich, Ihnen unsere neueste Pressemitteilung zukommen zu lassen...

Mit freundlichen Grüßen
{{senderName}}"
            onOpenVariables={() => setShowVariablesModal(true)}
            error={validation.errors.body}
          />
          
          {/* Fehleranzeige */}
          {validation.errors.body && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <InformationCircleIcon className="h-4 w-4" />
              {validation.errors.body}
            </p>
          )}
          
          {/* Footer mit Zeichenzähler und Fortschritt */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Fortschrittsbalken für Mindestlänge */}
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isValidLength ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={`text-sm ${isValidLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {characterCount} / {DEFAULT_COMPOSER_CONFIG.validation.minBodyLength} Zeichen
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowVariablesModal(true)}
              className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Alle Variablen anzeigen
            </button>
          </div>
        </div>
        
        {/* Kampagnen-Info Box */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kampagnen-Kontext
          </h4>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Kampagne:</dt>
              <dd className="font-medium text-gray-900">{campaign.title}</dd>
            </div>
            {campaign.clientName && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Kunde:</dt>
                <dd className="font-medium text-gray-900">{campaign.clientName}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Empfänger:</dt>
              <dd className="font-medium text-gray-900">
                {campaign.recipientCount?.toLocaleString('de-DE') || '—'} 
                {campaign.recipientCount === 1 ? 'Empfänger' : 'Empfänger'}
              </dd>
            </div>
          </dl>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Hinweis:</strong> Die Pressemitteilung aus der Kampagne wird automatisch 
              unterhalb Ihres Anschreibens eingefügt.
            </p>
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