'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { useMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
import { useDNASynthese, useIsDNASyntheseOutdated, useSynthesizeDNA, useUpdateDNASynthese, useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
import { useKernbotschaft, useCreateKernbotschaft, useUpdateKernbotschaft } from '@/lib/hooks/useKernbotschaft';
import { useTextMatrix } from '@/lib/hooks/useTextMatrix';
import { DNASyntheseSection as DNASyntheseSectionComponent } from '@/components/projects/strategy/DNASyntheseSection';
import { KernbotschaftChatModal } from '@/components/projects/strategy/KernbotschaftChatModal';
import { toastService } from '@/lib/utils/toast';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface StrategieTabContentProps {
  project: Project;
  organizationId: string;
  userId?: string;
  dokumenteFolder: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function StrategieTabContent({
  project,
  organizationId,
  userId,
  dokumenteFolder,
  foldersLoading,
  onRefresh
}: StrategieTabContentProps) {
  const router = useRouter();
  const companyId = project.customer?.id;
  const companyName = project.customer?.name || '';
  const projectId = project.id;

  // Daten laden
  const { data: markenDNAStatus } = useMarkenDNAStatus(companyId);
  const { data: dnaSynthese } = useDNASynthese(companyId);
  const { data: isOutdated } = useIsDNASyntheseOutdated(companyId);
  const { data: kernbotschaft } = useKernbotschaft(projectId);
  const { data: textMatrix } = useTextMatrix(projectId);

  // Synthese Mutations
  const { mutate: synthesize, isPending: isSynthesizing } = useSynthesizeDNA();
  const { mutateAsync: updateSynthese } = useUpdateDNASynthese();
  const { mutateAsync: deleteSynthese, isPending: isDeleting } = useDeleteDNASynthese();

  // Pruefe ob Synthese moeglich ist (alle 6 Dokumente vorhanden)
  const canSynthesize = markenDNAStatus?.isComplete ?? false;

  // Handler für Synthese
  const handleSynthesize = () => {
    if (!companyId || !companyName) return;

    synthesize(
      {
        companyId,
        companyName,
        organizationId,
        language: 'de',
      },
      {
        onSuccess: () => {
          toastService.success('DNA Synthese erfolgreich aktualisiert!');
        },
        onError: (error) => {
          toastService.error(`Fehler: ${error.message}`);
        },
      }
    );
  };

  // Handler für Navigation zur Marken-DNA
  const handleGoToMarkenDNA = () => {
    router.push(`/dashboard/library/marken-dna/${companyId}`);
  };

  // Handler für Synthese Update
  const handleUpdateSynthese = async (content: string) => {
    if (!companyId || !userId) return;

    try {
      await updateSynthese({
        companyId,
        data: {
          content,
          plainText: content,
          manuallyEdited: true,
        },
        organizationId,
        userId,
      });
      toastService.success('DNA Synthese aktualisiert');
    } catch (error) {
      toastService.error('Fehler beim Aktualisieren');
    }
  };

  // Handler für Synthese Löschen
  const handleDeleteSynthese = async () => {
    if (!companyId) return;

    try {
      await deleteSynthese({ companyId });
      toastService.success('DNA Synthese gelöscht');
    } catch (error) {
      toastService.error('Fehler beim Löschen');
    }
  };

  // Falls projectId oder companyId fehlt, zeige Hinweis
  if (!projectId || !companyId) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <p className="text-sm text-zinc-600">
          Bitte weisen Sie diesem Projekt einen Kunden zu, um die CeleroPress Formel zu nutzen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DNA Synthese Section - Kompakt mit Toggle */}
      <DNASyntheseSectionComponent
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        dnaSynthese={dnaSynthese}
        canSynthesize={canSynthesize}
        markenDNAStatus={markenDNAStatus}
        isOutdated={isOutdated ?? false}
        onSynthesize={handleSynthesize}
        onEdit={handleUpdateSynthese}
        onDelete={handleDeleteSynthese}
        isLoading={isSynthesizing || isDeleting}
      />

      {/* TODO Phase 4.4: Kernbotschaft Chat */}
      <KernbotschaftChat
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        dnaSynthese={dnaSynthese}
        existingKernbotschaft={kernbotschaft}
        organizationId={organizationId}
        userId={userId}
      />

      {/* TODO Phase 4: AI Sequenz Button */}
      {kernbotschaft && dnaSynthese && !textMatrix && (
        <AISequenzButton
          projectId={projectId}
          dnaSynthese={dnaSynthese}
          kernbotschaft={kernbotschaft}
        />
      )}

      {/* TODO Phase 4.5: Text-Matrix Section */}
      {textMatrix && (
        <TextMatrixSection
          textMatrix={textMatrix}
          onEdit={() => {
            // TODO: Implementieren
          }}
          onRework={() => {
            // TODO: Implementieren
          }}
        />
      )}
    </div>
  );
}

