'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { useMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
import { useDNASynthese, useIsDNASyntheseOutdated, useSynthesizeDNA, useUpdateDNASynthese, useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
import { useKernbotschaft } from '@/lib/hooks/useKernbotschaft';
import { useTextMatrix } from '@/lib/hooks/useTextMatrix';
import { DNASyntheseSection as DNASyntheseSectionComponent } from '@/components/projects/strategy/DNASyntheseSection';
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

// Platzhalter-Komponenten (werden in spaeteren Schritten implementiert)

interface KernbotschaftChatProps {
  projectId: string;
  companyId: string;
  companyName?: string;
  dnaSynthese: any;
  existingKernbotschaft: any;
  organizationId: string;
  userId?: string;
}

function KernbotschaftChat(props: KernbotschaftChatProps) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-base font-semibold text-zinc-900 mb-2">
        💬 Kernbotschaft Chat
      </h3>
      <p className="text-sm text-zinc-600">
        TODO Phase 4.4: Kernbotschaft Chat implementieren
      </p>
    </div>
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
