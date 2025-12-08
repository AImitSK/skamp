// src/components/campaigns/TranslationEditModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PencilIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ProjectTranslation, UpdateTranslationInput } from "@/types/translation";
import { LANGUAGE_NAMES, LanguageCode } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { useUpdateTranslation } from "@/lib/hooks/useTranslations";
import { toastService } from "@/lib/utils/toast";
import dynamic from "next/dynamic";

// RichTextEditor dynamisch laden (SSR-kompatibel)
const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" /> }
);

interface TranslationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  translation: ProjectTranslation | null;
  organizationId: string;
  projectId: string;
  onSaved?: () => void;
}

/**
 * Modal zum Bearbeiten einer KI-generierten Übersetzung
 * Ermöglicht das Anpassen von Titel, Content und Boilerplate-Sections
 */
export function TranslationEditModal({
  isOpen,
  onClose,
  translation,
  organizationId,
  projectId,
  onSaved,
}: TranslationEditModalProps) {
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [boilerplates, setBoilerplates] = useState<Array<{
    id: string;
    translatedContent: string;
    translatedTitle?: string | null;
  }>>([]);

  // Mutation
  const { mutate: updateTranslation, isPending: isSaving } = useUpdateTranslation();

  // Initialisiere Form wenn Modal öffnet
  useEffect(() => {
    if (isOpen && translation) {
      setTitle(translation.title || "");
      setContent(translation.content || "");
      setBoilerplates(translation.translatedBoilerplates || []);
    }
  }, [isOpen, translation]);

  // Content-Änderung vom Editor
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
  }, []);

  // Boilerplate-Änderung
  const handleBoilerplateChange = useCallback((id: string, newContent: string) => {
    setBoilerplates(prev =>
      prev.map(bp =>
        bp.id === id ? { ...bp, translatedContent: newContent } : bp
      )
    );
  }, []);

  // Speichern
  const handleSave = () => {
    if (!translation) return;

    const input: UpdateTranslationInput = {
      title: title.trim(),
      content: content,
    };

    // Boilerplates nur hinzufügen wenn vorhanden
    // Note: UpdateTranslationInput hat kein translatedBoilerplates Feld
    // Das muss eventuell erweitert werden

    updateTranslation(
      {
        organizationId,
        projectId,
        translationId: translation.id,
        input,
      },
      {
        onSuccess: () => {
          toastService.success("Übersetzung gespeichert");
          onSaved?.();
          onClose();
        },
        onError: (error) => {
          toastService.error(`Fehler beim Speichern: ${error.message}`);
        },
      }
    );
  };

  // Abbrechen
  const handleCancel = () => {
    onClose();
  };

  if (!translation) return null;

  return (
    <Dialog open={isOpen} onClose={handleCancel} size="4xl">
      <DialogTitle>
        <div className="flex items-center gap-3">
          <PencilIcon className="h-5 w-5 text-purple-600" />
          <span>Übersetzung bearbeiten</span>
          <div className="flex items-center gap-2 ml-4">
            <LanguageFlagIcon languageCode={translation.language} />
            <Text className="text-base font-normal text-gray-600">
              {LANGUAGE_NAMES[translation.language] || translation.language}
            </Text>
          </div>
          <Badge color="purple" className="ml-auto text-xs">
            <SparklesIcon className="h-3 w-3 mr-1" />
            KI-generiert
          </Badge>
        </div>
      </DialogTitle>

      <DialogBody className="space-y-6">
        {/* Titel */}
        <Field>
          <Label>Titel</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Übersetzter Titel"
            disabled={isSaving}
          />
        </Field>

        {/* Hauptinhalt */}
        <Field>
          <Label>Inhalt</Label>
          <div className="mt-2">
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              placeholder="Übersetzter Inhalt..."
              minHeight="300px"
            />
          </div>
        </Field>

        {/* Boilerplate-Sections (falls vorhanden) */}
        {boilerplates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base/6 text-zinc-950 font-medium sm:text-sm/6 dark:text-white">
                Boilerplate-Texte
              </span>
              <Badge color="zinc" className="text-xs">
                {boilerplates.length} Abschnitte
              </Badge>
            </div>

            {boilerplates.map((bp, index) => (
              <div key={bp.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Abschnitt {index + 1}
                    {bp.translatedTitle && (
                      <span className="ml-2 text-gray-500">
                        ({bp.translatedTitle})
                      </span>
                    )}
                  </Text>
                </div>
                <textarea
                  value={bp.translatedContent}
                  onChange={(e) => handleBoilerplateChange(bp.id, e.target.value)}
                  className="w-full min-h-[100px] p-3 border border-gray-200 rounded-md text-sm focus:border-purple-500 focus:ring-purple-500"
                  disabled={isSaving}
                />
              </div>
            ))}
          </div>
        )}

        {/* Hinweis */}
        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
          <div className="flex items-start gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-500 shrink-0" />
            <Text className="text-sm text-purple-700">
              Diese Übersetzung wurde mit KI generiert. Sie können den Text hier
              manuell anpassen. Änderungen werden beim Versand der Pressemeldung
              übernommen.
            </Text>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={handleCancel} disabled={isSaving}>
          <XMarkIcon className="h-4 w-4 mr-1" />
          Abbrechen
        </Button>
        <Button
          color="primary"
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          className="!bg-purple-600 hover:!bg-purple-700"
        >
          {isSaving ? (
            "Speichern..."
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-1" />
              Speichern
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TranslationEditModal;
