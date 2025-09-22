// src/components/projects/distribution/ProjectDistributionLists.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import {
  LinkIcon,
  PlusIcon,
  UsersIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { DistributionList } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';
import MasterListBrowser from './MasterListBrowser';
import ProjectListCard from './ProjectListCard';
import ListModal from '@/app/dashboard/contacts/lists/ListModal';
import Papa from 'papaparse';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (projectId && organizationId) {
      loadData();
    }
  }, [projectId, organizationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Projekt-Listen laden
      const pLists = await projectListsService.getProjectLists(projectId);
      setProjectLists(pLists);

      // Master-Listen laden
      const mLists = await listsService.getAll(organizationId);
      setMasterLists(mLists);

      // Details für verknüpfte Master-Listen laden
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
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkMasterList = async (masterListId: string) => {
    if (!user) return;

    try {
      await projectListsService.linkMasterList(
        projectId,
        masterListId,
        user.uid,
        organizationId
      );
      await loadData();
    } catch (error) {
      console.error('Fehler beim Verknüpfen der Liste:', error);
    }
  };

  const handleCreateProjectList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      await projectListsService.createProjectList(
        projectId,
        {
          name: listData.name,
          description: listData.description,
          filters: listData.filters,
          contactIds: listData.contactIds,
        },
        user.uid,
        organizationId
      );
      await loadData();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Fehler beim Erstellen der Projekt-Liste:', error);
    }
  };

  const handleUnlinkList = async (listId: string) => {
    try {
      await projectListsService.unlinkList(projectId, listId);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Entfernen der Verknüpfung:', error);
    }
  };

  const handleExportList = async (projectList: ProjectDistributionList) => {
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
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
    }
  };

  // Gefilterte Listen für verknüpfte Listen
  const linkedListIds = projectLists
    .filter(l => l.type === 'linked')
    .map(l => l.masterListId)
    .filter(Boolean) as string[];

  // Verfügbare Master-Listen (noch nicht verknüpft)
  const availableMasterLists = masterLists.filter(
    list => list.id && !linkedListIds.includes(list.id)
  );

  // Filter für Anzeige
  const filteredProjectLists = projectLists.filter(list => {
    if (searchTerm) {
      const listName = list.name || masterListDetails.get(list.masterListId || '')?.name || '';
      if (!listName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'linked' && list.type !== 'linked') return false;
      if (selectedCategory === 'custom' && list.type !== 'custom') return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Verteilerlisten...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Heading level={3}>Projekt-Verteiler</Heading>
          <Text className="text-gray-500 mt-1">
            {projectLists.length} {projectLists.length === 1 ? 'Liste' : 'Listen'} verknüpft
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Neue Liste
          </Button>
        </div>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Listen durchsuchen..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            plain
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'font-semibold' : ''}
          >
            Alle
          </Button>
          <Button
            plain
            onClick={() => setSelectedCategory('linked')}
            className={selectedCategory === 'linked' ? 'font-semibold' : ''}
          >
            Verknüpft
          </Button>
          <Button
            plain
            onClick={() => setSelectedCategory('custom')}
            className={selectedCategory === 'custom' ? 'font-semibold' : ''}
          >
            Projekt-eigen
          </Button>
        </div>
      </div>

      {/* Projekt-Listen */}
      {filteredProjectLists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjectLists.map((list) => (
            <ProjectListCard
              key={list.id}
              projectList={list}
              masterList={list.masterListId ? masterListDetails.get(list.masterListId) : undefined}
              onUnlink={() => list.id && handleUnlinkList(list.id)}
              onExport={() => handleExportList(list)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <Heading level={3} className="mt-2">Keine Listen gefunden</Heading>
          <Text className="mt-1 text-gray-500">
            {searchTerm
              ? 'Versuchen Sie andere Suchbegriffe'
              : 'Verknüpfen Sie eine Master-Liste oder erstellen Sie eine neue'}
          </Text>
        </div>
      )}

      {/* Verfügbare Master-Listen */}
      {availableMasterLists.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <MasterListBrowser
            lists={availableMasterLists}
            onLink={handleLinkMasterList}
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
    </div>
  );
}