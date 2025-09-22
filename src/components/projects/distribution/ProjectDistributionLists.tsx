// src/components/projects/distribution/ProjectDistributionLists.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  LinkIcon,
  PlusIcon,
  UsersIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  PencilIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';
import MasterListBrowser from './MasterListBrowser';
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
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId && organizationId) {
      loadData();
    }
  }, [projectId, organizationId]);

  const loadData = async () => {
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
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkMasterList = async (masterListId: string) => {
    if (!user) return;
    try {
      await projectListsService.linkMasterList(projectId, masterListId, user.uid, organizationId);
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListIds(new Set(filteredProjectLists.map(l => l.id!)));
    } else {
      setSelectedListIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedListIds.size === 0) return;

    try {
      await Promise.all(Array.from(selectedListIds).map(id =>
        projectListsService.unlinkList(projectId, id)
      ));
      await loadData();
      setSelectedListIds(new Set());
    } catch (error) {
      console.error('Fehler beim Löschen der Listen:', error);
    }
  };

  // Gefilterte Listen
  const linkedListIds = projectLists
    .filter(l => l.type === 'linked')
    .map(l => l.masterListId)
    .filter(Boolean) as string[];

  const availableMasterLists = masterLists.filter(
    list => list.id && !linkedListIds.includes(list.id)
  );

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

  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'press': return 'purple';
      case 'customers': return 'blue';
      case 'partners': return 'green';
      case 'leads': return 'amber';
      default: return 'zinc';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

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

      {/* Bulk Actions */}
      {selectedListIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <Text className="text-sm text-blue-700">
            {selectedListIds.size} {selectedListIds.size === 1 ? 'Liste' : 'Listen'} ausgewählt
          </Text>
          <Button
            onClick={handleBulkDelete}
            className="bg-red-600 hover:bg-red-700 text-white text-sm"
          >
            <TrashIcon className="w-4 h-4 mr-1" />
            Löschen
          </Button>
        </div>
      )}

      {/* Projekt-Listen Tabelle */}
      {filteredProjectLists.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <div className="flex items-center w-[35%]">
                <Checkbox
                  checked={filteredProjectLists.length > 0 && selectedListIds.size === filteredProjectLists.length}
                  indeterminate={selectedListIds.size > 0 && selectedListIds.size < filteredProjectLists.length}
                  onChange={(checked: boolean) => handleSelectAll(checked)}
                />
                <span className="ml-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </span>
              </div>
              <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </div>
              <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </div>
              <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                Kontakte
              </div>
              <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-right pr-14">
                Hinzugefügt
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200">
            {filteredProjectLists.map((list) => {
              const masterList = list.masterListId ? masterListDetails.get(list.masterListId) : undefined;
              const listName = list.name || masterList?.name || 'Unbenannte Liste';
              const listDescription = list.description || masterList?.description;
              const category = masterList?.category || 'custom';
              const contactCount = list.cachedContactCount || masterList?.contactCount || 0;

              return (
                <div key={list.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    {/* Name */}
                    <div className="flex items-center w-[35%]">
                      <Checkbox
                        checked={selectedListIds.has(list.id!)}
                        onChange={(checked: boolean) => {
                          const newIds = new Set(selectedListIds);
                          if (checked) newIds.add(list.id!);
                          else newIds.delete(list.id!);
                          setSelectedListIds(newIds);
                        }}
                      />
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {list.type === 'linked' && (
                            <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                          {list.type === 'custom' && (
                            <FolderIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {listName}
                          </span>
                        </div>
                        {listDescription && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {listDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Typ */}
                    <div className="w-[15%]">
                      <Badge
                        color={list.type === 'linked' ? 'blue' : list.type === 'custom' ? 'green' : 'purple'}
                        className="text-xs whitespace-nowrap"
                      >
                        {list.type === 'linked' ? 'Verknüpft' : list.type === 'custom' ? 'Projekt-eigen' : 'Kombiniert'}
                      </Badge>
                    </div>

                    {/* Kategorie */}
                    <div className="w-[15%]">
                      {masterList && (
                        <Badge color={getCategoryColor(category) as any} className="text-xs whitespace-nowrap">
                          {LIST_CATEGORY_LABELS[category as keyof typeof LIST_CATEGORY_LABELS] || category}
                        </Badge>
                      )}
                    </div>

                    {/* Kontakte */}
                    <div className="w-[10%] text-center">
                      <span className="text-sm font-medium text-gray-700">
                        {contactCount.toLocaleString()}
                      </span>
                    </div>

                    {/* Datum */}
                    <div className="flex-1 text-right pr-14">
                      <span className="text-sm text-gray-600">
                        {formatDate(list.addedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => handleExportList(list)}>
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Exportieren
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onClick={() => list.id && handleUnlinkList(list.id)}>
                            <TrashIcon className="h-4 w-4" />
                            <span className="text-red-600">
                              {list.type === 'linked' ? 'Verknüpfung entfernen' : 'Löschen'}
                            </span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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