'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types/project';
import { useMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
import { useDNASynthese, useIsDNASyntheseOutdated, useSynthesizeDNA, useUpdateDNASynthese, useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
import { useKernbotschaft, useCreateKernbotschaft, useUpdateKernbotschaft, useDeleteKernbotschaft } from '@/lib/hooks/useKernbotschaft';
import { usePMVorlage, useFaktenMatrix, useGeneratePMVorlage, useDeletePMVorlage, useRestorePMVorlageFromHistory, useApplyPMVorlageToEditor, faktenMatrixKeys } from '@/lib/hooks/usePMVorlage';
import { useContacts } from '@/lib/hooks/useCRMData';
import { DNASyntheseSection as DNASyntheseSectionComponent } from '@/components/projects/strategy/DNASyntheseSection';
import { KernbotschaftSection } from '@/components/projects/strategy/KernbotschaftSection';
import { KernbotschaftChatModal } from '@/components/projects/strategy/KernbotschaftChatModal';
import { PMVorlageSection } from '@/components/projects/strategy/PMVorlageSection';
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
  const queryClient = useQueryClient();
  const companyId = project.customer?.id;
  const companyName = project.customer?.name || '';
  const projectId = project.id;

  // Daten laden
  const { data: markenDNAStatus } = useMarkenDNAStatus(companyId);
  const { data: dnaSynthese } = useDNASynthese(companyId);
  const { data: isOutdated } = useIsDNASyntheseOutdated(companyId);
  const { data: kernbotschaft } = useKernbotschaft(projectId);
  const { data: pmVorlage } = usePMVorlage(projectId);
  const { data: faktenMatrix } = useFaktenMatrix(projectId);

  // DNA-Kontakte aus CRM laden und für Company filtern
  const { data: allContacts } = useContacts(organizationId);
  const dnaContacts = (allContacts || [])
    .filter(c => c.companyId === companyId)
    .map(c => ({
      id: c.id,
      name: c.displayName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unbekannt',
      position: c.position || '',
      expertise: c.department || '',
      email: c.emails?.find(e => e.isPrimary)?.email || c.emails?.[0]?.email || '',
      phone: c.phones?.find(p => p.isPrimary)?.number || c.phones?.[0]?.number || '',
    }));

  // Synthese Mutations
  const { mutate: synthesize, isPending: isSynthesizing } = useSynthesizeDNA();
  const { mutateAsync: updateSynthese } = useUpdateDNASynthese();
  const { mutateAsync: deleteSynthese, isPending: isDeleting } = useDeleteDNASynthese();

  // Kernbotschaft Mutations
  const { mutateAsync: createKernbotschaft } = useCreateKernbotschaft();
  const { mutateAsync: updateKernbotschaft } = useUpdateKernbotschaft();
  const { mutateAsync: deleteKernbotschaft, isPending: isDeletingKernbotschaft } = useDeleteKernbotschaft();

  // PM-Vorlage Mutations
  const { mutate: generatePMVorlage, isPending: isGeneratingPMVorlage } = useGeneratePMVorlage();
  const { mutateAsync: deletePMVorlage, isPending: isDeletingPMVorlage } = useDeletePMVorlage();
  const { mutateAsync: restorePMVorlageFromHistory } = useRestorePMVorlageFromHistory();
  const { mutate: applyPMVorlageToEditor, isPending: isApplyingPMVorlage } = useApplyPMVorlageToEditor();

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Handler für Chat-Schließen mit Query-Invalidierung
  const handleChatClose = useCallback(() => {
    setIsChatOpen(false);
    // Fakten-Matrix Queries invalidieren, da im Chat evtl. neue erstellt wurde
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: faktenMatrixKeys.byProject(projectId) });
    }
  }, [projectId, queryClient]);

  // Pruefe ob Synthese moeglich ist (alle 6 Dokumente vorhanden)
  const canSynthesize = markenDNAStatus?.isComplete ?? false;
  const hasDNASynthese = !!dnaSynthese?.plainText;
  const hasFaktenMatrix = !!faktenMatrix;

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
  const handleSaveKernbotschaft = async (
    content: string,
    status: 'draft' | 'completed',
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
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
            chatHistory, // Chat-Historie speichern
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
            chatHistory, // Chat-Historie speichern
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

  // Handler für PM-Vorlage generieren
  const handleGeneratePMVorlage = (targetGroup: 'ZG1' | 'ZG2' | 'ZG3') => {
    if (!companyId || !companyName || !projectId) return;

    // DNA-Kontakte in das richtige Format transformieren
    const formattedContacts = (dnaContacts || []).map(contact => ({
      id: contact.id || '',
      name: contact.name || '',
      position: contact.position || contact.role || '',
      expertise: contact.expertise,
      email: contact.email,
      phone: contact.phone,
    }));

    generatePMVorlage(
      {
        projectId,
        companyId,
        companyName,
        dnaSynthese: dnaSynthese?.plainText,
        dnaContacts: formattedContacts,
        targetGroup,
      },
      {
        onSuccess: () => {
          toastService.success('PM-Vorlage erfolgreich generiert!');
        },
        onError: (error) => {
          toastService.error(`Fehler: ${error.message}`);
        },
      }
    );
  };

  // Handler für PM-Vorlage löschen
  const handleDeletePMVorlage = async () => {
    if (!projectId) return;

    try {
      await deletePMVorlage({ projectId });
      toastService.success('PM-Vorlage gelöscht');
    } catch (error) {
      toastService.error('Fehler beim Löschen');
    }
  };

  // Handler für PM-Vorlage in Editor übernehmen
  const handleCopyPMVorlageToEditor = () => {
    if (!pmVorlage?.htmlContent) return;
    // TODO: Integration mit Editor (Phase 7)
    navigator.clipboard.writeText(pmVorlage.htmlContent);
    toastService.success('HTML in Zwischenablage kopiert');
  };

  // Handler für PM-Vorlage aus History wiederherstellen
  const handleRestorePMVorlageFromHistory = async (historyIndex: number) => {
    if (!projectId) return;

    try {
      await restorePMVorlageFromHistory({ projectId, historyIndex });
      toastService.success('Ältere Version wiederhergestellt');
    } catch (error) {
      toastService.error('Fehler beim Wiederherstellen');
    }
  };

  // Handler für PM-Vorlage in Editor übernehmen
  const handleApplyPMVorlageToEditor = (includeTitle: boolean) => {
    if (!projectId) return;

    applyPMVorlageToEditor(
      {
        projectId,
        organizationId,
        includeTitle,
      },
      {
        onSuccess: (result) => {
          toastService.success('PM-Vorlage in Pressemeldung übertragen!');
          // Zur Pressemeldung navigieren
          router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${result.campaignId}`);
        },
        onError: (error) => {
          toastService.error(`Fehler: ${error.message}`);
        },
      }
    );
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

      {/* PM-Vorlage Section */}
      <PMVorlageSection
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        pmVorlage={pmVorlage}
        faktenMatrix={faktenMatrix}
        hasDNASynthese={hasDNASynthese}
        hasFaktenMatrix={hasFaktenMatrix}
        dnaContacts={(dnaContacts || []).map(c => ({
          id: c.id || '',
          name: c.name || '',
          position: c.position || c.role || '',
          expertise: c.expertise,
        }))}
        onGenerate={handleGeneratePMVorlage}
        onDelete={handleDeletePMVorlage}
        onCopyToEditor={handleCopyPMVorlageToEditor}
        onApplyToEditor={handleApplyPMVorlageToEditor}
        onRestoreFromHistory={handleRestorePMVorlageFromHistory}
        isLoading={isGeneratingPMVorlage || isDeletingPMVorlage}
        isApplying={isApplyingPMVorlage}
      />

      {/* Kernbotschaft Chat Modal */}
      <KernbotschaftChatModal
        isOpen={isChatOpen}
        onClose={handleChatClose}
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
