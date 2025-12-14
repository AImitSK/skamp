// src/components/pr/email/VariablesModal.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { EMAIL_VARIABLES } from '@/types/email-composer';
import {
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (variable: string) => void;
}

export default function VariablesModal({ isOpen, onClose, onInsert }: VariablesModalProps) {
  const t = useTranslations('email.variablesModal');
  const tVars = useTranslations('email.variables');
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Helper-Funktion: Extrahiert den Key-Namen aus {{key}} für i18n-Lookup
  const getTranslationKey = (variableKey: string): string => {
    return variableKey.replace(/\{\{|\}\}/g, '');
  };

  const handleCopy = async (variable: string) => {
    try {
      // Moderne Clipboard API mit Fallback
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(variable);
      } else {
        // Fallback für HTTP oder ältere Browser
        const textArea = document.createElement("textarea");
        textArea.value = variable;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (!successful) {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          console.error('Fallback copy failed:', err);
          alert(t('copyManually', { variable }));
          return;
        } finally {
          textArea.remove();
        }
      }

      // Visuelles Feedback
      setCopiedVariable(variable);

      // Reset nach 2 Sekunden
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      alert(t('copyManually', { variable }));
    }
  };

  const handleInsert = (variable: string) => {
    if (onInsert) {
      onInsert(variable);
      onClose();
    } else {
      handleCopy(variable);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col p-6">
        <DialogTitle className="-mx-6 -mt-6 px-6 py-4 border-b">
          {t('title')}
        </DialogTitle>

        <DialogBody className="-mx-6 px-6 py-4">
          <div className="space-y-3">
            {EMAIL_VARIABLES.map((variable) => {
              const translationKey = getTranslationKey(variable.key);

              return (
                <div
                  key={variable.key}
                  className="rounded-lg border border-gray-200 bg-white p-4 hover:border-[#005fab] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleInsert(variable.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <code className="text-sm font-mono bg-gray-100 px-2.5 py-1 rounded text-[#005fab] font-medium">
                          {variable.key}
                        </code>
                        <span className="text-sm font-semibold text-gray-900">
                          {tVars(`${translationKey}.label`)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 ml-0 mt-2">
                        {tVars(`${translationKey}.description`)}
                      </p>

                      <p className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">{t('exampleLabel')}:</span>{' '}
                        <span className="italic">{tVars(`${translationKey}.example`)}</span>
                      </p>
                    </div>

                    <div className="ml-4">
                      <div
                        className="p-2 text-gray-400 hover:text-[#005fab] transition-colors"
                        title={onInsert ? t('insertTooltip') : t('copyTooltip')}
                      >
                        {copiedVariable === variable.key ? (
                          <CheckIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogBody>
      </div>
    </Dialog>
  );
}