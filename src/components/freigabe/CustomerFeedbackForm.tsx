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
import { useTranslations } from 'next-intl';
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

// Template IDs für i18n
const TEMPLATE_IDS = [
  'content-changes',
  'formatting',
  'corrections',
  'additions'
] as const;

export default function CustomerFeedbackForm({
  onSubmit,
  onCancel,
  initialValue = '',
  disabled = false,
  className = ""
}: CustomerFeedbackFormProps) {
  const t = useTranslations('freigabe.feedback');

  const [feedbackText, setFeedbackText] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'changes' | 'general'>('changes');
  const [showTemplates, setShowTemplates] = useState(false);

  // Build templates from translations
  const feedbackTemplates = TEMPLATE_IDS.map(id => ({
    id,
    title: t(`templates.${id}.title`),
    template: t(`templates.${id}.template`)
  }));
  
  const handleSubmit = useCallback(async () => {
    if (!feedbackText.trim() || submitting || disabled) return;

    try {
      setSubmitting(true);
      await onSubmit(feedbackText.trim(), feedbackType);
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert(t('errorSending'));
    } finally {
      setSubmitting(false);
    }
  }, [feedbackText, feedbackType, onSubmit, submitting, disabled, t]);
  
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
            {t('title')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('subtitle')}
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
            {t('types.changes')}
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
            {t('types.general')}
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
          {showTemplates ? t('templatesHide') : t('templatesShow')}
        </Button>

        {showTemplates && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {feedbackTemplates.map((template) => (
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
          {feedbackType === 'changes' ? t('labels.desiredChanges') : t('labels.yourFeedback')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={6}
          placeholder={
            feedbackType === 'changes'
              ? t('placeholders.changes')
              : t('placeholders.general')
          }
          className="w-full resize-none font-mono text-sm"
          disabled={submitting}
          autoFocus
        />

        {/* Zeichenzähler */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-500">
            {t('characterCount', { count: feedbackText.length })}
          </div>
          {!isValid && feedbackText.length > 0 && (
            <div className="text-xs text-red-500">
              {t('tooShort')}
            </div>
          )}
        </div>
      </div>
      
      {/* Info-Box */}
      <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-orange-400 mr-2 flex-shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">{t('tip.title')}</p>
            <p>
              {t('tip.description')}
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
              {t('sending')}
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {feedbackType === 'changes' ? t('buttons.sendChanges') : t('buttons.sendFeedback')}
            </>
          )}
        </Button>

        <Button
          onClick={handleCancel}
          disabled={submitting}
          plain
          className="px-6"
        >
          {t('buttons.cancel')}
        </Button>
      </div>
      
      {/* Wichtiger Hinweis */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>{t('notice.title')}</strong> {t('notice.description')}
        </p>
      </div>
    </div>
  );
}