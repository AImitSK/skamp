'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { useMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
import { useDNASynthese, useIsDNASyntheseOutdated, useSynthesizeDNA, useUpdateDNASynthese, useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
import { useKernbotschaft, useCreateKernbotschaft, useUpdateKernbotschaft, useDeleteKernbotschaft } from '@/lib/hooks/useKernbotschaft';
import { DNASyntheseSection as DNASyntheseSectionComponent } from '@/components/projects/strategy/DNASyntheseSection';
import { KernbotschaftSection } from '@/components/projects/strategy/KernbotschaftSection';
import { KernbotschaftChatModal } from '@/components/projects/strategy/KernbotschaftChatModal';
import { toastService } from '@/lib/utils/toast';

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

  // Synthese Mutations
  const { mutate: synthesize, isPending: isSynthesizing } = useSynthesizeDNA();
  const { mutateAsync: updateSynthese } = useUpdateDNASynthese();
  const { mutateAsync: deleteSynthese, isPending: isDeleting } = useDeleteDNASynthese();

  // Kernbotschaft Mutations
  const { mutateAsync: createKernbotschaft } = useCreateKernbotschaft();
  const { mutateAsync: updateKernbotschaft } = useUpdateKernbotschaft();
  const { mutateAsync: deleteKernbotschaft, isPending: isDeletingKernbotschaft } = useDeleteKernbotschaft();

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Pruefe ob Synthese moeglich ist (alle 6 Dokumente vorhanden)
  const canSynthesize = markenDNAStatus?.isComplete ?? false;
  const hasDNASynthese = !!dnaSynthese?.plainText;

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

  // Handler für Kernbotschaft speichern (Create oder Update)
  const handleSaveKernbotschaft = async (content: string, status: 'draft' | 'completed') => {
    if (!userId || !projectId || !companyId) {
      toastService.error('Nicht authentifiziert');
      return;
    }

    try {
      if (kernbotschaft?.id) {
        // Update
        await updateKernbotschaft({
          projectId,
          id: kernbotschaft.id,
          data: {
            content,
            plainText: content.replace(/<[^>]*>/g, ''),
            status,
          },
          organizationId,
          userId,
        });
        toastService.success('Kernbotschaft aktualisiert');
      } else {
        // Create
        await createKernbotschaft({
          data: {
            projectId,
            companyId,
            occasion: '',
            goal: '',
            keyMessage: '',
            content,
            plainText: content.replace(/<[^>]*>/g, ''),
            status,
          },
          organizationId,
          userId,
        });
        toastService.success('Kernbotschaft erstellt');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Kernbotschaft:', error);
      toastService.error('Fehler beim Speichern');
      throw error;
    }
  };

  // Handler für Kernbotschaft löschen
  const handleDeleteKernbotschaft = async () => {
    if (!kernbotschaft?.id || !projectId) return;

    try {
      await deleteKernbotschaft({ projectId, id: kernbotschaft.id });
      toastService.success('Kernbotschaft gelöscht');
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

      {/* Kernbotschaft Section */}
      <KernbotschaftSection
        projectId={projectId}
        companyId={companyId}
        kernbotschaft={kernbotschaft}
        hasDNASynthese={hasDNASynthese}
        onOpenChat={() => setIsChatOpen(true)}
        onEdit={async (content: string) => {
          if (!kernbotschaft?.id || !userId) return;
          await updateKernbotschaft({
            projectId,
            id: kernbotschaft.id,
            data: {
              content,
              plainText: content.replace(/<[^>]*>/g, ''),
            },
            organizationId,
            userId,
          });
          toastService.success('Kernbotschaft aktualisiert');
        }}
        onDelete={handleDeleteKernbotschaft}
        isLoading={isDeletingKernbotschaft}
      />

      {/* Kernbotschaft Chat Modal */}
      <KernbotschaftChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        dnaSynthese={dnaSynthese?.plainText}
        existingKernbotschaft={kernbotschaft?.content}
        existingChatHistory={kernbotschaft?.chatHistory}
        onSave={handleSaveKernbotschaft}
      />
    </div>
  );
}
