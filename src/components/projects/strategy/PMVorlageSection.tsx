'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PMVorlagePreview } from './PMVorlagePreview';
import type { PMVorlage } from '@/types/pm-vorlage';
import type { FaktenMatrix } from '@/types/fakten-matrix';
import clsx from 'clsx';

interface PMVorlageSectionProps {
  projectId: string;
  companyId: string;
  companyName: string;
  pmVorlage?: PMVorlage | null;
  faktenMatrix?: FaktenMatrix | null;
  hasDNASynthese: boolean;
  hasFaktenMatrix: boolean;
  isOutdated?: boolean;
  dnaContacts: Array<{
    id: string;
    name: string;
    position: string;
    expertise?: string;
  }>;
  onGenerate?: (targetGroup: 'ZG1' | 'ZG2' | 'ZG3') => void;
  onDelete?: () => void;
  onCopyToEditor?: () => void;
  onApplyToEditor?: (includeTitle: boolean) => void;
  onRestoreFromHistory?: (historyIndex: number) => void;
  isLoading?: boolean;
  isApplying?: boolean;
}

export function PMVorlageSection({
  projectId,
  companyId,
  companyName,
  pmVorlage,
  faktenMatrix,
  hasDNASynthese,
  hasFaktenMatrix,
  isOutdated = false,
  dnaContacts,
  onGenerate,
  onDelete,
  onCopyToEditor,
  onApplyToEditor,
  onRestoreFromHistory,
  isLoading = false,
  isApplying = false,
}: PMVorlageSectionProps) {
  const t = useTranslations('strategy');

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [selectedTargetGroup, setSelectedTargetGroup] = useState<'ZG1' | 'ZG2' | 'ZG3'>('ZG1');

  // Kann generiert werden?
  const canGenerate = hasDNASynthese && hasFaktenMatrix;
  const hasPMVorlage = !!pmVorlage;

  // Click-Outside Handler fuer Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideMenu = target.closest('[data-menu-pmvorlage]') !== null;
      if (!isInsideMenu) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler
  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate(selectedTargetGroup);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
    setIsMenuOpen(false);
  };

  const handleApplyToEditor = () => {
    if (onApplyToEditor) {
      onApplyToEditor(includeTitle);
    }
    setShowApplyConfirm(false);
  };

  // Erstellungsdatum formatieren
  const createdDate = pmVorlage?.generatedAt
    ? new Date(
        typeof pmVorlage.generatedAt === 'object' && 'seconds' in pmVorlage.generatedAt
          ? pmVorlage.generatedAt.seconds * 1000
          : pmVorlage.generatedAt
      ).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Wenn Voraussetzungen fehlen
  if (!canGenerate) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-cyan-50/50 to-white">
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <DocumentDuplicateIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900">PM-Vorlage</h3>
                <p className="text-xs text-zinc-500">
                  DNA-Synthese und Fakten-Matrix benötigt
                </p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Rechts: Hinweis */}
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Voraussetzungen fehlen</span>
            </div>
          </div>

          {/* Details zu fehlenden Voraussetzungen */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Voraussetzungen:</p>
                <ul className="list-disc list-inside space-y-1">
                  {!hasDNASynthese && <li>DNA-Synthese erstellen</li>}
                  {!hasFaktenMatrix && <li>Project-Wizard durchführen (Fakten-Matrix)</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wenn keine PM-Vorlage vorhanden - Generieren-Ansicht
  if (!hasPMVorlage) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-cyan-50/50 to-white">
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <DocumentDuplicateIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900">PM-Vorlage</h3>
                <p className="text-xs text-zinc-500">Bereit zur Generierung</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Rechts: Zielgruppen-Auswahl + Generieren-Button */}
            <div className="flex items-center gap-2">
              <select
                value={selectedTargetGroup}
                onChange={(e) => setSelectedTargetGroup(e.target.value as 'ZG1' | 'ZG2' | 'ZG3')}
                className="h-9 text-sm border border-cyan-200 rounded-lg px-2 bg-white text-cyan-700"
              >
                <option value="ZG1">ZG1 - B2B</option>
                <option value="ZG2">ZG2 - Consumer</option>
                <option value="ZG3">ZG3 - Media</option>
              </select>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Generieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PM-Vorlage vorhanden - kompaktes Layout mit Toggle
  return (
    <>
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 bg-gradient-to-r from-cyan-50/50 to-white">
          {/* Kompakte Zeile */}
          <div className="flex items-center gap-4">
            {/* Links: Icon + Titel + Datum */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-cyan-100 rounded-lg flex-shrink-0">
                <DocumentDuplicateIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-zinc-900">PM-Vorlage</h3>
                {createdDate && (
                  <p className="text-xs text-zinc-500">Erstellt: {createdDate}</p>
                )}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Rechts: Status-Badge + 3-Punkte-Menü + Toggle-Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Zielgruppen-Badge */}
              <div className="h-9 flex items-center px-3 rounded-lg bg-cyan-50 border border-cyan-200">
                <span className="text-xs text-cyan-600 whitespace-nowrap">
                  {pmVorlage.targetGroup}
                </span>
              </div>

              {/* Veraltet-Badge */}
              {isOutdated && (
                <div className="h-9 flex items-center gap-1 px-3 rounded-lg bg-amber-50 border border-amber-200">
                  <ExclamationTriangleIcon className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-600 whitespace-nowrap">Veraltet</span>
                </div>
              )}

              {/* 3-Punkte-Menü */}
              <div className="relative" data-menu-pmvorlage>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-cyan-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                >
                  <EllipsisVerticalIcon className="h-4 w-4 text-cyan-600" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 min-w-[220px] bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50">
                    {/* Neu generieren */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleGenerate();
                      }}
                      disabled={isLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Neu generieren
                    </button>

                    {/* In Editor übernehmen */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowApplyConfirm(true);
                      }}
                      disabled={isApplying}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      In Pressemeldung übernehmen
                    </button>

                    {/* Ältere Versionen */}
                    {pmVorlage.history && pmVorlage.history.length > 0 && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowHistoryDialog(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <ClockIcon className="h-4 w-4" />
                        Ältere Version ({pmVorlage.history.length})
                      </button>
                    )}

                    <hr className="my-1 border-zinc-200" />

                    {/* Löschen */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowDeleteConfirm(true);
                      }}
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
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-all"
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
            <div className="bg-white rounded-lg border border-cyan-200 p-5">
              <PMVorlagePreview pmVorlage={pmVorlage} isExpanded={true} />

              {/* In Editor übernehmen Button - prominent */}
              {onApplyToEditor && (
                <div className="mt-4 pt-4 border-t border-zinc-200">
                  <Button
                    onClick={() => setShowApplyConfirm(true)}
                    disabled={isApplying}
                    className="w-full gap-2 bg-[#005fab] hover:bg-[#004a8c] text-white"
                  >
                    {isApplying ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRightIcon className="w-4 h-4" />
                    )}
                    In Pressemeldung übernehmen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>PM-Vorlage löschen?</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-600">
            Möchtest du diese PM-Vorlage wirklich löschen? Die History wird ebenfalls gelöscht.
          </p>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteConfirm(false)}>
            Abbrechen
          </Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)}>
        <DialogTitle>Ältere Versionen</DialogTitle>
        <DialogBody>
          <div className="space-y-3">
            {pmVorlage?.history?.map((entry, index) => (
              <div
                key={index}
                className="p-3 border border-zinc-200 rounded-lg hover:border-cyan-400 cursor-pointer transition-colors"
                onClick={() => {
                  if (onRestoreFromHistory) {
                    onRestoreFromHistory(index);
                  }
                  setShowHistoryDialog(false);
                }}
              >
                <p className="font-medium text-sm text-zinc-900 line-clamp-1">
                  {entry.content.headline}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(
                    typeof entry.generatedAt === 'object' && 'seconds' in entry.generatedAt
                      ? entry.generatedAt.seconds * 1000
                      : entry.generatedAt
                  ).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowHistoryDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply to Editor Confirm Dialog */}
      <Dialog open={showApplyConfirm} onClose={() => setShowApplyConfirm(false)}>
        <DialogTitle>In Pressemeldung übernehmen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {/* Warnung */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Achtung: Bestehende Inhalte werden überschrieben!</p>
                <p className="mt-1">
                  Diese Aktion ersetzt den gesamten Text Ihrer Pressemeldung mit der generierten Vorlage.
                </p>
              </div>
            </div>

            {/* Headline Option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTitle}
                onChange={(e) => setIncludeTitle(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
              />
              <span className="text-sm text-zinc-700">
                Headline als Titel übernehmen
              </span>
            </label>

            {/* Preview der Headline */}
            {includeTitle && pmVorlage?.headline && (
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-xs text-zinc-500 mb-1">Neuer Titel:</p>
                <p className="text-sm font-medium text-zinc-900">{pmVorlage.headline}</p>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowApplyConfirm(false)}>
            Abbrechen
          </Button>
          <Button
            className="bg-[#005fab] text-white hover:bg-[#004a8c]"
            onClick={handleApplyToEditor}
            disabled={isApplying}
          >
            {isApplying ? 'Wird übertragen...' : 'Übernehmen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
