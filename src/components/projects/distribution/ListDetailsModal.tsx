// src/components/projects/distribution/ListDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { DistributionList } from '@/types/lists';
import { ProjectDistributionList, projectListsService } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { tagsService } from '@/lib/firebase/crm-service';
import { publicationService } from '@/lib/firebase/library-service';
import { ContactEnhanced, Tag } from '@/types/crm-enhanced';
import { Publication } from '@/types/library';
import { toastService } from '@/lib/utils/toast';

// Sub-Komponenten
import ListInfoHeader from './components/details/ListInfoHeader';
import ListFiltersDisplay from './components/details/ListFiltersDisplay';
import ListContactsPreview from './components/details/ListContactsPreview';
import EmptyContactsState from './components/details/EmptyContactsState';

interface Props {
  open: boolean;
  onClose: () => void;
  list: DistributionList | ProjectDistributionList | null;
  type: 'master' | 'project';
}

export default function ListDetailsModal({ open, onClose, list, type }: Props) {
  const t = useTranslations('projects.distribution.listDetails');
  const tToast = useTranslations('toasts');
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !list) {
      setContacts([]);
      setTags([]);
      setPublications([]);
      return;
    }

    async function loadData() {
      if (!list) return;

      setLoading(true);
      try {
        const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
        const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);

        const organizationId = isProjectList(list)
          ? list.organizationId
          : isMasterList(list)
            ? (list.organizationId || list.userId)
            : undefined;

        // Load contacts
        if (type === 'project' && list.id) {
          const projectContacts = await projectListsService.getProjectListContacts(list.id);
          setContacts(projectContacts);
        } else if (type === 'master') {
          const masterContacts = await listsService.getContacts(list as DistributionList);
          setContacts(masterContacts);
        }

        // Load tags and publications if organizationId available
        if (organizationId) {
          const [loadedTags, loadedPublications] = await Promise.all([
            tagsService.getAll(organizationId),
            publicationService.searchPublications(organizationId, {})
          ]);
          setTags(loadedTags);
          setPublications(loadedPublications);
        }
      } catch (error) {
        toastService.error(tToast('listDetailsLoadError'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open, list, type]);

  if (!list) return null;

  const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
  const projectList = isProjectList(list) ? list : null;

  const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);
  const masterList = isMasterList(list) ? list : null;

  const listName = masterList?.name || projectList?.name || t('unknown');
  const listDescription = masterList?.description || projectList?.description;
  const listCategory = masterList?.category || projectList?.category || 'custom';
  const listType = masterList?.type || projectList?.listType || 'static';
  const contactCount = contacts.length;
  const filters = masterList?.filters || projectList?.filters;

  return (
    <Dialog open={open} onClose={onClose} size="4xl">
      <DialogTitle>{listName}</DialogTitle>
      <DialogBody className="px-6 py-6">
        {/* Listen-Informationen Header */}
        <ListInfoHeader
          listName={listName}
          listCategory={listCategory}
          listType={listType}
          contactCount={contactCount}
          listDescription={listDescription}
        />

        {/* Filter-Anzeige */}
        {listType === 'dynamic' && filters && (
          <ListFiltersDisplay
            filters={filters}
            tags={tags}
            publications={publications}
          />
        )}

        {/* Kontakte-Vorschau */}
        {contacts.length > 0 ? (
          <ListContactsPreview
            contacts={contacts}
            contactCount={contactCount}
            loading={loading}
          />
        ) : (
          <EmptyContactsState listType={listType} />
        )}
      </DialogBody>
    </Dialog>
  );
}
