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
import {
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  NewspaperIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { LANGUAGE_NAMES } from '@/types/international';

interface Props {
  open: boolean;
  onClose: () => void;
  list: DistributionList | ProjectDistributionList | null;
  type: 'master' | 'project';
}

function formatContactName(contact: any): string {
  if ('name' in contact && typeof contact.name === 'object') {
    const parts = [];
    if (contact.name.title) parts.push(contact.name.title);
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || 'Unbekannt';
  }
  if (contact.firstName || contact.lastName) {
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unbekannt';
  }
  return contact.name || 'Unbekannt';
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
          const projectContacts = await projectListsService.getProjectListContacts(list.id);
          setContacts(projectContacts);
        } else if (type === 'master') {
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

  const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
  const projectList = isProjectList(list) ? list : null;

  const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);
  const masterList = isMasterList(list) ? list : null;

  const listName = masterList?.name || projectList?.name || 'Unbekannt';
  const listDescription = masterList?.description || projectList?.description;
  const listCategory = masterList?.category || projectList?.category || 'custom';
  const listType = masterList?.type || projectList?.listType || 'static';
  const contactCount = contacts.length;
  const filters = masterList?.filters || projectList?.filters;

  const hasActiveFilters = filters && Object.keys(filters).length > 0 &&
    (filters.hasEmail || filters.hasPhone || (filters.tagIds && filters.tagIds.length > 0));

  return (
    <Dialog open={open} onClose={onClose} size="4xl">
      <DialogTitle>{listName}</DialogTitle>
      <DialogBody className="px-6 py-6">
        {/* Listen-Informationen Header */}
        <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-200">
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
            <Badge color="blue" className="text-xs font-semibold">
              {contactCount.toLocaleString()}
            </Badge>
          </div>
          {listDescription && (
            <div className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Beschreibung</Text>
              <Text className="text-sm text-gray-700">{listDescription}</Text>
            </div>
          )}
        </div>

        {/* Filter-Anzeige */}
        {hasActiveFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="h-4 w-4 text-gray-500" />
              <Text className="text-sm font-medium text-gray-900">Aktive Filter</Text>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.hasEmail && (
                <Badge color="blue" className="text-xs inline-flex items-center gap-1">
                  <EnvelopeIcon className="h-3 w-3" />
                  Hat E-Mail
                </Badge>
              )}
              {filters.hasPhone && (
                <Badge color="blue" className="text-xs inline-flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" />
                  Hat Telefon
                </Badge>
              )}
              {filters.tagIds && filters.tagIds.length > 0 && (
                <Badge color="blue" className="text-xs">
                  {filters.tagIds.length} Tag{filters.tagIds.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Kontakte-Vorschau */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Kontakte</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Lade...</span>
              </div>
            ) : (
              <Badge color="blue" className="whitespace-nowrap">
                {contactCount.toLocaleString()} Kontakte
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <Text className="mt-2 text-gray-500">Lade Kontakte...</Text>
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-1.5 px-2 bg-white rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-800">
                      {formatContactName(contact)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {contact.position && `${contact.position} • `}
                      {contact.companyName || 'Keine Firma'}
                    </div>
                    {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        <NewspaperIcon className="h-3 w-3 inline mr-1" />
                        Journalist
                        {(contact as any).mediaProfile.beats?.length ? ` • ${(contact as any).mediaProfile.beats.join(', ')}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {(('emails' in contact && contact.emails && contact.emails.length > 0) ||
                      ('email' in contact && contact.email)) && (
                      <EnvelopeIcon className="h-3 w-3 text-primary" title="Hat E-Mail" />
                    )}
                    {(('phones' in contact && contact.phones && contact.phones.length > 0) ||
                      ('phone' in contact && contact.phone)) && (
                      <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                    )}
                    {'communicationPreferences' in contact && (contact as any).communicationPreferences?.preferredLanguage && (
                      <span
                        className="text-xs text-gray-500 font-medium"
                        title={`Sprache: ${LANGUAGE_NAMES[(contact as any).communicationPreferences.preferredLanguage] || (contact as any).communicationPreferences.preferredLanguage}`}
                      >
                        {(contact as any).communicationPreferences.preferredLanguage.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
              <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <Text className="text-sm text-gray-600">
                {listType === 'dynamic'
                  ? "Keine Kontakte entsprechen den Filtern."
                  : "Noch keine Kontakte ausgewählt."
                }
              </Text>
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}
