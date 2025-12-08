// src/components/campaigns/TranslationList.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import {
  LanguageIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useProjectTranslations, useDeleteTranslation } from "@/lib/hooks/useTranslations";
import { LANGUAGE_NAMES, LanguageCode } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { ProjectTranslation } from "@/types/translation";
import { toastService } from "@/lib/utils/toast";

interface TranslationListProps {
  organizationId: string;
  projectId: string;
  onTranslate: (language?: LanguageCode) => void;
  onPreview?: (translation: ProjectTranslation) => void;
  className?: string;
}

/**
 * Zeigt alle vorhandenen Übersetzungen eines Projekts an
 * mit Optionen zum Löschen, Neu-Übersetzen und Vorschau
 */
export function TranslationList({
  organizationId,
  projectId,
  onTranslate,
  onPreview,
  className = "",
}: TranslationListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectTranslation | null>(null);

  // Lade alle Übersetzungen
  const { data: translations, isLoading, refetch } = useProjectTranslations(
    organizationId,
    projectId
  );

  // Delete Mutation
  const { mutate: deleteTranslation, isPending: isDeleting } = useDeleteTranslation();

  // Löschen bestätigen
  const handleDelete = () => {
    if (!deleteConfirm) return;

    deleteTranslation(
      {
        organizationId,
        projectId,
        translationId: deleteConfirm.id,
      },
      {
        onSuccess: () => {
          toastService.success(`Übersetzung (${LANGUAGE_NAMES[deleteConfirm.language]}) gelöscht`);
          setDeleteConfirm(null);
          refetch();
        },
        onError: (error) => {
          toastService.error(`Fehler beim Löschen: ${error.message}`);
        },
      }
    );
  };

  // Formatiere Datum (FlexibleTimestamp: Date | string | Timestamp)
  const formatDate = (date: Date | string | { toDate?: () => Date } | undefined) => {
    if (!date) return "–";

    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return "–";
    }

    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  // Status Badge
  const getStatusBadge = (translation: ProjectTranslation) => {
    if (translation.isOutdated) {
      return (
        <Badge color="amber" className="flex items-center gap-1">
          <ExclamationTriangleIcon className="h-3 w-3" />
          Veraltet
        </Badge>
      );
    }

    switch (translation.status) {
      case "reviewed":
        return (
          <Badge color="blue" className="flex items-center gap-1">
            <EyeIcon className="h-3 w-3" />
            Geprüft
          </Badge>
        );
      case "approved":
        return (
          <Badge color="green" className="flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" />
            Freigegeben
          </Badge>
        );
      default:
        return (
          <Badge color="zinc" className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            Generiert
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-16 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (!translations || translations.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <LanguageIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <Text className="text-gray-600 mb-4">
          Noch keine Übersetzungen vorhanden
        </Text>
        <Button color="primary" onClick={() => onTranslate()}>
          <LanguageIcon className="h-4 w-4 mr-2" />
          Erste Übersetzung erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LanguageIcon className="h-5 w-5 text-gray-500" />
          <Text className="font-medium">
            Übersetzungen ({translations.length})
          </Text>
        </div>
        <Button color="secondary" onClick={() => onTranslate()}>
          <LanguageIcon className="h-4 w-4 mr-2" />
          Neue Übersetzung
        </Button>
      </div>

      {/* Liste */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {translations.map((translation) => (
          <div
            key={translation.id}
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            {/* Sprache & Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-[140px]">
                <LanguageFlagIcon languageCode={translation.language} className="h-4 w-6" />
                <Text className="font-medium">
                  {LANGUAGE_NAMES[translation.language] || translation.language}
                </Text>
              </div>
              {getStatusBadge(translation)}
            </div>

            {/* Meta-Infos */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="hidden sm:block">
                <span className="text-gray-400">Erstellt:</span>{" "}
                {formatDate(translation.generatedAt)}
              </div>
              {translation.modelUsed && (
                <div className="hidden md:block">
                  <Badge color="zinc" className="text-xs">
                    {translation.modelUsed}
                  </Badge>
                </div>
              )}
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2">
              {onPreview && (
                <Button
                  plain
                  onClick={() => onPreview(translation)}
                  title="Vorschau"
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>
              )}
              <Button
                plain
                onClick={() => onTranslate(translation.language)}
                title="Neu übersetzen"
                className="text-blue-600 hover:text-blue-800"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
              <Button
                plain
                onClick={() => setDeleteConfirm(translation)}
                title="Löschen"
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Outdated-Hinweis falls vorhanden */}
      {translations.some((t) => t.isOutdated) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <Text className="text-sm font-medium text-amber-800">
              Veraltete Übersetzungen
            </Text>
            <Text className="text-sm text-amber-700 mt-1">
              Das Original wurde geändert. Klicke auf den Aktualisieren-Button
              bei der jeweiligen Sprache, um die Übersetzung zu erneuern.
            </Text>
          </div>
        </div>
      )}

      {/* Löschen-Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        size="sm"
      >
        <DialogTitle>Übersetzung löschen?</DialogTitle>
        <DialogBody>
          <Text className="text-gray-700">
            Möchtest du die{" "}
            <strong>
              {deleteConfirm && LANGUAGE_NAMES[deleteConfirm.language]}
            </strong>{" "}
            Übersetzung wirklich löschen?
          </Text>
          <Text className="text-sm text-gray-500 mt-2">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Text>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button color="primary" className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Löschen...
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4 mr-2" />
                Löschen
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default TranslationList;
