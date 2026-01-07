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
  onRestoreFromHistory?: (historyIndex: number) => void;
  isLoading?: boolean;
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
  onRestoreFromHistory,
  isLoading = false,
}: PMVorlageSectionProps) {
  const t = useTranslations('strategy');

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedTargetGroup, setSelectedTargetGroup] = useState<'ZG1' | 'ZG2' | 'ZG3'>('ZG1');

  // Kann generiert werden?
  const canGenerate = hasDNASynthese && hasFaktenMatrix;
  const hasPMVorlage = !!pmVorlage;

  // Click-Outside Handler fuer Menu
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

  const handleCopyToEditor = () => {
    if (onCopyToEditor) {
      onCopyToEditor();
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div
        className={clsx(
          'flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 transition-colors',
          hasPMVorlage && 'border-b border-zinc-100'
        )}
        onClick={() => hasPMVorlage && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              hasPMVorlage ? 'bg-[#0ea5e9]/10' : 'bg-zinc-100'
            )}
          >
            <DocumentDuplicateIcon
              className={clsx(
                'w-5 h-5',
                hasPMVorlage ? 'text-[#0ea5e9]' : 'text-zinc-400'
              )}
            />
          </div>

          {/* Title & Status */}
          <div>
            <h3 className="font-medium text-zinc-900">PM-Vorlage</h3>
            <p className="text-sm text-zinc-500">
              {hasPMVorlage
                ? isOutdated
                  ? 'Veraltet - DNA oder Fakten wurden geaendert'
                  : `Generiert fuer ${pmVorlage.targetGroup}`
                : canGenerate
                  ? 'Bereit zur Generierung'
                  : 'DNA-Synthese und Fakten-Matrix benoetigt'}
            </p>
          </div>

          {/* Outdated Badge */}
          {isOutdated && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <ExclamationTriangleIcon className="w-3 h-3" />
              Veraltet
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Zielgruppen-Auswahl */}
          {canGenerate && !hasPMVorlage && (
            <select
              value={selectedTargetGroup}
              onChange={(e) => setSelectedTargetGroup(e.target.value as 'ZG1' | 'ZG2' | 'ZG3')}
              onClick={(e) => e.stopPropagation()}
              className="text-sm border border-zinc-300 rounded-md px-2 py-1 bg-white"
            >
              <option value="ZG1">ZG1 - B2B</option>
              <option value="ZG2">ZG2 - Consumer</option>
              <option value="ZG3">ZG3 - Media</option>
            </select>
          )}

          {/* Generate Button */}
          {canGenerate && (
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleGenerate();
              }}
              disabled={isLoading}
              className="gap-1.5 px-3 py-1.5 text-sm"
            >
              {isLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SparklesIcon className="w-4 h-4" />
              )}
              {hasPMVorlage ? 'Neu generieren' : 'Generieren'}
            </Button>
          )}

          {/* Menu Button */}
          {hasPMVorlage && (
            <div className="relative" data-menu>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-zinc-500" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyToEditor();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    In Editor uebernehmen
                  </button>

                  {pmVorlage.history && pmVorlage.history.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHistoryDialog(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <ClockIcon className="w-4 h-4" />
                      Aeltere Version ({pmVorlage.history.length})
                    </button>
                  )}

                  <hr className="my-1 border-zinc-200" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Loeschen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse */}
          {hasPMVorlage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-zinc-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-zinc-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {hasPMVorlage && isExpanded && (
        <div className="p-4 bg-zinc-50">
          <PMVorlagePreview pmVorlage={pmVorlage} isExpanded={true} />
        </div>
      )}

      {/* Missing Requirements Hint */}
      {!canGenerate && (
        <div className="p-4 bg-zinc-50 border-t border-zinc-200">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-600">
              <p className="font-medium text-zinc-700 mb-1">Voraussetzungen fehlen:</p>
              <ul className="list-disc list-inside space-y-1">
                {!hasDNASynthese && <li>DNA-Synthese erstellen</li>}
                {!hasFaktenMatrix && <li>Project-Wizard durchfuehren (Fakten-Matrix)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>PM-Vorlage loeschen?</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-600">
            Moechtest du diese PM-Vorlage wirklich loeschen? Die History wird ebenfalls geloescht.
          </p>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteConfirm(false)}>
            Abbrechen
          </Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
            Loeschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)}>
        <DialogTitle>Aeltere Versionen</DialogTitle>
        <DialogBody>
          <div className="space-y-3">
            {pmVorlage?.history?.map((entry, index) => (
              <div
                key={index}
                className="p-3 border border-zinc-200 rounded-lg hover:border-[#0ea5e9] cursor-pointer transition-colors"
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
            Schliessen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
