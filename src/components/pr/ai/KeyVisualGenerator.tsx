// src/components/pr/ai/KeyVisualGenerator.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  SparklesIcon,
  PhotoIcon,
  CameraIcon,
  ChartBarIcon,
  LightBulbIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api/api-client';
import { toastService } from '@/lib/utils/toast';

interface KeyVisualGeneratorProps {
  content: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  campaignId?: string;
  campaignName?: string;
  clientId?: string;
  onImageGenerated: (imageData: { downloadUrl: string; assetId: string }) => void;
  disabled?: boolean;
}

interface ImagePromptSuggestion {
  prompt: string;
  description: string;
  style: 'Fotorealistisch' | 'Business' | 'Konzeptuell';
  mood: string;
}

type GeneratorState = 'idle' | 'generating-prompts' | 'selecting' | 'generating-image';

// Style-Konfiguration mit Heroicons
const styleConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  iconColor: string;
}> = {
  'Fotorealistisch': {
    icon: CameraIcon,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600'
  },
  'Business': {
    icon: ChartBarIcon,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    iconColor: 'text-green-600'
  },
  'Konzeptuell': {
    icon: LightBulbIcon,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600'
  }
};

export function KeyVisualGenerator({
  content,
  organizationId,
  projectId,
  projectName,
  campaignId,
  campaignName,
  clientId,
  onImageGenerated,
  disabled = false
}: KeyVisualGeneratorProps) {
  const t = useTranslations('pr.ai.keyVisualGenerator');
  const [state, setState] = useState<GeneratorState>('idle');
  const [suggestions, setSuggestions] = useState<ImagePromptSuggestion[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<ImagePromptSuggestion | null>(null);

  // ══════════════════════════════════════════════════════════════
  // SCHRITT 1: Bildideen generieren
  // ══════════════════════════════════════════════════════════════

  const generatePrompts = async () => {
    // Validierung
    const contentToAnalyze = content.trim();
    if (contentToAnalyze.length < 100) {
      toastService.error('Bitte geben Sie zuerst mehr Inhalt in die Pressemitteilung ein (mind. 100 Zeichen), damit die KI passende Bildideen entwickeln kann.');
      return;
    }

    if (!projectId || !projectName) {
      toastService.error('Bitte wählen Sie zuerst ein Projekt aus, damit das Bild korrekt gespeichert werden kann.');
      return;
    }

    setState('generating-prompts');

    try {
      const data = await apiClient.post<any>('/api/ai/generate-image-prompts', {
        content: contentToAnalyze,
        context: null
      });

      if (data.success && data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setState('selecting');
      } else {
        toastService.error('Keine Bildideen konnten generiert werden. Bitte versuchen Sie es erneut.');
        setState('idle');
      }
    } catch (error: any) {
      console.error('Fehler beim Generieren der Bildideen:', error);

      // Spezifische Fehlermeldung für AI-Limit
      if (error.message?.includes('AI-Limit')) {
        toastService.error(error.message);
      } else {
        toastService.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
      setState('idle');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // SCHRITT 2: Bild generieren nach Auswahl
  // ══════════════════════════════════════════════════════════════

  const generateImage = async (suggestion: ImagePromptSuggestion) => {
    setSelectedPrompt(suggestion);
    setState('generating-image');

    try {
      const data = await apiClient.post<any>('/api/ai/generate-image', {
        prompt: suggestion.prompt,
        projectId,
        projectName,
        campaignId,
        campaignName,
        clientId
      });

      if (data.success && data.downloadUrl) {
        toastService.success('Bild erfolgreich generiert und gespeichert!');

        // Callback aufrufen
        onImageGenerated({
          downloadUrl: data.downloadUrl,
          assetId: data.assetId
        });

        // Reset
        setState('idle');
        setSuggestions([]);
        setSelectedPrompt(null);
      } else {
        toastService.error('Das Bild konnte nicht generiert werden. Bitte versuchen Sie es erneut.');
        setState('selecting');
      }
    } catch (error: any) {
      console.error('Fehler beim Generieren des Bildes:', error);

      // Spezifische Fehlermeldungen
      if (error.message?.includes('AI-Limit')) {
        toastService.error(error.message);
      } else if (error.message?.includes('Richtlinien')) {
        toastService.error('Das Bild konnte nicht generiert werden, da der Inhalt gegen die Richtlinien verstößt. Bitte wählen Sie einen anderen Bildvorschlag.');
      } else {
        toastService.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }

      setState('selecting');
      setSelectedPrompt(null);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // SCHRITT 3: Abbrechen/Zurücksetzen
  // ══════════════════════════════════════════════════════════════

  const closeSuggestions = () => {
    setState('idle');
    setSuggestions([]);
    setSelectedPrompt(null);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  // Prüfe ob Button deaktiviert sein soll
  const isButtonDisabled = disabled || !projectId || state !== 'idle';

  return (
    <div className="relative">
      {/* Generate Button */}
      <Button
        type="button"
        onClick={generatePrompts}
        disabled={isButtonDisabled}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white whitespace-nowrap text-sm"
      >
        {state === 'generating-prompts' ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        ) : (
          <SparklesIcon className="h-4 w-4 mr-2" />
        )}
        {state === 'generating-prompts' ? t('generatingIdeas') : t('aiImageIdeas')}
      </Button>

      {/* Bildvorschläge zur Auswahl - Breites 1-spaltiges Layout */}
      {state === 'selecting' && suggestions.length > 0 && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 p-5 w-[800px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">{t('selectImageStyle')}</h4>
            <button
              onClick={closeSuggestions}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Vertikale Liste */}
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const config = styleConfig[suggestion.style] || styleConfig['Konzeptuell'];
              const IconComponent = config.icon;

              return (
                <button
                  key={index}
                  onClick={() => generateImage(suggestion)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header mit Badge und Mood */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                          {suggestion.style}
                        </span>
                        <span className="text-xs text-gray-500">
                          {suggestion.mood}
                        </span>
                      </div>

                      {/* Beschreibung */}
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>

                    {/* Hover Icon */}
                    <PhotoIcon className="h-5 w-5 text-gray-300 group-hover:text-purple-500 flex-shrink-0 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              {t('autoSaveInfo')}
            </p>
          </div>
        </div>
      )}

      {/* Bild wird generiert - Overlay */}
      {state === 'generating-image' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {/* Animierter Spinner */}
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                <SparklesIcon className="absolute inset-0 m-auto h-6 w-6 text-purple-600" />
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">
                {t('generatingImage')}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {t('generatingImageDescription')}
              </p>

              {/* Ausgewählter Stil anzeigen */}
              {selectedPrompt && (() => {
                const config = styleConfig[selectedPrompt.style] || styleConfig['Konzeptuell'];
                const IconComponent = config.icon;
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded ${config.bgColor}`}>
                        <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                        {selectedPrompt.style}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {selectedPrompt.description}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
