// src/components/campaigns/TranslationOutdatedBanner.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";
import { useTranslationSummary, useMarkTranslationCurrent } from "@/lib/hooks/useTranslations";
import { LanguageCode, LANGUAGE_NAMES } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import clsx from "clsx";

interface TranslationOutdatedBannerProps {
  organizationId: string;
  projectId: string;
  onRetranslate: (language: LanguageCode) => void;
  onRetranslateAll?: () => void;
  className?: string;
  dismissible?: boolean;
}

export function TranslationOutdatedBanner({
  organizationId,
  projectId,
  onRetranslate,
  onRetranslateAll,
  className,
  dismissible = true,
}: TranslationOutdatedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [markingCurrent, setMarkingCurrent] = useState<string | null>(null);

  // Lade Übersetzungs-Zusammenfassung
  const { data: summary, isLoading } = useTranslationSummary(organizationId, projectId);
  const { mutate: markCurrent } = useMarkTranslationCurrent();

  // Filtere veraltete Übersetzungen
  const outdatedTranslations = summary?.languages.filter((l) => l.isOutdated) || [];

  // Nicht anzeigen wenn keine veralteten Übersetzungen oder dismissed
  if (isLoading || outdatedTranslations.length === 0 || isDismissed) {
    return null;
  }

  // Einzelne Übersetzung als aktuell markieren
  const handleMarkCurrent = async (translationId: string, language: LanguageCode) => {
    setMarkingCurrent(translationId);
    try {
      await markCurrent({
        organizationId,
        projectId,
        translationId,
      });
    } finally {
      setMarkingCurrent(null);
    }
  };

  return (
    <div
      className={clsx(
        "bg-amber-50 border border-amber-200 rounded-lg p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Text className="font-medium text-amber-900">
            {outdatedTranslations.length === 1
              ? "Eine Übersetzung ist veraltet"
              : `${outdatedTranslations.length} Übersetzungen sind veraltet`}
          </Text>
          <Text className="text-sm text-amber-700 mt-1">
            Das Original wurde geändert. Die folgenden Übersetzungen stimmen möglicherweise nicht mehr überein:
          </Text>

          {/* Veraltete Sprachen */}
          <div className="mt-3 space-y-2">
            {outdatedTranslations.map((translation) => (
              <div
                key={translation.code}
                className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <LanguageFlagIcon languageCode={translation.code} />
                  <Text className="text-sm font-medium">
                    {LANGUAGE_NAMES[translation.code] || translation.code}
                  </Text>
                  {translation.generatedAt && (
                    <Text className="text-xs text-gray-500">
                      (erstellt am{" "}
                      {(() => {
                        const date = translation.generatedAt;
                        if (date instanceof Date) {
                          return date.toLocaleDateString("de-DE");
                        }
                        if (typeof date === "string") {
                          return new Date(date).toLocaleDateString("de-DE");
                        }
                        // Firestore Timestamp
                        if (date && typeof date === "object" && "toDate" in date) {
                          return (date as { toDate: () => Date }).toDate().toLocaleDateString("de-DE");
                        }
                        return "";
                      })()})
                    </Text>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Als aktuell markieren - disabled für jetzt da wir keine translationId haben */}
                  {/*
                  <Button
                    plain
                    onClick={() => handleMarkCurrent(translation.id, translation.code)}
                    disabled={markingCurrent === translation.id}
                    className="text-xs"
                    title="Als aktuell markieren (keine Änderung nötig)"
                  >
                    {markingCurrent === translation.id ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                  </Button>
                  */}

                  {/* Neu übersetzen */}
                  <Button
                    color="secondary"
                    onClick={() => onRetranslate(translation.code)}
                    className="text-xs"
                  >
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    Neu übersetzen
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Alle neu übersetzen */}
          {outdatedTranslations.length > 1 && onRetranslateAll && (
            <div className="mt-3">
              <Button color="secondary" onClick={onRetranslateAll} className="text-sm">
                <LanguageIcon className="h-4 w-4 mr-2" />
                Alle {outdatedTranslations.length} Übersetzungen aktualisieren
              </Button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="shrink-0 p-1 hover:bg-amber-100 rounded transition-colors"
            title="Hinweis ausblenden"
          >
            <XMarkIcon className="h-4 w-4 text-amber-600" />
          </button>
        )}
      </div>
    </div>
  );
}

export default TranslationOutdatedBanner;
