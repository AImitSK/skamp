// src/components/campaigns/TranslationButton.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import {
  LanguageIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useProjectTranslations, useTranslationSummary } from "@/lib/hooks/useTranslations";
import { LanguageCode, LANGUAGE_NAMES } from "@/types/international";
import { TranslationStatus } from "@/types/translation";
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

// Status-Badge Komponente
function TranslationStatusBadge({ status, isOutdated }: { status: TranslationStatus; isOutdated: boolean }) {
  if (isOutdated) {
    return (
      <Badge color="amber" className="text-xs">
        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
        Veraltet
      </Badge>
    );
  }

  switch (status) {
    case "generated":
      return (
        <Badge color="blue" className="text-xs">
          <ClockIcon className="h-3 w-3 mr-1" />
          Generiert
        </Badge>
      );
    case "reviewed":
      return (
        <Badge color="green" className="text-xs">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Geprüft
        </Badge>
      );
    case "approved":
      return (
        <Badge color="green" className="text-xs">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Freigegeben
        </Badge>
      );
    default:
      return null;
  }
}

// Flaggen-Icon Komponente
function FlagIcon({ languageCode, className }: { languageCode: string; className?: string }) {
  const countryCode = LANGUAGE_TO_COUNTRY[languageCode.toLowerCase()] || languageCode.toUpperCase();

  // Verwende Unicode Regional Indicator Symbols für Flaggen
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

// Tooltip für Übersetzungs-Details
function TranslationTooltip({
  isVisible,
  position,
  translations,
  onMouseEnter,
  onMouseLeave,
}: {
  isVisible: boolean;
  position: { top: number; left: number };
  translations: Array<{
    language: LanguageCode;
    status: TranslationStatus;
    isOutdated: boolean;
    generatedAt?: Date;
  }>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  if (!isVisible || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-4 min-w-64">
        <Text className="font-semibold text-sm mb-3">Verfügbare Übersetzungen</Text>
        <div className="space-y-2">
          {translations.map((t) => (
            <div key={t.language} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlagIcon languageCode={t.language} />
                <Text className="text-sm">{LANGUAGE_NAMES[t.language] || t.language}</Text>
              </div>
              <TranslationStatusBadge status={t.status} isOutdated={t.isOutdated} />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface TranslationButtonProps {
  organizationId: string;
  projectId: string;
  onTranslate: () => void;
  onViewTranslation?: (language: LanguageCode) => void;
  className?: string;
  showTooltip?: boolean;
  compact?: boolean;
}

export function TranslationButton({
  organizationId,
  projectId,
  onTranslate,
  onViewTranslation,
  className,
  showTooltip = true,
  compact = false,
}: TranslationButtonProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  // Lade Übersetzungen
  const { data: translations, isLoading } = useProjectTranslations(organizationId, projectId);
  const { data: summary } = useTranslationSummary(organizationId, projectId);

  const hasTranslations = translations && translations.length > 0;
  const outdatedCount = summary?.outdatedCount || 0;

  // Tooltip-Positionierung
  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;

    setTooltipPosition({
      top: rect.bottom + scrollY + 8,
      left: rect.left,
    });
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (showTooltip && hasTranslations) {
      calculatePosition();
      setIsTooltipVisible(true);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Kompakte Ansicht (nur Flaggen)
  if (compact) {
    return (
      <div ref={buttonRef} className={clsx("flex items-center gap-1", className)}>
        {hasTranslations ? (
          <>
            <div
              className="flex items-center gap-0.5 cursor-pointer"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {translations.slice(0, 3).map((t) => (
                <FlagIcon
                  key={t.language}
                  languageCode={t.language}
                  className={clsx(
                    "cursor-pointer hover:scale-110 transition-transform",
                    t.isOutdated && "opacity-60"
                  )}
                />
              ))}
              {translations.length > 3 && (
                <Text className="text-xs text-gray-500 ml-1">+{translations.length - 3}</Text>
              )}
            </div>
            {outdatedCount > 0 && (
              <Badge color="amber" className="text-xs ml-1">
                {outdatedCount}
              </Badge>
            )}
          </>
        ) : (
          <Button plain onClick={onTranslate} className="p-1">
            <LanguageIcon className="h-4 w-4 text-gray-400" />
          </Button>
        )}

        {showTooltip && (
          <TranslationTooltip
            isVisible={isTooltipVisible}
            position={tooltipPosition}
            translations={translations?.map(t => ({
              language: t.language,
              status: t.status,
              isOutdated: t.isOutdated,
              generatedAt: t.generatedAt instanceof Date ? t.generatedAt : undefined,
            })) || []}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </div>
    );
  }

  // Vollständige Ansicht
  return (
    <div ref={buttonRef} className={clsx("flex items-center gap-2", className)}>
      {/* Vorhandene Übersetzungen */}
      {hasTranslations && (
        <div
          className="flex items-center gap-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {translations.slice(0, 4).map((t) => (
            <button
              key={t.language}
              onClick={() => onViewTranslation?.(t.language)}
              className={clsx(
                "p-1 rounded hover:bg-gray-100 transition-colors",
                t.isOutdated && "ring-2 ring-amber-300"
              )}
              title={`${LANGUAGE_NAMES[t.language] || t.language}${t.isOutdated ? " (veraltet)" : ""}`}
            >
              <FlagIcon languageCode={t.language} />
            </button>
          ))}
          {translations.length > 4 && (
            <Text className="text-xs text-gray-500">+{translations.length - 4}</Text>
          )}
        </div>
      )}

      {/* Outdated-Warnung */}
      {outdatedCount > 0 && (
        <Badge color="amber" className="text-xs">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          {outdatedCount} veraltet
        </Badge>
      )}

      {/* Neue Übersetzung Button */}
      <Button
        color="secondary"
        onClick={onTranslate}
        disabled={isLoading}
        className="text-sm"
      >
        <LanguageIcon className="h-4 w-4 mr-1" />
        {hasTranslations ? (
          <PlusIcon className="h-3 w-3" />
        ) : (
          "Übersetzen"
        )}
      </Button>

      {/* Tooltip */}
      {showTooltip && (
        <TranslationTooltip
          isVisible={isTooltipVisible}
          position={tooltipPosition}
          translations={translations?.map(t => ({
            language: t.language,
            status: t.status,
            isOutdated: t.isOutdated,
            generatedAt: t.generatedAt instanceof Date ? t.generatedAt : undefined,
          })) || []}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
}

export default TranslationButton;
