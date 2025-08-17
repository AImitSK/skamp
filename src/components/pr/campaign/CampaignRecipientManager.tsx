// src/components/pr/campaign/CampaignRecipientManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { DistributionList } from '@/types/lists';
import { listsService } from '@/lib/firebase/lists-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  UserGroupIcon, 
  UserPlusIcon, 
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { Checkbox } from '@/components/ui/checkbox';

interface ManualRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  isValid: boolean;
  validationError?: string;
}

interface CampaignRecipientManagerProps {
  selectedListIds: string[];
  selectedListNames: string[];
  manualRecipients: ManualRecipient[];
  onListsChange: (listIds: string[], listNames: string[], totalFromLists: number) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  recipientCount: number;
  className?: string;
  // PM-Integration
  campaignDistributionListIds?: string[];
  campaignDistributionListNames?: string[];
  campaignRecipientCount?: number;
}

export default function CampaignRecipientManager({
  selectedListIds,
  selectedListNames,
  manualRecipients,
  onListsChange,
  onAddManualRecipient,
  onRemoveManualRecipient,
  recipientCount,
  className,
  campaignDistributionListIds,
  campaignDistributionListNames,
  campaignRecipientCount
}: CampaignRecipientManagerProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Lade Verteilerlisten
  useEffect(() => {
    const loadLists = async () => {
      if (!user || !currentOrganization) return;
      
      setLoading(true);
      try {
        const userLists = await listsService.getAll(currentOrganization.id, user.uid);
        setLists(userLists);
      } catch (error) {
        console.error('Fehler beim Laden der Listen:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [user, currentOrganization]);

  // PM-Vorausfüllung: Kampagnen-Verteilerlisten beim ersten Laden setzen
  useEffect(() => {
    // Nur einmal beim ersten Laden ausführen und nur wenn keine Listen ausgewählt sind
    if (!hasInitialized && selectedListIds.length === 0 && lists.length > 0) {
      setHasInitialized(true);
      
      // Prüfe ob die Kampagne Verteilerlisten hat
      if (campaignDistributionListIds && campaignDistributionListIds.length > 0) {
        console.log('📋 PM-Vorauswahl der Kampagnen-Verteilerlisten:', campaignDistributionListIds);
        
        // Berechne totale Empfänger aus vorausgewählten Listen
        const preselectedLists = lists.filter(list => campaignDistributionListIds.includes(list.id!));
        const totalFromLists = preselectedLists.reduce((sum, list) => sum + (list.contactCount || 0), 0);
        
        // Setze die Kampagnen-Verteilerlisten als vorausgewählt
        onListsChange(
          campaignDistributionListIds,
          campaignDistributionListNames || preselectedLists.map(l => l.name),
          totalFromLists
        );
      }
    }
  }, [lists, hasInitialized, selectedListIds.length, campaignDistributionListIds, campaignDistributionListNames, onListsChange]);

  // Gefilterte Listen
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler für Listen-Auswahl
  const handleListToggle = (listId: string) => {
    let newSelectedIds: string[];
    
    if (selectedListIds.includes(listId)) {
      newSelectedIds = selectedListIds.filter(id => id !== listId);
    } else {
      newSelectedIds = [...selectedListIds, listId];
    }

    const selectedLists = lists.filter(list => newSelectedIds.includes(list.id!));
    const selectedNames = selectedLists.map(list => list.name);
    const totalFromLists = selectedLists.reduce((sum, list) => sum + (list.contactCount || 0), 0);

    onListsChange(newSelectedIds, selectedNames, totalFromLists);
  };

  // Berechne Gesamt-Empfänger aus Listen
  const listRecipientCount = lists
    .filter(list => selectedListIds.includes(list.id!))
    .reduce((sum, list) => sum + (list.contactCount || 0), 0);

  // Berechne totale Empfänger (Listen + Manuelle)
  const totalRecipientCount = listRecipientCount + manualRecipients.length;

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <UsersIcon className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Verteiler</h3>
      </div>
      
      {/* Info-Box wenn Kampagnen-Listen vorausgewählt wurden */}
      {campaignDistributionListIds && campaignDistributionListIds.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3 mb-6">
          <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Kampagnen-Verteilerlisten</p>
            <p className="text-blue-800">
              Die für diese Kampagne definierten Verteilerlisten wurden automatisch vorausgewählt. 
              Sie können die Auswahl bei Bedarf anpassen.
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Verteilerlisten */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-3">Verteilerlisten</h4>
          
          <div className="space-y-3">
            {/* Suche */}
            <Input
              type="text"
              placeholder="Listen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Listen */}
            <div className="max-h-60 overflow-y-auto border rounded-lg bg-white">
              {filteredLists.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Keine Listen gefunden' : 'Keine Verteilerlisten vorhanden'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLists.map((list) => (
                    <label
                      key={list.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedListIds.includes(list.id!)}
                        onChange={() => handleListToggle(list.id!)}
                        className="!h-4 !w-4 !min-h-[16px] !min-w-[16px] !max-h-[16px] !max-w-[16px]"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{list.name}</span>
                          <span className="text-sm text-gray-500">
                            {list.contactCount || 0} Kontakte
                          </span>
                        </div>
                        {list.description && (
                          <p className="text-sm text-gray-600 mt-0.5">{list.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Listen-Zusammenfassung */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {selectedListIds.length} {selectedListIds.length === 1 ? 'Liste' : 'Listen'} ausgewählt
              </span>
              <span className="font-medium text-gray-900">
                {listRecipientCount} Empfänger aus Listen
              </span>
            </div>
          </div>
        </div>

        {/* Manuelle Empfänger */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-3">Zusätzliche Empfänger</h4>

          {manualRecipients.length > 0 && (
            <div className="space-y-2 mb-3">
              {manualRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg group border"
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
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 flex items-center gap-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            Empfänger manuell hinzufügen
          </Button>
        </div>

        {/* Gesamt-Zusammenfassung */}
        <div className="bg-blue-50 rounded-lg p-4 border">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Empfänger-Übersicht</h4>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-blue-700">Aus Verteilerlisten:</dt>
              <dd className="font-medium text-blue-900">{listRecipientCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-blue-700">Manuell hinzugefügt:</dt>
              <dd className="font-medium text-blue-900">{manualRecipients.length}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <dt className="text-blue-700 font-medium">Gesamt:</dt>
              <dd className="font-bold text-blue-900">{totalRecipientCount} Empfänger</dd>
            </div>
          </dl>
        </div>
      </div>

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