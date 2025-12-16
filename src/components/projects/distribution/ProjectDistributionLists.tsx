// src/components/projects/distribution/ProjectDistributionLists.tsx
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { ProjectDistributionList, projectListsService } from '@/lib/firebase/project-lists-service';
import { DistributionList } from '@/types/lists';
import MasterListBrowser from './MasterListBrowser';
import ListModal from '@/app/dashboard/contacts/lists/ListModal';
import ListDetailsModal from './ListDetailsModal';
import { toastService } from '@/lib/utils/toast';
import Papa from 'papaparse';

// React Query Hooks
import { useProjectLists, useCreateProjectList, useUpdateProjectList, useDeleteProjectList } from '@/hooks/useProjectLists';
import { useMasterLists } from '@/hooks/useMasterLists';
import { useLinkMasterList } from '@/hooks/useListLinking';

// Sub-Komponenten
import ListSearchBar from './components/ListSearchBar';
import ListFilterButton from './components/ListFilterButton';
import ListTableHeader from './components/ListTableHeader';
import ListStatsBar from './components/ListStatsBar';
import EmptyListState from './components/EmptyListState';
import ProjectListRow from './components/ProjectListRow';
import LoadingSpinner from './components/LoadingSpinner';

// Helper Functions
import { categoryOptions, projectListTypeOptions } from './helpers/list-helpers';

interface Props {
  projectId: string;
  organizationId: string;
}

