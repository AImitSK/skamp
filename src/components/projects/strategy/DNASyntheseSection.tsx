'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { DnaIcon } from '@/components/icons/DnaIcon';
import { StatusCircles } from '@/components/marken-dna/StatusCircles';
import { DNASyntheseRenderer } from '@/components/marken-dna/DNASyntheseRenderer';
import { DNASyntheseEditorModal } from '@/components/marken-dna/DNASyntheseEditorModal';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CompanyMarkenDNAStatus } from '@/types/marken-dna';
import clsx from 'clsx';

interface DNASynthese {
  id: string;
  content: string;
  plainText?: string;
  synthesizedAt?: { seconds: number };
  createdAt: any;
  updatedAt: any;
}

interface DNASyntheseSectionProps {
  projectId: string;
  companyId: string;
  companyName: string;
  dnaSynthese?: DNASynthese | null;
  canSynthesize: boolean;
  markenDNAStatus?: CompanyMarkenDNAStatus;
  isOutdated?: boolean;
  onSynthesize?: () => void;
  onDelete?: () => void;
  onEdit?: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export function DNASyntheseSection({
  projectId,
  companyId,
  companyName,
  dnaSynthese,
  canSynthesize,
  markenDNAStatus,
  isOutdated = false,
  onSynthesize,
  onDelete,
  onEdit,
  isLoading = false,
}: DNASyntheseSectionProps) {
  const t = useTranslations('markenDNA');
  const router = useRouter();

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Click-Outside Handler für Menü
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideMenu = target.closest('[data-menu]') !== null;
      if (!isInsideMenu) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Token-Anzahl berechnen
  const tokenCount = dnaSynthese?.plainText
    ? Math.ceil(dnaSynthese.plainText.length / 4)
    : 0;

  // Erstellungsdatum formatieren
  const createdDate = dnaSynthese?.synthesizedAt?.seconds
    ? new Date(dnaSynthese.synthesizedAt.seconds * 1000).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleSynthesizeClick = () => {
    if (onSynthesize) {
      onSynthesize();
    }
  };

  const handleDeleteClick = () => {
    setIsMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  const handleEditClick = () => {
    setIsMenuOpen(false);
    setIsEditorOpen(true);
  };

  const handleSaveEdit = async (content: string) => {
    if (onEdit) {
      await onEdit(content);
    }
    setIsEditorOpen(false);
  };

  const handleCompleteMarkenDNA = () => {
    router.push(`/dashboard/library/marken-dna/${companyId}`);
  };

  // Wenn keine Synthese vorhanden ist
  if (!dnaSynthese) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-purple-50/50 to-white">
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DnaIcon className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                DNA Synthese
              </h3>
            </div>

            <div className="flex-1" />

            {/* Rechts: Status + Button */}
            <div className="flex items-center gap-3">
              {canSynthesize ? (
                <Button
                  onClick={handleSynthesizeClick}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Synthetisieren
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {markenDNAStatus && (
                    <StatusCircles documents={markenDNAStatus.documents} size="sm" />
                  )}
                  <Button
                    onClick={handleCompleteMarkenDNA}
                    className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-sm"
                  >
                    Marken-DNA vervollständigen
                  </Button>
                </>
              )}
            </div>
          </div>

          {!canSynthesize && (
            <p className="mt-3 text-sm text-zinc-500 ml-14">
              Alle 6 Dokumente der Marken-DNA werden benötigt, um eine Synthese zu erstellen.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Synthese vorhanden - kompaktes Layout
  return (
    <>
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-purple-50/50 to-white">
          {/* Kompakte Zeile */}
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel + Datum */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <DnaIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-zinc-900">
                  DNA Synthese
                </h3>
                {createdDate && (
                  <p className="text-xs text-zinc-500">
                    Erstellt: {createdDate}
                  </p>
                )}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Rechts: Token-Toggle + 3-Punkte-Menü */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Token-Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={clsx(
                  'h-9 flex items-center gap-2 px-3 rounded-lg transition-all',
                  'border border-purple-200 hover:border-purple-300',
                  isExpanded ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                )}
              >
                <span className="text-xs text-purple-600 whitespace-nowrap">
                  ~{tokenCount} Tokens
                </span>
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-purple-600" />
                )}
              </button>
              {/* 3-Punkte-Menü */}
              <div className="relative" data-menu>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <EllipsisVerticalIcon className="h-4 w-4 text-purple-600" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSynthesizeClick();
                      }}
                      disabled={!canSynthesize || isLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Neu generieren
                    </button>
                    <button
                      onClick={handleEditClick}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandierter Inhalt */}
          <div
            className={clsx(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            )}
          >
            <div className="bg-white rounded-lg border border-purple-200 p-5">
              <DNASyntheseRenderer content={dnaSynthese.plainText || ''} />
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <DNASyntheseEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={dnaSynthese.plainText || ''}
        onSave={handleSaveEdit}
      />

      {/* Lösch-Bestätigung */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
      >
        <DialogTitle>DNA Synthese löschen</DialogTitle>
        <DialogBody>
          <p className="text-zinc-600">
            Möchtest du die DNA Synthese wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteConfirm(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
