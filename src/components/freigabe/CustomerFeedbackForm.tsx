// src/components/freigabe/CustomerFeedbackForm.tsx - Erweiterte Feedback-Form mit TipTap Editor
"use client";

import { useState, useCallback } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import clsx from 'clsx';

interface CustomerFeedbackFormProps {
  onSubmit: (feedback: string, type: 'changes' | 'general') => Promise<void>;
  onCancel: () => void;
  initialValue?: string;
  disabled?: boolean;
  className?: string;
}

// Vordefinierte Feedback-Templates für bessere UX
const FEEDBACK_TEMPLATES = [
  {
    id: 'content-changes',
    title: 'Inhaltliche Änderungen',
    template: 'Bitte ändern Sie folgende Inhalte:\n\n- \n- \n- \n\nVielen Dank!'
  },
  {
    id: 'formatting',
    title: 'Layout/Formatierung',
    template: 'Bitte passen Sie das Layout an:\n\n- \n- \n\nDanke für die Überarbeitung!'
  },
  {
    id: 'corrections',
    title: 'Korrekturen',
    template: 'Bitte korrigieren Sie:\n\n- \n- \n\nMit freundlichen Grüßen'
  },
  {
    id: 'additions',
    title: 'Ergänzungen',
    template: 'Bitte ergänzen Sie:\n\n- \n- \n\nVielen Dank für die Bearbeitung!'
  }
];

export default function CustomerFeedbackForm({ 
  onSubmit,
  onCancel,
  initialValue = '',
  disabled = false,
  className = ""
}: CustomerFeedbackFormProps) {
  
  const [feedbackText, setFeedbackText] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'changes' | 'general'>('changes');
  const [showTemplates, setShowTemplates] = useState(false);
  
  const handleSubmit = useCallback(async () => {
    if (!feedbackText.trim() || submitting || disabled) return;
    
    try {
      setSubmitting(true);
      await onSubmit(feedbackText.trim(), feedbackType);
    } catch (error) {
      console.error('Fehler beim Senden des Feedbacks:', error);
      alert('Das Feedback konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }, [feedbackText, feedbackType, onSubmit, submitting, disabled]);
  
  const handleCancel = useCallback(() => {
    if (submitting) return;
    setFeedbackText('');
    onCancel();
  }, [onCancel, submitting]);
  
  const insertTemplate = useCallback((template: string) => {
    setFeedbackText(template);
    setShowTemplates(false);
  }, []);
  
  const isValid = feedbackText.trim().length > 10; // Mindestlänge für sinnvolles Feedback
  
  return (
    <div className={clsx("bg-white rounded-lg border border-gray-200 p-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
            Änderungen anfordern
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Beschreiben Sie konkret, welche Änderungen Sie wünschen
          </p>
        </div>
        <Button
          onClick={handleCancel}
          plain
          className="p-1"
          disabled={submitting}
        >
          <XMarkIcon className="h-5 w-5 text-gray-400" />
        </Button>
      </div>
      
      {/* Feedback-Typ Auswahl */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFeedbackType('changes')}
            disabled={submitting}
            className={clsx(
              "px-3 py-2 text-sm rounded-md border transition-colors",
              feedbackType === 'changes' 
                ? "bg-[#005fab] text-white border-[#005fab]" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            Konkrete Änderungen
          </button>
          <button
            onClick={() => setFeedbackType('general')}
            disabled={submitting}
            className={clsx(
              "px-3 py-2 text-sm rounded-md border transition-colors",
              feedbackType === 'general' 
                ? "bg-[#005fab] text-white border-[#005fab]" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            Allgemeines Feedback
          </button>
        </div>
      </div>
      
      {/* Template-Hilfe */}
      <div className="mb-4">
        <Button
          onClick={() => setShowTemplates(!showTemplates)}
          plain
          className="text-sm text-[#005fab] hover:text-[#004a8c] p-0"
          disabled={submitting}
        >
          <SparklesIcon className="h-4 w-4 mr-1" />
          {showTemplates ? 'Vorlagen ausblenden' : 'Vorlagen anzeigen'}
        </Button>
        
        {showTemplates && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FEEDBACK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => insertTemplate(template.template)}
                disabled={submitting}
                className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900">{template.title}</div>
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {template.template.substring(0, 40)}...
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Feedback-Eingabe */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {feedbackType === 'changes' ? 'Gewünschte Änderungen' : 'Ihr Feedback'}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={6}
          placeholder={
            feedbackType === 'changes'
              ? 'Bitte beschreiben Sie konkret, was geändert werden soll:\n\n- Punkt 1\n- Punkt 2\n- Punkt 3\n\nJe präziser Ihre Angaben, desto besser kann die Agentur Ihre Wünsche umsetzen.'
              : 'Teilen Sie Ihr allgemeines Feedback zur PDF mit...'
          }
          className="w-full resize-none font-mono text-sm"
          disabled={submitting}
          autoFocus
        />
        
        {/* Zeichenzähler */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-500">
            {feedbackText.length} Zeichen (mindestens 10 erforderlich)
          </div>
          {!isValid && feedbackText.length > 0 && (
            <div className="text-xs text-red-500">
              Zu kurz für aussagekräftiges Feedback
            </div>
          )}
        </div>
      </div>
      
      {/* Info-Box */}
      <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-orange-400 mr-2 flex-shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">💡 Tipp für besseres Feedback</p>
            <p>
              Je konkreter Sie Ihre Änderungswünsche formulieren, desto schneller und 
              präziser kann die Agentur diese umsetzen. Verwenden Sie gerne Aufzählungen 
              und Zeilennummern als Orientierung.
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Wird gesendet...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {feedbackType === 'changes' ? 'Änderungen senden' : 'Feedback senden'}
            </>
          )}
        </Button>
        
        <Button
          onClick={handleCancel}
          disabled={submitting}
          plain
          className="px-6"
        >
          Abbrechen
        </Button>
      </div>
      
      {/* Wichtiger Hinweis */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Wichtig:</strong> Nach dem Senden Ihres Feedbacks wird die Agentur 
          benachrichtigt und erstellt eine überarbeitete Version. Sie erhalten eine 
          neue Freigabe-Anfrage, sobald die Änderungen umgesetzt wurden.
        </p>
      </div>
    </div>
  );
}