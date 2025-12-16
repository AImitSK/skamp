// src/components/pr/email/RecipientManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ManualRecipient } from '@/types/email-composer';
import { DistributionList, ListCategory } from '@/types/lists';
import { listsService } from '@/lib/firebase/lists-service';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { toastService } from '@/lib/utils/toast';
import {
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/20/solid';

interface RecipientManagerProps {
  selectedListIds: string[]; // Read-only: kommt aus der Kampagne
  projectLists: ProjectDistributionList[]; // NEU: Komplette Projekt-Listen
  manualRecipients: ManualRecipient[];
  onListsChange: (listIds: string[], listNames: string[], totalFromLists: number) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  recipientCount: number;
}

export default function RecipientManager({
  selectedListIds,
  projectLists,
  manualRecipients,
  onListsChange,
  onAddManualRecipient,
  onRemoveManualRecipient,
  recipientCount
}: RecipientManagerProps) {
  const t = useTranslations('email.recipientManager');
  const tToast = useTranslations('email.recipientManager');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [campaignLists, setCampaignLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Lade nur die ausgewählten Kampagnen-Listen
  useEffect(() => {
    const loadCampaignLists = async () => {
      console.log('🔍 RecipientManager: selectedListIds:', selectedListIds);
      console.log('🔍 RecipientManager: projectLists:', projectLists);

      if (!user || !currentOrganization || selectedListIds.length === 0) {
        console.log('⚠️ RecipientManager: Keine Listen zu laden', { user: !!user, org: !!currentOrganization, listIdsLength: selectedListIds.length });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('🔍 RecipientManager: Lade Listen für IDs:', selectedListIds);

        const loadedLists: DistributionList[] = [];

        // Unterscheide zwischen linked und custom Listen
        for (const listId of selectedListIds) {
          // Finde die ProjectDistributionList für diese ID
          const projectList = projectLists.find(pl =>
            (pl.type === 'linked' && pl.masterListId === listId) ||
            (pl.type === 'custom' && pl.id === listId)
          );

          console.log('🔍 RecipientManager: projectList für', listId, ':', projectList);

          if (!projectList) {
            console.log('⚠️ RecipientManager: Keine projectList gefunden für ID:', listId);
            continue;
          }

          if (projectList.type === 'linked' && projectList.masterListId) {
            // Linked List: Lade aus distribution_lists
            const masterList = await listsService.getById(projectList.masterListId);
            if (masterList) {
              loadedLists.push(masterList);
            }
          } else if (projectList.type === 'custom') {
            // Custom List: Konvertiere zu DistributionList Format
            const customList: DistributionList = {
              id: projectList.id!,
              name: projectList.name || 'Unbenannte Liste',
              description: projectList.description || '',
              type: 'static' as const,
              organizationId: projectList.organizationId,
              userId: projectList.addedBy,
              createdAt: projectList.addedAt,
              updatedAt: projectList.lastModified,
              contactIds: projectList.contactIds || [],
              contactCount: projectList.cachedContactCount || projectList.contactIds?.length || 0,
              category: (projectList.category || 'custom') as ListCategory,
              filters: projectList.filters || {}
            };
            loadedLists.push(customList);
          }
        }

        console.log('✅ RecipientManager: Listen geladen:', loadedLists);
        setCampaignLists(loadedLists);
      } catch (error) {
        console.error('❌ RecipientManager: Fehler beim Laden:', error);
        toastService.error(tToast('loadListsError'));
      } finally {
        setLoading(false);
      }
    };

    loadCampaignLists();
  }, [user, currentOrganization, selectedListIds, projectLists]);

  // Berechne Gesamt-Empfänger aus Listen
  const listRecipientCount = campaignLists.reduce((sum, list) => sum + (list.contactCount || 0), 0);

  // Berechne totale Empfänger (Listen + Manuelle)
  const totalRecipientCount = listRecipientCount + manualRecipients.length;

  // WICHTIG: Informiere Parent über Änderungen (totalCount updaten)
  useEffect(() => {
    if (campaignLists.length > 0 && !loading) {
      const listNames = campaignLists.map(list => list.name);
      onListsChange(selectedListIds, listNames, listRecipientCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignLists, listRecipientCount, loading, selectedListIds]);
  // WICHTIG: onListsChange NICHT in deps - sonst Endlosschleife!

  return (
    <div className="space-y-6">
      {/* Verteilerlisten (Read-Only) */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
          </div>
        ) : campaignLists.length === 0 ? (
          <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">
            {t('noListsDefined')}
          </div>
        ) : (
          <div className="space-y-2">
            {campaignLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
              >
                <UserGroupIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium text-gray-900">
                  {list.name}
                </div>
                <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
                  <UserGroupIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{list.contactCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manuelle Empfänger */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <UserPlusIcon className="h-5 w-5 text-gray-500" />
          {t('additionalRecipients')}
        </h4>

        {manualRecipients.length > 0 && (
          <div className="space-y-2 mb-3">
            {manualRecipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
              >
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="font-medium">{recipient.firstName} {recipient.lastName}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{recipient.email}</span>
                  </div>
                  {!recipient.isValid && recipient.validationError && (
                    <div className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      {recipient.validationError}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemoveManualRecipient(recipient.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded flex-shrink-0"
                  title={t('removeRecipient')}
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          plain
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <UserPlusIcon className="h-4 w-4" />
          {t('addRecipientButton')}
        </Button>
      </div>

      {/* Gesamt-Zusammenfassung */}
      {totalRecipientCount > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">{t('total')}</span>
          <span className="text-sm font-bold text-blue-900">{t('recipientCount', { count: totalRecipientCount })}</span>
        </div>
      )}

      {/* Modal für manuelle Eingabe */}
      <AddRecipientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddManualRecipient}
      />
    </div>
  );
}

// Modal für manuelle Empfänger-Eingabe
function AddRecipientModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (recipient: Omit<ManualRecipient, 'id'>) => void;
}) {
  const t = useTranslations('email.recipientManager');
  const tToast = useTranslations('email.recipientManager');
  const [formData, setFormData] = useState({
    salutation: '',
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    companyName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.salutation.trim()) {
      newErrors.salutation = t('validation.salutationRequired');
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('validation.firstNameRequired');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('validation.lastNameRequired');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onAdd({
        ...formData,
        isValid: true
      });
      toastService.success(tToast('recipientAdded', { firstName: formData.firstName, lastName: formData.lastName }));
      onClose();
      // Reset form
      setFormData({
        salutation: '',
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        companyName: ''
      });
      setErrors({});
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle className="px-6 pt-6">{t('modal.title')}</DialogTitle>
      <DialogBody className="px-6 pb-2">
        <div className="space-y-4">
          {/* Anrede und Titel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="salutation" className="block text-sm font-medium mb-1">
                {t('modal.salutationLabel')}
              </label>
              <select
                id="salutation"
                value={formData.salutation}
                onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent ${
                  errors.salutation ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">{t('modal.selectPlaceholder')}</option>
                <option value="Herr">{t('modal.salutation.mr')}</option>
                <option value="Frau">{t('modal.salutation.ms')}</option>
                <option value="Divers">{t('modal.salutation.diverse')}</option>
              </select>
              {errors.salutation && (
                <p className="text-sm text-red-600 mt-1">{errors.salutation}</p>
              )}
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                {t('modal.titleLabel')}
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('modal.titlePlaceholder')}
              />
            </div>
          </div>

          {/* Vorname und Nachname */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                {t('modal.firstNameLabel')}
              </label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={errors.firstName ? 'border-red-300' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                {t('modal.lastNameLabel')}
              </label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={errors.lastName ? 'border-red-300' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              {t('modal.emailLabel')}
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-red-300' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium mb-1">
              {t('modal.companyLabel')}
            </label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
        </div>
      </DialogBody>
      <DialogActions className="px-6 pb-6">
        <Button plain onClick={onClose}>{t('modal.cancelButton')}</Button>
        <Button onClick={handleSubmit}>
          <UserPlusIcon />
          {t('modal.addButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}