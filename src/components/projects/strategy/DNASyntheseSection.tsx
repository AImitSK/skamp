'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BeakerIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StatusCircles } from '@/components/marken-dna/StatusCircles';
import type { CompanyMarkenDNAStatus } from '@/types/marken-dna';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';

// TODO: DNASynthese Type aus types/project-strategy.ts importieren wenn vorhanden
interface DNASynthese {
  id: string;
  content: string;
  plainText?: string;
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
  onSynthesize?: () => void;
  onDelete?: () => void;
  onEdit?: (content: string) => void;
  isLoading?: boolean;
}

export function DNASyntheseSection({
  projectId,
  companyId,
  companyName,
  dnaSynthese,
  canSynthesize,
  markenDNAStatus,
  onSynthesize,
  onDelete,
  onEdit,
  isLoading = false,
}: DNASyntheseSectionProps) {
  const t = useTranslations('markenDNA');
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(dnaSynthese?.content || '');

  const handleSynthesizeClick = () => {
    if (onSynthesize) {
      onSynthesize();
    }
  };

  const handleDeleteClick = () => {
    if (confirm(t('synthesis.confirmDelete'))) {
      if (onDelete) {
        onDelete();
      }
    }
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(dnaSynthese?.content || '');
    setIsEditing(false);
  };

  const handleCompleteMarkenDNA = () => {
    router.push(`/dashboard/library/marken-dna?company=${companyId}`);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BeakerIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-base font-semibold text-zinc-900">DNA Synthese</h3>
        </div>

        {/* Dropdown Menu (nur wenn Synthese vorhanden) */}
        {dnaSynthese && (
          <Dropdown>
            <DropdownButton
              plain
              className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="sr-only">Aktionen</span>
              <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </DropdownButton>
            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={handleSynthesizeClick} disabled={!canSynthesize || isLoading}>
                <BeakerIcon className="h-4 w-4" />
                <span>Neu synthetisieren</span>
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={handleDeleteClick} disabled={isLoading}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">Löschen</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {!dnaSynthese ? (
          /* Noch nicht erstellt */
          <div className="text-center py-6">
            {canSynthesize ? (
              <>
                <p className="text-sm text-zinc-600 mb-4">
                  Erstelle eine KI-optimierte Kurzform der Marken-DNA für {companyName}.
                </p>
                <Button
                  onClick={handleSynthesizeClick}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg font-medium transition-colors"
                >
                  <BeakerIcon className="h-4 w-4 mr-2" />
                  DNA synthetisieren
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600 mb-4">
                  Die Marken-DNA von {companyName} ist noch nicht vollständig.
                </p>
                {markenDNAStatus && (
                  <div className="flex justify-center mb-4">
                    <StatusCircles documents={markenDNAStatus.documents} size="sm" />
                  </div>
                )}
                <Button
                  onClick={handleCompleteMarkenDNA}
                  className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-10 px-6 rounded-lg font-medium transition-colors"
                >
                  Marken-DNA vervollständigen
                </Button>
              </>
            )}
          </div>
        ) : (
          /* Synthese vorhanden */
          <>
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">DNA Synthese aktiv</span>
            </div>

            {isEditing ? (
              /* Bearbeitungsmodus */
              <div className="space-y-3">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm
                           placeholder:text-zinc-300
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                           min-h-[300px] font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg font-medium transition-colors"
                  >
                    Speichern
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-10 px-6 rounded-lg font-medium transition-colors"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              /* Anzeigemodus */
              <>
                <div
                  className="prose prose-sm max-w-none bg-gray-50 rounded p-4 border border-zinc-200"
                  dangerouslySetInnerHTML={{ __html: dnaSynthese.content }}
                />
                <Button
                  onClick={() => setIsEditing(true)}
                  className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-10 px-4 rounded-lg font-medium transition-colors mt-3"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
