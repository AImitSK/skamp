// src/components/campaigns/TranslationModal.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Select } from "@/components/ui/select";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/fieldset";
import {
  LanguageIcon,
  BookOpenIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useGlossaryEntries } from "@/lib/hooks/useGlossary";
import { useAvailableLanguages } from "@/lib/hooks/useTranslations";
import { LanguageCode, LANGUAGE_NAMES } from "@/types/international";
import { CustomerGlossaryEntry } from "@/types/glossary";

// Alert Component
function Alert({
  type = "info",
  title,
  message,
}: {
  type?: "info" | "error" | "success";
  title?: string;
  message: string;
}) {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-700 border-green-200",
  };

  const Icon =
    type === "error"
      ? ExclamationTriangleIcon
      : type === "success"
        ? CheckCircleIcon
        : InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 border ${styles[type]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="ml-3">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={`text-sm ${title ? "mt-1" : ""}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Verfügbare Sprachen für Übersetzung
const AVAILABLE_TARGET_LANGUAGES: LanguageCode[] = [
  "en",
  "fr",
  "es",
  "it",
  "nl",
  "pl",
  "pt",
  "cs",
  "da",
  "sv",
  "no",
  "fi",
  "hu",
  "ro",
  "bg",
  "el",
  "tr",
  "ru",
  "zh",
  "ja",
  "ko",
  "ar",
];

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (params: {
    targetLanguage: LanguageCode;
    useGlossary: boolean;
    tone: "formal" | "professional" | "neutral";
  }) => Promise<void>;
  organizationId: string;
  projectId: string;
  customerId?: string;
  sourceLanguage: LanguageCode;
  contentLanguages?: {
    primary: string;
    additional: string[];
  };
  /** Vorausgewählte Sprache (z.B. beim Neu-Übersetzen) */
  preselectedLanguage?: LanguageCode;
}

export function TranslationModal({
  isOpen,
  onClose,
  onTranslate,
  organizationId,
  projectId,
  customerId,
  sourceLanguage,
  contentLanguages,
  preselectedLanguage,
}: TranslationModalProps) {
  // State
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>("en");
  const [useGlossary, setUseGlossary] = useState(true);
  const [tone, setTone] = useState<"formal" | "professional" | "neutral">("professional");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lade Glossar-Einträge (für Anzeige)
  const { data: glossaryEntries } = useGlossaryEntries(organizationId, {
    customerId,
    approvedOnly: true,
  });

  // Lade bereits vorhandene Übersetzungen
  const { data: existingLanguages } = useAvailableLanguages(organizationId, projectId);

  // Filtere verfügbare Sprachen basierend auf contentLanguages (memoized)
  const availableLanguages = useMemo(() => {
    const allowedLanguages = contentLanguages?.additional || AVAILABLE_TARGET_LANGUAGES;
    return AVAILABLE_TARGET_LANGUAGES.filter(
      (lang) =>
        lang !== sourceLanguage &&
        (allowedLanguages.includes(lang) || allowedLanguages.length === 0)
    );
  }, [sourceLanguage, contentLanguages]);

  // Zähle relevante Glossar-Einträge (mit Quell- und Zielsprache)
  const relevantGlossaryCount =
    glossaryEntries?.filter(
      (entry: CustomerGlossaryEntry) => entry.translations[sourceLanguage] && entry.translations[targetLanguage]
    ).length || 0;

  // Track ob das Modal gerade geöffnet wurde
  const wasOpenRef = useRef(false);

  // Reset nur beim initialen Öffnen
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Modal wurde gerade geöffnet - Reset
      wasOpenRef.current = true;
      setError(null);
      setSuccess(false);
      setIsTranslating(false);

      // Vorausgewählte Sprache setzen falls vorhanden
      if (preselectedLanguage && availableLanguages.includes(preselectedLanguage)) {
        setTargetLanguage(preselectedLanguage);
      }
      // Sonst erste verfügbare Sprache vorauswählen
      else if (availableLanguages.length > 0 && !availableLanguages.includes(targetLanguage)) {
        setTargetLanguage(availableLanguages[0]);
      }
    } else if (!isOpen) {
      // Modal wurde geschlossen
      wasOpenRef.current = false;
    }
  }, [isOpen, availableLanguages, targetLanguage, preselectedLanguage]);

  // Übersetzung starten
  const handleTranslate = async () => {
    setIsTranslating(true);
    setError(null);
    setSuccess(false);

    try {
      await onTranslate({
        targetLanguage,
        useGlossary,
        tone,
      });
      setSuccess(true);
      // Modal nach 2 Sekunden schließen
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Fehler bei der Übersetzung");
    } finally {
      setIsTranslating(false);
    }
  };

  // Prüfe ob Sprache bereits übersetzt wurde
  const isAlreadyTranslated = existingLanguages?.includes(targetLanguage);

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>
        <div className="flex items-center gap-2">
          <LanguageIcon className="h-5 w-5 text-primary-600" />
          Pressemitteilung übersetzen
        </div>
      </DialogTitle>

      <DialogBody>
        <div className="space-y-6">
          {/* Erfolgs-Nachricht */}
          {success && (
            <Alert
              type="success"
              title="Übersetzung erfolgreich!"
              message="Die Pressemitteilung wurde erfolgreich übersetzt und gespeichert."
            />
          )}

          {/* Fehler-Nachricht */}
          {error && <Alert type="error" title="Fehler" message={error} />}

          {/* Quellsprache Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm text-gray-600 mb-1">Quellsprache</Text>
            <Text className="font-medium">{LANGUAGE_NAMES[sourceLanguage] || sourceLanguage}</Text>
          </div>

          {/* Zielsprache Auswahl */}
          <div>
            <Text className="text-sm font-medium text-gray-900 mb-2 block">Zielsprache</Text>
            <Select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as LanguageCode)}
              disabled={isTranslating || success}
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NAMES[lang] || lang}
                  {existingLanguages?.includes(lang) ? " (bereits vorhanden)" : ""}
                </option>
              ))}
            </Select>

            {isAlreadyTranslated && (
              <Text className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Diese Sprache wurde bereits übersetzt. Eine neue Übersetzung ersetzt die vorhandene.
              </Text>
            )}
          </div>

          {/* Glossar Option */}
          {customerId && (
            <div className="border rounded-lg p-4">
              <CheckboxField>
                <Checkbox
                  checked={useGlossary}
                  onChange={(checked) => setUseGlossary(checked)}
                  disabled={isTranslating || success}
                />
                <Label className="flex items-center gap-2">
                  <BookOpenIcon className="h-4 w-4" />
                  Kundenspezifisches Glossar verwenden
                </Label>
              </CheckboxField>

              {useGlossary && (
                <div className="mt-3 pl-6">
                  <div className="flex items-center gap-2">
                    <Badge color={relevantGlossaryCount > 0 ? "green" : "zinc"}>
                      {relevantGlossaryCount} Einträge
                    </Badge>
                    <Text className="text-sm text-gray-600">
                      verfügbar für {LANGUAGE_NAMES[sourceLanguage]} → {LANGUAGE_NAMES[targetLanguage]}
                    </Text>
                  </div>
                  {relevantGlossaryCount === 0 && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Keine Glossar-Einträge für diese Sprachkombination vorhanden.
                    </Text>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tonalität Auswahl */}
          <div>
            <Text className="text-sm font-medium text-gray-900 mb-2 block">Tonalität</Text>
            <Select
              value={tone}
              onChange={(e) => setTone(e.target.value as "formal" | "professional" | "neutral")}
              disabled={isTranslating || success}
            >
              <option value="professional">Professionell (Standard)</option>
              <option value="formal">Formell</option>
              <option value="neutral">Neutral</option>
            </Select>
            <Text className="text-xs text-gray-500 mt-1">
              {tone === "professional" && "Geschäftssprache, kompetent und seriös aber zugänglich."}
              {tone === "formal" && "Formelle, distanzierte Sprache. Keine Umgangssprache."}
              {tone === "neutral" && "Sachliche Sprache ohne emotionale Färbung."}
            </Text>
          </div>

          {/* KI-Hinweis */}
          <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
            <SparklesIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <Text className="text-sm font-medium text-blue-900">KI-gestützte Übersetzung</Text>
              <Text className="text-sm text-blue-700 mt-1">
                Die Übersetzung wird von Gemini AI erstellt. HTML-Formatierungen, Eigennamen und
                Glossar-Begriffe werden automatisch berücksichtigt.
              </Text>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={isTranslating}>
          Abbrechen
        </Button>
        <Button
          color="primary"
          onClick={handleTranslate}
          disabled={isTranslating || success || availableLanguages.length === 0}
        >
          {isTranslating ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Übersetze...
            </>
          ) : success ? (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Fertig
            </>
          ) : (
            <>
              <LanguageIcon className="h-4 w-4 mr-2" />
              Übersetzen
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TranslationModal;
