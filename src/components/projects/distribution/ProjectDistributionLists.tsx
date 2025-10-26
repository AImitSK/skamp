// src/components/projects/distribution/ProjectDistributionLists.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { DistributionList } from '@/types/lists';
import MasterListBrowser from './MasterListBrowser';
import ListModal from '@/app/dashboard/contacts/lists/ListModal';
import ListDetailsModal from './ListDetailsModal';
import { toastService } from '@/lib/utils/toast';
import Papa from 'papaparse';

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
  const { user } = useAuth();
  const [projectLists, setProjectLists] = useState<ProjectDistributionList[]>([]);
  const [masterLists, setMasterLists] = useState<DistributionList[]>([]);
  const [masterListDetails, setMasterListDetails] = useState<Map<string, DistributionList>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<ProjectDistributionList | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ProjectDistributionList | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (projectId && organizationId) {
      loadData();
    }
  }, [projectId, organizationId, loadData]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pLists = await projectListsService.getProjectLists(projectId);
      setProjectLists(pLists);

      const mLists = await listsService.getAll(organizationId);
      setMasterLists(mLists);

      const linkedMasterIds = pLists
        .filter(l => l.type === 'linked' && l.masterListId)
        .map(l => l.masterListId!);

      if (linkedMasterIds.length > 0) {
        const details = await projectListsService.getMasterListsWithDetails(linkedMasterIds);
        const detailsMap = new Map<string, DistributionList>();
        details.forEach(d => {
          if (d.id) detailsMap.set(d.id, d);
        });
        setMasterListDetails(detailsMap);
      }
    } catch (error) {
      toastService.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [projectId, organizationId]);

  const handleLinkMasterList = useCallback(async (masterListId: string) => {
    if (!user) return;
    try {
      await projectListsService.linkMasterList(projectId, masterListId, user.uid, organizationId);
      await loadData();
      toastService.success('Liste erfolgreich verknüpft');
    } catch (error) {
      toastService.error('Fehler beim Verknüpfen der Liste');
    }
  }, [user, projectId, organizationId, loadData]);

  const handleCreateProjectList = useCallback(async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      await projectListsService.createProjectList(
        projectId,
        {
          name: listData.name,
          description: listData.description,
          category: listData.category,
          type: listData.type,
          filters: listData.filters,
          contactIds: listData.contactIds,
        },
        user.uid,
        organizationId
      );
      await loadData();
      setShowCreateModal(false);
      toastService.success('Liste erfolgreich erstellt');
    } catch (error) {
      toastService.error('Fehler beim Erstellen der Liste');
    }
  }, [user, projectId, organizationId, loadData]);

  const handleUpdateProjectList = useCallback(async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !editingList?.id) return;
    try {
      await projectListsService.updateProjectList(editingList.id, {
        name: listData.name,
        description: listData.description,
        category: listData.category,
        listType: listData.type,
        filters: listData.filters,
        contactIds: listData.contactIds,
      });
      await loadData();
      setShowEditModal(false);
      setEditingList(null);
      toastService.success('Liste erfolgreich aktualisiert');
    } catch (error) {
      toastService.error('Fehler beim Aktualisieren der Liste');
    }
  }, [user, editingList, loadData]);

  const handleEditList = useCallback((list: ProjectDistributionList) => {
    setEditingList(list);
    setShowEditModal(true);
  }, []);

  const handleUnlinkList = useCallback(async (listId: string) => {
    try {
      await projectListsService.unlinkList(projectId, listId);
      await loadData();
      toastService.success('Verknüpfung erfolgreich entfernt');
    } catch (error) {
      toastService.error('Fehler beim Entfernen der Verknüpfung');
    }
  }, [projectId, loadData]);

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
      toastService.success('Liste erfolgreich exportiert');
    } catch (error) {
      toastService.error('Fehler beim Exportieren der Liste');
    }
  }, []);

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

  // Alle Master-Listen anzeigen (nicht mehr filtern nach verknüpft/nicht-verknüpft)
  const availableMasterLists = masterLists;

  const filteredProjectLists = useMemo(() => {
    return projectLists.filter(list => {
      if (searchTerm) {
        const listName = list.name || masterListDetails.get(list.masterListId || '')?.name || '';
        if (!listName.toLowerCase().includes(searchTerm.toLowerCase())) {
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
  }, [projectLists, searchTerm, selectedTypes, selectedCategories, masterListDetails]);

  // Filter-Status berechnen
  const activeFiltersCount = useMemo(() => {
    return selectedCategories.length + selectedTypes.length;
  }, [selectedCategories.length, selectedTypes.length]);

  // Listen-Zähler Text
  const listCountText = useMemo(() => {
    return `${projectLists.length} ${projectLists.length === 1 ? 'Liste' : 'Listen'} verknüpft`;
  }, [projectLists.length]);

  // Empty State Beschreibung
  const emptyStateDescription = useMemo(() => {
    return searchTerm
      ? 'Versuchen Sie andere Suchbegriffe'
      : 'Verknüpfen Sie eine Master-Liste oder erstellen Sie eine neue';
  }, [searchTerm]);

  // Tabellen-Spalten Konfiguration
  const tableColumns = useMemo(() => [
    { label: 'Name', width: 'w-[35%]' },
    { label: 'Kategorie', width: 'w-[15%]' },
    { label: 'Typ', width: 'w-[15%]' },
    { label: 'Kontakte', width: 'w-[12%]' },
    { label: 'Hinzugefügt', width: 'flex-1' },
  ], []);

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
      organizationId: editingList.organizationId,
      createdBy: editingList.addedBy,
      createdAt: editingList.addedAt,
      updatedAt: editingList.lastModified,
    } as DistributionList;
  }, [editingList]);

  if (loading) {
    return <LoadingSpinner message="Lade Verteilerlisten..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header mit Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Heading level={3}>Projekt-Verteiler</Heading>
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
            Neue Liste
          </Button>
        </div>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex items-center gap-2">
        <ListSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Suchen..."
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
          itemLabel="Listen"
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
          title="Keine Listen gefunden"
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