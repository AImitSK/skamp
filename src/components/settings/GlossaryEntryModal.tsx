// src/components/settings/GlossaryEntryModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CustomerGlossaryEntry, CreateGlossaryEntryInput } from "@/types/glossary";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { LANGUAGE_NAMES, LanguageCode } from "@/types/international";

// Verfügbare Sprachen für Übersetzungen
const AVAILABLE_LANGUAGES: LanguageCode[] = [
  "en", "fr", "es", "it", "nl", "pl", "pt", "cs", "da", "sv",
  "no", "fi", "hu", "ro", "bg", "el", "tr", "ru", "zh", "ja", "ko", "ar"
];

interface GlossaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateGlossaryEntryInput) => Promise<void>;
  entry?: CustomerGlossaryEntry | null; // Für Bearbeitung
  customers: Array<{ id: string; name: string }>;
  defaultCustomerId?: string;
}

export function GlossaryEntryModal({
  isOpen,
  onClose,
  onSave,
  entry,
  customers,
  defaultCustomerId,
}: GlossaryEntryModalProps) {
  const isEditing = !!entry;

  // Form State
  const [customerId, setCustomerId] = useState<string>("");
  const [germanTerm, setGermanTerm] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [context, setContext] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Neue Sprache hinzufügen
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Reset/Load beim Öffnen
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        // Bearbeiten-Modus
        setCustomerId(entry.customerId);
        setGermanTerm(entry.translations.de || "");
        // Alle Übersetzungen außer Deutsch
        const otherTranslations: Record<string, string> = {};
        Object.entries(entry.translations).forEach(([lang, term]) => {
          if (lang !== "de") {
            otherTranslations[lang] = term;
          }
        });
        setTranslations(otherTranslations);
        setContext(entry.context || "");
      } else {
        // Neu-Modus
        setCustomerId(defaultCustomerId || "");
        setGermanTerm("");
        setTranslations({});
        setContext("");
      }
      setError(null);
      setShowLanguageSelector(false);
    }
  }, [isOpen, entry, defaultCustomerId]);

  // Sprache hinzufügen
  const handleAddLanguage = (lang: LanguageCode) => {
    setTranslations(prev => ({ ...prev, [lang]: "" }));
    setShowLanguageSelector(false);
  };

  // Sprache entfernen
  const handleRemoveLanguage = (lang: string) => {
    setTranslations(prev => {
      const newTranslations = { ...prev };
      delete newTranslations[lang];
      return newTranslations;
    });
  };

  // Übersetzung aktualisieren
  const handleTranslationChange = (lang: string, value: string) => {
    setTranslations(prev => ({ ...prev, [lang]: value }));
  };

  // Speichern
  const handleSave = async () => {
    // Validierung
    if (!customerId) {
      setError("Bitte wählen Sie einen Kunden aus");
      return;
    }
    if (!germanTerm.trim()) {
      setError("Der deutsche Begriff ist erforderlich");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input: CreateGlossaryEntryInput = {
        customerId,
        translations: {
          de: germanTerm.trim(),
          ...Object.fromEntries(
            Object.entries(translations)
              .filter(([, value]) => value.trim())
              .map(([lang, value]) => [lang, value.trim()])
          ),
        },
        context: context.trim() || undefined,
      };

      await onSave(input);
      onClose();
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // Verfügbare Sprachen (noch nicht hinzugefügt)
  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    lang => !translations.hasOwnProperty(lang)
  );

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-[#005fab]" />
          {isEditing ? "Glossar-Eintrag bearbeiten" : "Neuer Glossar-Eintrag"}
        </div>
      </DialogTitle>

      <DialogBody>
        <div className="space-y-5">
          {/* Fehler */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <Text className="text-sm text-red-700">{error}</Text>
            </div>
          )}

          {/* Kunde */}
          <Field>
            <Label>Kunde *</Label>
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={saving || isEditing}
            >
              <option value="">Kunde auswählen...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Deutscher Begriff */}
          <Field>
            <Label>Begriff (Deutsch) *</Label>
            <Input
              value={germanTerm}
              onChange={(e) => setGermanTerm(e.target.value)}
              placeholder="z.B. Spannwelle"
              disabled={saving}
            />
          </Field>

          {/* Übersetzungen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Übersetzungen</Label>
              <Badge color="purple" className="text-xs">
                <SparklesIcon className="h-3 w-3 mr-1" />
                Für KI-Übersetzung
              </Badge>
            </div>

            <div className="space-y-3">
              {Object.entries(translations).map(([lang, value]) => (
                <div key={lang} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <LanguageFlagIcon languageCode={lang as LanguageCode} />
                    <span className="text-sm font-medium">
                      {LANGUAGE_NAMES[lang as LanguageCode] || lang}
                    </span>
                  </div>
                  <Input
                    value={value}
                    onChange={(e) => handleTranslationChange(lang, e.target.value)}
                    placeholder={`Übersetzung auf ${LANGUAGE_NAMES[lang as LanguageCode] || lang}`}
                    disabled={saving}
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleRemoveLanguage(lang)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    disabled={saving}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Sprache hinzufügen */}
              {showLanguageSelector ? (
                <div className="flex items-center gap-2">
                  <Select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddLanguage(e.target.value as LanguageCode);
                      }
                    }}
                    className="flex-1"
                  >
                    <option value="">Sprache auswählen...</option>
                    {availableToAdd.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_NAMES[lang] || lang}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => setShowLanguageSelector(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLanguageSelector(true)}
                  className="inline-flex items-center px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                  disabled={saving || availableToAdd.length === 0}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Sprache hinzufügen
                </button>
              )}
            </div>
          </div>

          {/* Kontext */}
          <Field>
            <Label>Kontext (optional)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="z.B. Drucktechnik, Rollenoffset - hilft der KI bei der korrekten Verwendung"
              disabled={saving}
              rows={2}
            />
          </Field>

          {/* Info */}
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
            <div className="flex gap-2">
              <SparklesIcon className="h-5 w-5 text-purple-500 shrink-0" />
              <Text className="text-sm text-purple-700">
                Glossar-Einträge werden bei KI-Übersetzungen automatisch berücksichtigt.
                Der Begriff wird exakt so übersetzt, wie hier definiert.
              </Text>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button
          color="primary"
          onClick={handleSave}
          disabled={saving || !customerId || !germanTerm.trim()}
        >
          {saving ? "Speichern..." : isEditing ? "Speichern" : "Erstellen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GlossaryEntryModal;
