// src/components/pr/email/TranslationLanguageSelector.tsx
"use client";

import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LanguageIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useProjectTranslations } from "@/lib/hooks/useTranslations";
import { LanguageCode, LANGUAGE_NAMES } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import clsx from "clsx";

// PDF-Format ist immer "separate" - jede Sprache als eigene Datei
export type PdfFormat = "separate";

// Ausgewählte Sprachen für Versand
export interface SelectedLanguages {
  original: boolean; // Originalsprache immer dabei
  translations: LanguageCode[]; // Ausgewählte Übersetzungen
}

interface TranslationLanguageSelectorProps {
  organizationId: string;
  projectId: string;
  sourceLanguage: LanguageCode;
  selectedLanguages: SelectedLanguages;
  onSelectedLanguagesChange: (selected: SelectedLanguages) => void;
  disabled?: boolean;
}

export function TranslationLanguageSelector({
  organizationId,
  projectId,
  sourceLanguage,
  selectedLanguages,
  onSelectedLanguagesChange,
  disabled = false,
}: TranslationLanguageSelectorProps) {
  const t = useTranslations("email.translationLanguageSelector");

  // Lade verfügbare Übersetzungen
  const { data: translations, isLoading } = useProjectTranslations(organizationId, projectId);

  const hasTranslations = translations && translations.length > 0;

  // Toggle eine Sprache
  const toggleLanguage = (language: LanguageCode) => {
    const isSelected = selectedLanguages.translations.includes(language);
    const newTranslations = isSelected
      ? selectedLanguages.translations.filter((l) => l !== language)
      : [...selectedLanguages.translations, language];

    onSelectedLanguagesChange({
      ...selectedLanguages,
      translations: newTranslations,
    });
  };

  // Alle auswählen / abwählen
  const toggleAll = () => {
    if (!translations) return;

    const allSelected = translations.every((t) =>
      selectedLanguages.translations.includes(t.language)
    );

    onSelectedLanguagesChange({
      ...selectedLanguages,
      translations: allSelected ? [] : translations.map((t) => t.language),
    });
  };

  // Anzahl ausgewählter Sprachen
  const selectedCount = 1 + selectedLanguages.translations.length; // +1 für Original

  // Keine Übersetzungen vorhanden
  if (!hasTranslations && !isLoading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <LanguageIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium text-gray-600">{t("title")}</Text>
        </div>
        <div className="flex items-center gap-2 py-2">
          <LanguageFlagIcon languageCode={sourceLanguage} />
          <Text className="text-sm">{LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}</Text>
          <Badge color="blue" className="ml-auto">{t("original")}</Badge>
        </div>
        <Text className="text-xs text-gray-500 mt-2">
          {t("noTranslations")}
        </Text>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LanguageIcon className="h-5 w-5 text-gray-500" />
          <Text className="font-medium">{t("title")}</Text>
        </div>
        <Badge color="zinc">{t("selectedCount", { count: selectedCount })}</Badge>
      </div>

      {/* Sprach-Liste */}
      <div className="space-y-2">
        {/* Original (immer ausgewählt) */}
        <div className="flex items-center justify-between py-2 px-3 bg-white rounded-md border border-gray-100">
          <div className="flex items-center gap-3">
            <Checkbox checked disabled className="opacity-60" />
            <LanguageFlagIcon languageCode={sourceLanguage} />
            <Text className="text-sm font-medium">
              {LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}
            </Text>
          </div>
          <Badge color="blue">{t("original")}</Badge>
        </div>

        {/* Übersetzungen */}
        {isLoading ? (
          <div className="py-4 text-center text-sm text-gray-500">
            {t("loading")}
          </div>
        ) : (
          translations?.map((translation) => (
            <div
              key={translation.language}
              className={clsx(
                "flex items-center justify-between py-2 px-3 rounded-md border border-gray-100 bg-white",
                disabled && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedLanguages.translations.includes(translation.language)}
                  onChange={() => toggleLanguage(translation.language)}
                  disabled={disabled}
                />
                <LanguageFlagIcon languageCode={translation.language} />
                <Text className="text-sm font-medium">
                  {LANGUAGE_NAMES[translation.language] || translation.language}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {translation.isOutdated ? (
                  <Badge color="amber" className="text-xs">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    {t("outdated")}
                  </Badge>
                ) : (
                  <Badge color="purple" className="text-xs">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    {t("aiTranslation")}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}

        {/* Alle auswählen Button */}
        {translations && translations.length > 1 && (
          <button
            onClick={toggleAll}
            disabled={disabled}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
          >
            {translations.every((translation) => selectedLanguages.translations.includes(translation.language))
              ? t("deselectAll")
              : t("selectAll")}
          </button>
        )}
      </div>

      {/* Info-Hinweis bei veralteten Übersetzungen */}
      {translations?.some((translation) => translation.isOutdated && selectedLanguages.translations.includes(translation.language)) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
            <Text className="text-sm text-amber-700">
              {t("outdatedWarning")}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslationLanguageSelector;
