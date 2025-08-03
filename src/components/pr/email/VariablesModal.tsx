// src/components/pr/email/VariablesModal.tsx
"use client";

import { Fragment, useState } from 'react';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { EMAIL_VARIABLES, VariableDefinition } from '@/types/email-composer';
import { 
  ClipboardDocumentIcon, 
  CheckIcon,
  UserIcon,
  UserGroupIcon,
  CogIcon,
  MegaphoneIcon
} from '@heroicons/react/20/solid';

interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (variable: string) => void;
}

const categoryIcons = {
  recipient: UserIcon,
  sender: UserGroupIcon,
  campaign: MegaphoneIcon,
  system: CogIcon
};

const categoryLabels = {
  recipient: 'Empfänger',
  sender: 'Absender',
  campaign: 'Kampagne',
  system: 'System'
};

export default function VariablesModal({ isOpen, onClose, onInsert }: VariablesModalProps) {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof categoryLabels | 'all'>('all');

  const handleCopy = async (variable: string) => {
    try {
      // Moderne Clipboard API mit Fallback
      if (navigator.clipboard && window.isSecureContext) {
        // Moderne API (funktioniert in HTTPS/localhost)
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
          // Als letzter Ausweg: Zeige die Variable in einem Alert
          alert(`Bitte kopieren Sie manuell: ${variable}`);
          return;
        } finally {
          textArea.remove();
        }
      }

      // Visuelles Feedback
      setCopiedVariable(variable);
      console.log(`Variable ${variable} erfolgreich kopiert`);
      
      // Reset nach 2 Sekunden
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      // Fallback: Zeige die Variable zum manuellen Kopieren
      alert(`Bitte kopieren Sie manuell: ${variable}`);
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

  const filteredVariables = selectedCategory === 'all' 
    ? EMAIL_VARIABLES 
    : EMAIL_VARIABLES.filter(v => v.category === selectedCategory);

  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, VariableDefinition[]>);

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <div className="flex h-full flex-col p-6">
        <DialogTitle className="-mx-6 -mt-6 px-6 py-4 border-b">E-Mail Variablen</DialogTitle>
        
        <DialogBody className="flex-1 overflow-hidden -mx-6 px-6 py-4">
          <div className="h-full flex flex-col">
            {/* Kategorie-Filter */}
            <div className="mb-4 flex gap-2 pb-4 border-b">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#005fab] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle
              </button>
              {Object.entries(categoryLabels).map(([key, label]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as keyof typeof categoryLabels)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === key
                        ? 'bg-[#005fab] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Variablen-Liste */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {Object.entries(groupedVariables).map(([category, variables]) => {
                  const Icon = categoryIcons[category as keyof typeof categoryIcons];
                  const label = categoryLabels[category as keyof typeof categoryLabels];
                  
                  return (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gray-500" />
                        {label}
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {variables.map((variable) => (
                          <div
                            key={variable.key}
                            className="group relative rounded-lg border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleInsert(variable.key)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-[#005fab]">
                                    {variable.key}
                                  </code>
                                  <span className="text-sm font-medium text-gray-900">
                                    {variable.label}
                                  </span>
                                  {variable.isRequired && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                      Pflicht
                                    </span>
                                  )}
                                </div>
                                
                                {variable.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {variable.description}
                                  </p>
                                )}
                                
                                <p className="text-sm text-gray-500 mt-2">
                                  <span className="font-medium">Beispiel:</span>{' '}
                                  <span className="italic">{variable.example}</span>
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <div
                                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                  title={onInsert ? "Variable einfügen" : "Variable kopieren"}
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
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hinweis */}
            <div className="mt-4 pt-4 border-t">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Verwendung von Variablen
                </h4>
                <p className="text-sm text-blue-700">
                  Klicken Sie auf eine Variable, um sie {onInsert ? 'in den Text einzufügen' : 'zu kopieren'}. 
                  Variablen werden beim Versand automatisch durch die entsprechenden Werte ersetzt.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Tipp:</strong> Sie können Variablen auch manuell eingeben, indem Sie den 
                  Variablennamen zwischen geschweiften Klammern schreiben.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
      </div>
    </Dialog>
  );
}