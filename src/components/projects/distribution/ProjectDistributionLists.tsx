// src/components/projects/distribution/ProjectDistributionLists.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Popover, Transition } from '@headlessui/react';
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
  FunnelIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
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

  // Alle Master-Listen anzeigen (nicht mehr filtern nach verknüpft/nicht-verknüpft)
  const availableMasterLists = masterLists;

  const filteredProjectLists = projectLists.filter(list => {
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

  // Filter Options
  const categoryOptions = [
    { value: 'press', label: 'Presse' },
    { value: 'customers', label: 'Kunden' },
    { value: 'partners', label: 'Partner' },
    { value: 'leads', label: 'Leads' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  const typeOptions = [
    { value: 'linked', label: 'Verknüpft' },
    { value: 'custom', label: 'Projekt' },
    { value: 'combined', label: 'Kombiniert' }
  ];

  const activeFiltersCount = selectedCategories.length + selectedTypes.length;

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
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <PlusIcon className="w-4 h-4" />
            Neue Liste
          </Button>
        </div>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suchen..."
            className={clsx(
              'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
              'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'h-10'
            )}
          />
        </div>

        {/* Filter Button */}
        <Popover className="relative">
          <Popover.Button
            className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
              activeFiltersCount > 0
                ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="Filter"
          >
            <FunnelIcon className="h-5 w-5 stroke-2" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                {activeFiltersCount}
              </span>
            )}
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
            <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Filter</h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCategories([]);
                        setSelectedTypes([]);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ
                  </label>
                  <div className="space-y-2">
                    {typeOptions.map((option) => {
                      const isChecked = selectedTypes.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedTypes, option.value]
                                : selectedTypes.filter(v => v !== option.value);
                              setSelectedTypes(newValues);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {categoryOptions.map((option) => {
                      const isChecked = selectedCategories.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedCategories, option.value]
                                : selectedCategories.filter(v => v !== option.value);
                              setSelectedCategories(newValues);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      </div>

      {/* Results Info */}
      {filteredProjectLists.length > 0 && (
        <div className="flex items-center justify-between">
          <Text className="text-sm text-zinc-600">
            {filteredProjectLists.length} von {projectLists.length} Listen
            {selectedListIds.size > 0 && (
              <span className="ml-2">
                • {selectedListIds.size} ausgewählt
              </span>
            )}
          </Text>

          {/* Bulk Delete Link */}
          {selectedListIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              {selectedListIds.size} Löschen
            </button>
          )}
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
                Kategorie
              </div>
              <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </div>
              <div className="w-[12%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontakte
              </div>
              <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              const category = list.category || masterList?.category || 'custom';
              const listType = list.listType || masterList?.type || 'static';
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
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {listName}
                        </p>
                        <div className="mt-1">
                          {list.type === 'linked' ? (
                            <Badge
                              className="text-xs whitespace-nowrap inline-flex items-center gap-1"
                              style={{
                                backgroundColor: '#DEDC00',
                                color: '#000000',
                                borderColor: '#DEDC00'
                              }}
                            >
                              <StarIcon className="h-3 w-3 text-black" fill="currentColor" />
                              Verknüpft
                            </Badge>
                          ) : (
                            <Badge
                              color="zinc"
                              className="text-xs whitespace-nowrap inline-flex items-center gap-1"
                            >
                              {list.type === 'custom' && <FolderIcon className="h-3 w-3 text-gray-500" />}
                              {list.type === 'custom' ? 'Projekt' : 'Kombiniert'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Kategorie */}
                    <div className="w-[15%]">
                      {(category && category !== 'custom') && (
                        <Badge color="zinc" className="text-xs whitespace-nowrap">
                          {LIST_CATEGORY_LABELS[category as keyof typeof LIST_CATEGORY_LABELS] || category}
                        </Badge>
                      )}
                    </div>

                    {/* Typ */}
                    <div className="w-[15%]">
                      <Badge
                        color={listType === 'dynamic' ? 'green' : 'blue'}
                        className="text-xs whitespace-nowrap"
                      >
                        {listType === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                      </Badge>
                    </div>

                    {/* Kontakte */}
                    <div className="w-[12%]">
                      <span className="text-sm font-medium text-gray-700">
                        {contactCount.toLocaleString()}
                      </span>
                    </div>

                    {/* Datum */}
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">
                        {formatDate(list.addedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 stroke-[2.5]" />
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
    </div>
  );
}