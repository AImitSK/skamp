// src/components/pr/email/TranslationLanguageSelector.tsx
"use client";

import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LanguageIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useProjectTranslations } from "@/lib/hooks/useTranslations";
import { LanguageCode, LANGUAGE_NAMES } from "@/types/international";
import clsx from "clsx";

// Flaggen-Mapping (ISO 639-1 -> ISO 3166-1 Alpha-2)
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  de: "DE",
  en: "GB",
  fr: "FR",
  es: "ES",
  it: "IT",
  nl: "NL",
  pl: "PL",
  pt: "PT",
  cs: "CZ",
  da: "DK",
  sv: "SE",
  no: "NO",
  fi: "FI",
  hu: "HU",
  ro: "RO",
  bg: "BG",
  el: "GR",
  tr: "TR",
  ru: "RU",
  zh: "CN",
  ja: "JP",
  ko: "KR",
  ar: "SA",
};

// Flaggen-Icon Komponente
function FlagIcon({ languageCode, className }: { languageCode: string; className?: string }) {
  const countryCode = LANGUAGE_TO_COUNTRY[languageCode.toLowerCase()] || languageCode.toUpperCase();

  const getFlagEmoji = (code: string) => {
    const codePoints = code
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <span className={clsx("text-lg", className)} title={LANGUAGE_NAMES[languageCode] || languageCode}>
      {getFlagEmoji(countryCode)}
    </span>
  );
}

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
          <Text className="font-medium text-gray-600">Sprachen für Versand</Text>
        </div>
        <div className="flex items-center gap-2 py-2">
          <FlagIcon languageCode={sourceLanguage} />
          <Text className="text-sm">{LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}</Text>
          <Badge color="blue" className="ml-auto">Original</Badge>
        </div>
        <Text className="text-xs text-gray-500 mt-2">
          Keine Übersetzungen vorhanden. Nur die Originalsprache wird versendet.
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
          <Text className="font-medium">Sprachen für Versand</Text>
        </div>
        <Badge color="zinc">{selectedCount} ausgewählt</Badge>
      </div>

      {/* Sprach-Liste */}
      <div className="space-y-2">
        {/* Original (immer ausgewählt) */}
        <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex items-center gap-3">
            <Checkbox checked disabled className="opacity-60" />
            <FlagIcon languageCode={sourceLanguage} />
            <Text className="text-sm font-medium">
              {LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}
            </Text>
          </div>
          <Badge color="blue">Original</Badge>
        </div>

        {/* Übersetzungen */}
        {isLoading ? (
          <div className="py-4 text-center text-sm text-gray-500">
            Lade Übersetzungen...
          </div>
        ) : (
          translations?.map((translation) => {
            const isSelected = selectedLanguages.translations.includes(translation.language);
            const isOutdated = translation.isOutdated;

            return (
              <div
                key={translation.language}
                className={clsx(
                  "flex items-center justify-between py-2 px-3 rounded-md border",
                  isSelected ? "bg-green-50 border-green-100" : "bg-white border-gray-100",
                  disabled && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleLanguage(translation.language)}
                    disabled={disabled}
                  />
                  <FlagIcon languageCode={translation.language} />
                  <div>
                    <Text className="text-sm font-medium">
                      {LANGUAGE_NAMES[translation.language] || translation.language}
                    </Text>
                    {translation.generatedAt && (
                      <Text className="text-xs text-gray-500">
                        Erstellt: {formatDate(translation.generatedAt)}
                      </Text>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOutdated ? (
                    <Badge color="amber" className="text-xs">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      Veraltet
                    </Badge>
                  ) : (
                    <Badge color="green" className="text-xs">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Aktuell
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Alle auswählen Button */}
        {translations && translations.length > 1 && (
          <button
            onClick={toggleAll}
            disabled={disabled}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
          >
            {translations.every((t) => selectedLanguages.translations.includes(t.language))
              ? "Alle abwählen"
              : "Alle auswählen"}
          </button>
        )}
      </div>

      {/* Info-Hinweis bei veralteten Übersetzungen */}
      {translations?.some((t) => t.isOutdated && selectedLanguages.translations.includes(t.language)) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
            <Text className="text-sm text-amber-700">
              Einige ausgewählte Übersetzungen sind veraltet. Das Original wurde seit der
              letzten Übersetzung geändert.
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Datum formatieren
function formatDate(date: Date | string | { toDate: () => Date }): string {
  if (date instanceof Date) {
    return date.toLocaleDateString("de-DE");
  }
  if (typeof date === "string") {
    return new Date(date).toLocaleDateString("de-DE");
  }
  if (date && typeof date === "object" && "toDate" in date) {
    return date.toDate().toLocaleDateString("de-DE");
  }
  return "";
}

export default TranslationLanguageSelector;