export default function ProjectDistributionLists({ projectId, organizationId }: Props) {
  const t = useTranslations('projects.distribution.lists');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();

  // React Query Hooks
  const { data: projectLists = [], isLoading: isLoadingProjects } = useProjectLists(projectId);
  const { data: masterLists = [], isLoading: isLoadingMasters } = useMasterLists(organizationId);
  const createProjectList = useCreateProjectList(projectId, organizationId);
  const updateProjectList = useUpdateProjectList(projectId);
  const deleteProjectList = useDeleteProjectList(projectId);
  const linkMasterList = useLinkMasterList(projectId, organizationId);

  // Local State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<ProjectDistributionList | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ProjectDistributionList | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Debouncing für Search (300ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleLinkMasterList = useCallback(async (masterListId: string) => {
    if (!user?.uid) return;
    await linkMasterList.mutateAsync({ masterListId, userId: user.uid });
  }, [user, linkMasterList]);

  const handleCreateProjectList = useCallback(async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    await createProjectList.mutateAsync({
      listData: {
        name: listData.name,
        description: listData.description,
        category: listData.category,
        type: listData.type,
        filters: listData.filters,
        contactIds: listData.contactIds,
      },
      userId: user.uid,
    });
    setShowCreateModal(false);
  }, [user, createProjectList]);

  const handleUpdateProjectList = useCallback(async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !editingList?.id) return;
    await updateProjectList.mutateAsync({
      listId: editingList.id,
      updates: {
        name: listData.name,
        description: listData.description,
        category: listData.category,
        listType: listData.type,
        filters: listData.filters,
        contactIds: listData.contactIds,
      },
    });
    setShowEditModal(false);
    setEditingList(null);
  }, [user, editingList, updateProjectList]);

  const handleEditList = useCallback((list: ProjectDistributionList) => {
    setEditingList(list);
    setShowEditModal(true);
  }, []);

  const handleUnlinkList = useCallback(async (listId: string) => {
    await deleteProjectList.mutateAsync(listId);
  }, [deleteProjectList]);

  const handleExportList = useCallback(async (projectList: ProjectDistributionList) => {
    try {
      if (!projectList.id) return;

      const contacts = await projectListsService.getProjectListContacts(projectList.id);
      const exportData = contacts.map(contact => ({
        Name: 'name' in contact && typeof contact.name === 'object'
          ? `${contact.name.firstName} ${contact.name.lastName}`
          : `${(contact as any).firstName || ''} ${(contact as any).lastName || ''}`.trim(),
        Position: contact.position || '',
        Firma: contact.companyName || '',
        'E-Mail': contact.emails?.[0]?.email || '',
        Telefon: contact.phones?.[0]?.number || ''
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = projectList.name || projectList.masterListId || 'liste';
      link.setAttribute('download', `${fileName.toLowerCase().replace(/\s+/g, '-')}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastService.success(tToast('exportSuccess'));
    } catch (error) {
      toastService.error(tToast('exportError'));
    }
  }, [tToast]);

  const handleViewDetails = useCallback((list: ProjectDistributionList) => {
    setSelectedList(list);
    setDetailsModalOpen(true);
  }, []);

  // Gefilterte Listen
  const linkedListIds = useMemo(() => {
    return projectLists
      .filter(l => l.type === 'linked')
      .map(l => l.masterListId)
      .filter(Boolean) as string[];
  }, [projectLists]);

  // Master-Listen Details Map für schnellen Zugriff
  const masterListDetails = useMemo(() => {
    const map = new Map<string, DistributionList>();
    masterLists.forEach(list => {
      if (list.id) {
        map.set(list.id, list);
      }
    });
    return map;
  }, [masterLists]);

  // Alle Master-Listen anzeigen (nicht mehr filtern nach verknüpft/nicht-verknüpft)
  const availableMasterLists = masterLists;

  const filteredProjectLists = useMemo(() => {
    return projectLists.filter(list => {
      if (debouncedSearchTerm) {
        const listName = list.name || masterListDetails.get(list.masterListId || '')?.name || '';
        if (!listName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
          return false;
        }
      }
      // Typ-Filter
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(list.type)) return false;
      }

      // Kategorie-Filter
      if (selectedCategories.length > 0) {
        const category = masterListDetails.get(list.masterListId || '')?.category || 'custom';
        if (!selectedCategories.includes(category)) return false;
      }
      return true;
    });
  }, [projectLists, debouncedSearchTerm, selectedTypes, selectedCategories, masterListDetails]);

  // Filter-Status berechnen
  const activeFiltersCount = useMemo(() => {
    return selectedCategories.length + selectedTypes.length;
  }, [selectedCategories.length, selectedTypes.length]);

  // Listen-Zähler Text
  const listCountText = useMemo(() => {
    return t('listCount', {
      count: projectLists.length
    });
  }, [projectLists.length, t]);

  // Empty State Beschreibung
  const emptyStateDescription = useMemo(() => {
    return searchTerm
      ? t('emptyState.tryOtherSearch')
      : t('emptyState.linkOrCreate');
  }, [searchTerm, t]);

  // Tabellen-Spalten Konfiguration
  const tableColumns = useMemo(() => [
    { label: t('table.name'), width: 'w-[35%]' },
    { label: t('table.category'), width: 'w-[15%]' },
    { label: t('table.type'), width: 'w-[15%]' },
    { label: t('table.contacts'), width: 'w-[12%]' },
    { label: t('table.added'), width: 'flex-1' },
  ], [t]);

  // Modal-Daten für Liste bearbeiten
  const editingListModalData = useMemo(() => {
    if (!editingList) return null;
    return {
      id: editingList.id,
      name: editingList.name || '',
      description: editingList.description,
      type: editingList.listType || 'static',
      category: editingList.category || 'custom',
      filters: editingList.filters || {},
      contactIds: editingList.contactIds || [],
      contactCount: editingList.cachedContactCount || 0,
      userId: editingList.addedBy,
      organizationId: editingList.organizationId,
      createdAt: editingList.addedAt,
      updatedAt: editingList.lastModified,
    } as DistributionList;
  }, [editingList]);

  // Loading State
  const loading = isLoadingProjects || isLoadingMasters;

  if (loading) {
    return <LoadingSpinner message={t('loading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header mit Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Heading level={3}>{t('title')}</Heading>
          <Text className="text-gray-500 mt-1">
            {listCountText}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <PlusIcon className="w-4 h-4" />
            {t('newList')}
          </Button>
        </div>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex items-center gap-2">
        <ListSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('searchPlaceholder')}
        />
        <ListFilterButton
          categoryOptions={categoryOptions}
          typeOptions={projectListTypeOptions}
          selectedCategories={selectedCategories}
          selectedTypes={selectedTypes}
          onCategoryChange={setSelectedCategories}
          onTypeChange={setSelectedTypes}
          onReset={() => {
            setSelectedCategories([]);
            setSelectedTypes([]);
          }}
        />
      </div>

      {/* Results Info */}
      {filteredProjectLists.length > 0 && (
        <ListStatsBar
          filteredCount={filteredProjectLists.length}
          totalCount={projectLists.length}
          itemLabel={t('itemLabel')}
        />
      )}

      {/* Projekt-Listen Tabelle */}
      {filteredProjectLists.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <ListTableHeader
            columns={tableColumns}
          />

          {/* Body */}
          <div className="divide-y divide-gray-200">
            {filteredProjectLists.map((list) => {
              const masterList = list.masterListId ? masterListDetails.get(list.masterListId) : undefined;
              return (
                <ProjectListRow
                  key={list.id}
                  list={list}
                  masterListDetails={masterList}
                  onViewDetails={() => handleViewDetails(list)}
                  onEdit={list.type === 'custom' ? () => handleEditList(list) : undefined}
                  onExport={() => handleExportList(list)}
                  onDelete={() => list.id && handleUnlinkList(list.id)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyListState
          icon={UsersIcon}
          title={t('emptyState.title')}
          description={emptyStateDescription}
        />
      )}

      {/* Verfügbare Master-Listen */}
      {availableMasterLists.length > 0 && (
        <div className="mt-12">
          <MasterListBrowser
            lists={availableMasterLists}
            linkedListIds={linkedListIds}
            onLink={handleLinkMasterList}
            onUnlink={async (masterListId: string) => {
              // Finde die projektListId die mit dieser masterListId verknüpft ist
              const linkedProjectList = projectLists.find(
                pl => pl.masterListId === masterListId && pl.type === 'linked'
              );
              if (linkedProjectList?.id) {
                await handleUnlinkList(linkedProjectList.id);
              }
            }}
          />
        </div>
      )}

      {/* Modal für neue Liste */}
      {showCreateModal && user && (
        <ListModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProjectList}
          userId={user.uid}
          organizationId={organizationId}
        />
      )}

      {/* Modal für Liste bearbeiten */}
      {showEditModal && user && editingListModalData && (
        <ListModal
          list={editingListModalData}
          onClose={() => {
            setShowEditModal(false);
            setEditingList(null);
          }}
          onSave={handleUpdateProjectList}
          userId={user.uid}
          organizationId={organizationId}
        />
      )}

      {/* Listen-Details Modal */}
      <ListDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedList(null);
        }}
        list={selectedList}
        type="project"
      />
    </div>
  );
}