// src/components/campaigns/TranslationList.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import {
  LanguageIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useProjectTranslations, useDeleteTranslation } from "@/lib/hooks/useTranslations";
import { LANGUAGE_NAMES, LanguageCode } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { ProjectTranslation } from "@/types/translation";
import { toastService } from "@/lib/utils/toast";
import { TranslationEditModal } from "./TranslationEditModal";

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
  const [editingTranslation, setEditingTranslation] = useState<ProjectTranslation | null>(null);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);

  // Lade alle Übersetzungen
  const { data: translations, isLoading, refetch } = useProjectTranslations(
    organizationId,
    projectId
  );

  // Delete Mutation
  const { mutate: deleteTranslation, isPending: isDeleting } = useDeleteTranslation();

  // PDF-Vorschau generieren und öffnen
  const handleGeneratePdf = async (translation: ProjectTranslation) => {
    setGeneratingPdfFor(translation.id);

    try {
      // Boilerplates für PDF vorbereiten
      const boilerplateSections = (translation.translatedBoilerplates || []).map(bp => ({
        id: bp.id,
        customTitle: bp.translatedTitle || '',
        content: bp.translatedContent || ''
      }));

      // Dateiname generieren
      const fileName = `${translation.title.replace(/[^a-zA-Z0-9]/g, '_')}_${translation.language.toUpperCase()}.pdf`;

      // PDF via API generieren
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: `translation_${translation.id}`,
          organizationId,
          title: translation.title,
          mainContent: translation.content,
          boilerplateSections,
          clientName: 'Vorschau',
          userId: 'preview-user',
          fileName,
          options: {
            format: 'A4',
            orientation: 'portrait',
            printBackground: true,
            waitUntil: 'networkidle0'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF-Generierung fehlgeschlagen: ${errorText}`);
      }

      const result = await response.json();

      if (result.pdfUrl) {
        // PDF in neuem Tab öffnen
        window.open(result.pdfUrl, '_blank');
        toastService.success(`PDF für ${LANGUAGE_NAMES[translation.language]} geöffnet`);
      } else if (result.pdfBase64) {
        // Fallback: Base64 als Blob öffnen
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        toastService.success(`PDF für ${LANGUAGE_NAMES[translation.language]} geöffnet`);
      } else {
        throw new Error('Keine PDF-Daten erhalten');
      }
    } catch (error: any) {
      console.error('PDF-Generierung fehlgeschlagen:', error);
      toastService.error(error.message || 'PDF-Generierung fehlgeschlagen');
    } finally {
      setGeneratingPdfFor(null);
    }
  };

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
                <LanguageFlagIcon languageCode={translation.language} />
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

            {/* Aktionen - Dropdown-Menü */}
            <div className="ml-4">
              <Dropdown>
                <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                  {generatingPdfFor === translation.id ? (
                    <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin" />
                  ) : (
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 stroke-[2.5]" />
                  )}
                </DropdownButton>

                <DropdownMenu anchor="bottom end">
                  <DropdownItem
                    onClick={() => handleGeneratePdf(translation)}
                    disabled={generatingPdfFor === translation.id}
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    {generatingPdfFor === translation.id ? 'Generiere PDF...' : 'Vorschau PDF'}
                  </DropdownItem>
                  <DropdownItem onClick={() => setEditingTranslation(translation)}>
                    <PencilIcon className="h-4 w-4" />
                    Bearbeiten
                  </DropdownItem>
                  <DropdownItem onClick={() => onTranslate(translation.language)}>
                    <ArrowPathIcon className="h-4 w-4" />
                    Neu übersetzen
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem onClick={() => setDeleteConfirm(translation)}>
                    <TrashIcon className="h-4 w-4" />
                    <span className="text-red-600">Löschen</span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
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

      {/* Edit-Modal */}
      <TranslationEditModal
        isOpen={!!editingTranslation}
        onClose={() => setEditingTranslation(null)}
        translation={editingTranslation}
        organizationId={organizationId}
        projectId={projectId}
        onSaved={() => {
          refetch();
          setEditingTranslation(null);
        }}
      />
    </div>
  );
}

export default TranslationList;
