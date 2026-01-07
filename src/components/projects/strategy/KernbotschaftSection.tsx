'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KernbotschaftRenderer } from './KernbotschaftRenderer';
import { KernbotschaftEditorModal } from './KernbotschaftEditorModal';
import clsx from 'clsx';

interface Kernbotschaft {
  id: string;
  content: string;
  plainText?: string;
  status: 'draft' | 'completed';
  occasion?: string;
  goal?: string;
  keyMessage?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface KernbotschaftSectionProps {
  projectId: string;
  companyId: string;
  kernbotschaft?: Kernbotschaft | null;
  hasDNASynthese: boolean;
  onOpenChat: () => void;
  onEdit?: (content: string) => Promise<void>;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function KernbotschaftSection({
  projectId,
  companyId,
  kernbotschaft,
  hasDNASynthese,
  onOpenChat,
  onEdit,
  onDelete,
  isLoading = false,
}: KernbotschaftSectionProps) {
  const t = useTranslations('markenDNA');

  // UI State - Default eingeklappt
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Click-Outside Handler für Menü
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideMenu = target.closest('[data-menu-kernbotschaft]') !== null;
      if (!isInsideMenu) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status-Text (Aufwärtskompatibilität: wenn Inhalt vorhanden, als fertig behandeln)
  const isCompleted = kernbotschaft?.status === 'completed' ||
    (kernbotschaft?.content && kernbotschaft.content.length > 100);
  const statusText = isCompleted ? 'Fertig' : 'Entwurf';

  // Token-Anzahl berechnen
  const tokenCount = kernbotschaft?.plainText
    ? Math.ceil(kernbotschaft.plainText.length / 4)
    : kernbotschaft?.content
    ? Math.ceil(kernbotschaft.content.length / 4)
    : 0;

  // Erstellungsdatum formatieren
  const createdDate = kernbotschaft?.createdAt?.seconds
    ? new Date(kernbotschaft.createdAt.seconds * 1000).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

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

  // Wenn keine DNA Synthese vorhanden ist - Hinweis anzeigen
  if (!hasDNASynthese) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel + Beschreibung */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-zinc-900">
                  Kernbotschaft
                </h3>
                <p className="text-xs text-zinc-500">
                  Erstelle zuerst eine DNA Synthese, um die Kernbotschaft zu generieren.
                </p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Rechts: Inaktiver Button */}
            <Button
              disabled
              className="border border-zinc-300 bg-zinc-100 text-zinc-400 text-sm cursor-not-allowed"
            >
              DNA Synthese erforderlich
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Wenn keine Kernbotschaft vorhanden ist
  if (!kernbotschaft) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel + Beschreibung */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-zinc-900">
                  Kernbotschaft
                </h3>
                <p className="text-xs text-zinc-500">
                  Erarbeite die Kernbotschaft im Dialog mit der KI.
                </p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Rechts: Erstellen Button */}
            <Button
              onClick={onOpenChat}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Generiere...
                </>
              ) : (
                <>
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  Generieren
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Kernbotschaft vorhanden - kompaktes Layout mit Toggle
  return (
    <>
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-blue-50/50 to-white">
          {/* Kompakte Zeile */}
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel + Status-Badge + Datum */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-900">
                    Kernbotschaft
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {statusText}
                  </span>
                </div>
                {createdDate && (
                  <p className="text-xs text-zinc-500">
                    Erstellt: {createdDate}
                  </p>
                )}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Rechts: Token-Badge + 3-Punkte-Menü + Toggle-Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Token-Badge (nicht klickbar) */}
              <div className="h-9 flex items-center px-3 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-xs whitespace-nowrap text-blue-600">
                  ~{tokenCount} Tokens
                </span>
              </div>

              {/* 3-Punkte-Menü */}
              <div className="relative" data-menu-kernbotschaft>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <EllipsisVerticalIcon className="h-4 w-4 text-blue-600" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenChat();
                      }}
                      disabled={isLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      KI-Chat
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

              {/* Toggle-Button (ganz rechts, Vollton mit weißem Pfeil) */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-all"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-white" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Expandierter Inhalt */}
          <div
            className={clsx(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            )}
          >
            <div className="bg-white rounded-lg border border-blue-200 p-5">
              {/* Anlass & Ziel wenn vorhanden */}
              {(kernbotschaft.occasion || kernbotschaft.goal) && (
                <div className="mb-4 pb-4 border-b border-zinc-200 grid grid-cols-2 gap-4">
                  {kernbotschaft.occasion && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Anlass</p>
                      <p className="text-sm text-zinc-900">{kernbotschaft.occasion}</p>
                    </div>
                  )}
                  {kernbotschaft.goal && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Ziel</p>
                      <p className="text-sm text-zinc-900">{kernbotschaft.goal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Kernbotschaft Text - mit Markdown-Formatierung */}
              <KernbotschaftRenderer content={kernbotschaft.plainText || kernbotschaft.content} />
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <KernbotschaftEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={kernbotschaft.plainText || kernbotschaft.content}
        onSave={handleSaveEdit}
      />

      {/* Lösch-Bestätigung */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
      >
        <DialogTitle>Kernbotschaft löschen</DialogTitle>
        <DialogBody>
          <p className="text-zinc-600">
            Möchtest du die Kernbotschaft wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
