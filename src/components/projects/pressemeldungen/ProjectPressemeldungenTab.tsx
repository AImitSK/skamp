// src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx
'use client';

import { useState, useMemo, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { PlusIcon, EllipsisVerticalIcon, BookmarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { useProjectPressData } from '@/lib/hooks/useCampaignData';
import { projectService } from '@/lib/firebase/project-service';
import { toastService } from '@/lib/utils/toast';
import PressemeldungCampaignTable from './PressemeldungCampaignTable';
import PressemeldungApprovalTable from './PressemeldungApprovalTable';
import PressemeldungToggleSection from './PressemeldungToggleSection';

interface Props {
  projectId: string;
  organizationId: string;
}

export default function ProjectPressemeldungenTab({
  projectId,
  organizationId
}: Props) {
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // React Query Hook für Campaigns + Approvals
  const {
    campaigns,
    approvals,
    isLoading,
    refetch,
  } = useProjectPressData(projectId, organizationId);

  const hasLinkedCampaign = useMemo(() => campaigns.length > 0, [campaigns.length]);

  // Callbacks mit useCallback für Performance
  const handleCreateCampaign = useCallback(async () => {
    setIsCreating(true);
    try {
      // Projekt laden um Titel zu bekommen
      const project = await projectService.getById(projectId, { organizationId });
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      // Gleiche Funktion wie im Wizard verwenden
      const result = await projectService.initializeProjectResources(
        projectId,
        {
          createCampaign: true,
          campaignTitle: `${project.title} - PR-Kampagne`,
          attachAssets: [],
          linkDistributionLists: [],
          createTasks: false,
          notifyTeam: false
        },
        organizationId
      );

      if (result.campaignCreated && result.campaignId) {
        toastService.success('Pressemeldung erfolgreich erstellt');
        setShowConfirmDialog(false);
        // Weiterleitung zur Edit-Seite
        router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${result.campaignId}`);
      } else {
        throw new Error('Kampagne konnte nicht erstellt werden');
      }
    } catch (error) {
      toastService.error('Fehler beim Erstellen der Pressemeldung');
    } finally {
      setIsCreating(false);
    }
  }, [projectId, organizationId, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Heading level={3}>Pressemeldung</Heading>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowConfirmDialog(true)}
            className={hasLinkedCampaign
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#005fab] hover:bg-[#004a8c] text-white"
            }
            disabled={hasLinkedCampaign}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Meldung Erstellen
          </Button>

          {/* Actions Menu */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
              <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="py-1">
                  <a
                    href="/dashboard/library/boilerplates"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    Boilerplate erstellen
                  </a>
                  <a
                    href="/dashboard/settings/templates"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    PDF Template erstellen
                  </a>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Kampagnen-Tabelle */}
      <PressemeldungCampaignTable
        campaigns={campaigns}
        organizationId={organizationId}
        onRefresh={refetch}
      />

      {/* Freigabe-Tabelle */}
      <div className="space-y-4">
        <Heading level={3}>Freigabe</Heading>
        <PressemeldungApprovalTable
          approvals={approvals}
          onRefresh={refetch}
        />
      </div>

      {/* Toggle-Bereiche - nur anzeigen wenn Freigaben vorhanden sind */}
      {approvals.length > 0 && (
        <div className="space-y-4">
          <Heading level={3}>Freigabe-Details</Heading>
          <PressemeldungToggleSection
            projectId={projectId}
            campaignId={campaigns[0]?.id}
            organizationId={organizationId}
          />
        </div>
      )}

      {/* Bestätigungs-Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} size="sm">
        <DialogTitle>Neue Pressemeldung erstellen</DialogTitle>
        <DialogBody>
          <p className="text-gray-700">
            Wollen Sie wirklich eine neue Pressemeldung erstellen?
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Sie werden anschließend zur Bearbeitung der Pressemeldung weitergeleitet.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            color="secondary"
            onClick={() => setShowConfirmDialog(false)}
            disabled={isCreating}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleCreateCampaign}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            disabled={isCreating}
          >
            {isCreating ? 'Wird erstellt...' : 'Ja, erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}