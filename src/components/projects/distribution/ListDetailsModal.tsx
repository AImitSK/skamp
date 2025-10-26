// src/components/projects/distribution/ListDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';
import { ProjectDistributionList, projectListsService } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface Props {
  open: boolean;
  onClose: () => void;
  list: DistributionList | ProjectDistributionList | null;
  type: 'master' | 'project';
}

export default function ListDetailsModal({ open, onClose, list, type }: Props) {
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !list) {
      setContacts([]);
      return;
    }

    async function loadContacts() {
      setLoading(true);
      try {
        if (type === 'project' && list.id) {
          // Projekt-Liste
          const projectContacts = await projectListsService.getProjectListContacts(list.id);
          setContacts(projectContacts);
        } else if (type === 'master') {
          // Master-Liste
          const masterContacts = await listsService.getContacts(list as DistributionList);
          setContacts(masterContacts);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Kontakte:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, [open, list, type]);

  if (!list) return null;

  // Helper für Projekt-Listen
  const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
  const projectList = isProjectList(list) ? list : null;

  // Helper für Master-Listen
  const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);
  const masterList = isMasterList(list) ? list : null;

  // Liste-Informationen extrahieren
  const listName = masterList?.name || projectList?.name || 'Unbekannt';
  const listDescription = masterList?.description || projectList?.description;
  const listCategory = masterList?.category || projectList?.category || 'custom';
  const listType = masterList?.type || projectList?.listType || 'static';
  const contactCount = contacts.length;
  const filters = masterList?.filters || projectList?.filters;

  return (
    <Dialog open={open} onClose={onClose} size="3xl">
      <DialogTitle>{listName}</DialogTitle>
      <DialogBody className="space-y-6">
        {/* Listen-Informationen */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <Text className="text-xs text-gray-500 mb-1">Kategorie</Text>
              <Badge color="zinc" className="text-xs">
                {LIST_CATEGORY_LABELS[listCategory as keyof typeof LIST_CATEGORY_LABELS] || listCategory}
              </Badge>
            </div>
            <div>
              <Text className="text-xs text-gray-500 mb-1">Typ</Text>
              <Badge
                color={listType === 'dynamic' ? 'green' : 'blue'}
                className="text-xs"
              >
                {listType === 'dynamic' ? 'Dynamisch' : 'Statisch'}
              </Badge>
            </div>
            <div>
              <Text className="text-xs text-gray-500 mb-1">Kontakte</Text>
              <Text className="text-sm font-semibold text-gray-900">{contactCount}</Text>
            </div>
          </div>

          {listDescription && (
            <div>
              <Text className="text-xs text-gray-500 mb-1">Beschreibung</Text>
              <Text className="text-sm text-gray-700">{listDescription}</Text>
            </div>
          )}

          {/* Filter anzeigen (falls vorhanden) */}
          {filters && Object.keys(filters).length > 0 && (
            <div>
              <Text className="text-xs text-gray-500 mb-2">Aktive Filter</Text>
              <div className="flex flex-wrap gap-2">
                {filters.hasEmail && (
                  <Badge color="blue" className="text-xs">
                    <EnvelopeIcon className="h-3 w-3 mr-1" />
                    Hat E-Mail
                  </Badge>
                )}
                {filters.hasPhone && (
                  <Badge color="blue" className="text-xs">
                    <PhoneIcon className="h-3 w-3 mr-1" />
                    Hat Telefon
                  </Badge>
                )}
                {filters.tagIds && filters.tagIds.length > 0 && (
                  <Badge color="blue" className="text-xs">
                    Tags: {filters.tagIds.length}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Kontakte-Liste */}
        <div>
          <Text className="text-sm font-medium text-gray-900 mb-3">
            Kontakte ({contactCount})
          </Text>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <Text className="mt-2 text-gray-500">Lade Kontakte...</Text>
            </div>
          ) : contacts.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {contacts.map((contact) => (
                <div key={contact.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        {contact.emails && contact.emails.length > 0 && (
                          <div className="flex items-center gap-1">
                            <EnvelopeIcon className="h-3 w-3 text-gray-400" />
                            <Text className="text-xs text-gray-500 truncate">
                              {contact.emails[0].email}
                            </Text>
                          </div>
                        )}
                        {contact.phones && contact.phones.length > 0 && (
                          <div className="flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3 text-gray-400" />
                            <Text className="text-xs text-gray-500">
                              {contact.phones[0].number}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <UserIcon className="mx-auto h-10 w-10 text-gray-400" />
              <Text className="mt-2 text-gray-600">Keine Kontakte in dieser Liste</Text>
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}