// Kernbotschaft Chat Komponente

interface KernbotschaftChatProps {
  projectId: string;
  companyId: string;
  companyName?: string;
  dnaSynthese: any;
  existingKernbotschaft: any;
  organizationId: string;
  userId?: string;
}

function KernbotschaftChat({
  projectId,
  companyId,
  companyName = '',
  dnaSynthese,
  existingKernbotschaft,
  organizationId,
  userId,
}: KernbotschaftChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { mutateAsync: createKernbotschaft } = useCreateKernbotschaft();
  const { mutateAsync: updateKernbotschaft } = useUpdateKernbotschaft();

  // DNA Synthese muss vorhanden sein
  const canStartChat = !!dnaSynthese?.plainText;

  // Handler für Speichern (Create oder Update)
  const handleSave = async (content: string, status: 'draft' | 'completed') => {
    if (!userId) {
      toastService.error('Nicht authentifiziert');
      return;
    }

    try {
      if (existingKernbotschaft?.id) {
        // Update
        await updateKernbotschaft({
          projectId,
          id: existingKernbotschaft.id,
          data: {
            content,
            plainText: content.replace(/<[^>]*>/g, ''),
            status,
          },
          organizationId,
          userId,
        });
      } else {
        // Create
        await createKernbotschaft({
          data: {
            projectId,
            companyId,
            occasion: '', // Wird im Chat ausgefüllt
            goal: '',
            keyMessage: '',
            content,
            plainText: content.replace(/<[^>]*>/g, ''),
            status,
          },
          organizationId,
          userId,
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Kernbotschaft:', error);
      throw error;
    }
  };

  // Wenn keine DNA Synthese vorhanden ist
  if (!canStartChat) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              Kernbotschaft
            </h3>
            <p className="text-sm text-zinc-500">
              Erstelle zuerst eine DNA Synthese, um die Kernbotschaft zu generieren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-center gap-4">
          {/* Links: Icon + Titel */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                Kernbotschaft
              </h3>
              {existingKernbotschaft ? (
                <p className="text-sm text-zinc-500">
                  Status: {existingKernbotschaft.status === 'completed' ? 'Fertig' : 'Entwurf'}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Noch nicht erstellt
                </p>
              )}
            </div>
          </div>

          <div className="flex-1" />

          {/* Rechts: Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-6 rounded-lg transition-colors text-sm"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
            {existingKernbotschaft ? 'Weiterbearbeiten' : 'Mit KI erstellen'}
          </button>
        </div>

        {/* Vorschau wenn vorhanden */}
        {existingKernbotschaft?.plainText && (
          <div className="mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
            <p className="text-sm text-zinc-700 line-clamp-3">
              {existingKernbotschaft.plainText}
            </p>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      <KernbotschaftChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        dnaSynthese={dnaSynthese?.plainText}
        existingKernbotschaft={existingKernbotschaft?.content}
        existingChatHistory={existingKernbotschaft?.chatHistory}
        onSave={handleSave}
      />
    </>
  );
}

interface AISequenzButtonProps {
  projectId: string;
  dnaSynthese: any;
  kernbotschaft: any;
}

function AISequenzButton(props: AISequenzButtonProps) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-base font-semibold text-zinc-900 mb-2">
        🧬 AI Sequenz
      </h3>
      <p className="text-sm text-zinc-600">
        TODO Phase 4: AI Sequenz Button implementieren
      </p>
    </div>
  );
}

interface TextMatrixSectionProps {
  textMatrix: any;
  onEdit: () => void;
  onRework: () => void;
}

function TextMatrixSection(props: TextMatrixSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-base font-semibold text-zinc-900 mb-2">
        📋 Text-Matrix
      </h3>
      <p className="text-sm text-zinc-600">
        TODO Phase 4.5: Text-Matrix Section implementieren
      </p>
    </div>
  );
}
