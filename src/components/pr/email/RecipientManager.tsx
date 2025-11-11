// src/components/pr/email/RecipientManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ManualRecipient } from '@/types/email-composer';
import { DistributionList } from '@/types/lists';
import { listsService } from '@/lib/firebase/lists-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/20/solid';

interface RecipientManagerProps {
  selectedListIds: string[]; // Read-only: kommt aus der Kampagne
  manualRecipients: ManualRecipient[];
  onListsChange: (listIds: string[], listNames: string[], totalFromLists: number) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  recipientCount: number;
}

export default function RecipientManager({
  selectedListIds,
  manualRecipients,
  onListsChange,
  onAddManualRecipient,
  onRemoveManualRecipient,
  recipientCount
}: RecipientManagerProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [campaignLists, setCampaignLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Lade nur die ausgewählten Kampagnen-Listen
  useEffect(() => {
    const loadCampaignLists = async () => {
      if (!user || !currentOrganization || selectedListIds.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Lade nur die Listen die in selectedListIds sind
        const listPromises = selectedListIds.map(listId =>
          listsService.getById(listId, currentOrganization.id, user.uid)
        );
        const loadedLists = await Promise.all(listPromises);
        setCampaignLists(loadedLists.filter(Boolean) as DistributionList[]);
      } catch (error) {
        console.error('Fehler beim Laden der Kampagnen-Listen:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaignLists();
  }, [user, currentOrganization, selectedListIds]);

  // Berechne Gesamt-Empfänger aus Listen
  const listRecipientCount = campaignLists.reduce((sum, list) => sum + (list.contactCount || 0), 0);

  // Berechne totale Empfänger (Listen + Manuelle)
  const totalRecipientCount = listRecipientCount + manualRecipients.length;

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
            Keine Verteilerlisten für diese Kampagne definiert
          </div>
        ) : (
          <div className="space-y-3">
            {campaignLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50"
              >
                <UserGroupIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{list.name}</div>
                  {list.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{list.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
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
          Zusätzliche Empfänger
        </h4>

        {manualRecipients.length > 0 && (
          <div className="space-y-2 mb-3">
            {manualRecipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {recipient.firstName} {recipient.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{recipient.email}</div>
                  {recipient.companyName && (
                    <div className="text-sm text-gray-500">{recipient.companyName}</div>
                  )}
                  {!recipient.isValid && recipient.validationError && (
                    <div className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      {recipient.validationError}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemoveManualRecipient(recipient.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  title="Entfernen"
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
          Empfänger manuell hinzufügen
        </Button>
      </div>

      {/* Gesamt-Zusammenfassung */}
      {totalRecipientCount > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Gesamt</span>
          <span className="text-lg font-bold text-blue-900">{totalRecipientCount} Empfänger</span>
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vorname ist erforderlich';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nachname ist erforderlich';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
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
      onClose();
      // Reset form
      setFormData({
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
      <DialogTitle className="px-6 pt-6">Empfänger hinzufügen</DialogTitle>
      <DialogBody className="px-6 pb-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                Vorname *
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
                Nachname *
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
              E-Mail-Adresse *
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
              Firma (optional)
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
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSubmit}>
          <UserPlusIcon />
          Hinzufügen
        </Button>
      </DialogActions>
    </Dialog>
  );
}