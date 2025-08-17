// src/components/campaigns/CustomerContactSelector.tsx - Kunden-Kontakt Einzel-Auswahl
"use client";

import { useState, useEffect } from 'react';
import { CustomerContactSelectorProps, CustomerContact } from '@/types/approvals-enhanced';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { contactEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export function CustomerContactSelector({
  selectedContact,
  onContactChange,
  clientId
}: CustomerContactSelectorProps) {
  const { currentOrganization } = useOrganization();
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadCustomerContacts();
    }
  }, [clientId, currentOrganization]);

  const loadCustomerContacts = async () => {
    if (!clientId || !currentOrganization) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Lade echte Kontakte aus dem CRM
      const crmContacts = await contactEnhancedService.searchEnhanced(
        currentOrganization.id,
        {
          companyIds: [clientId]
        }
      );
      
      // Konvertiere CRM-Kontakte zu CustomerContact Format
      const customerContacts: CustomerContact[] = crmContacts.map(contact => ({
        contactId: contact.id!,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
        email: contact.email,
        companyName: contact.companyDetails?.name || '',
        role: contact.position || undefined
      }));
      
      setContacts(customerContacts);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden-Kontakte:', error);
      setError('Kunden-Kontakte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const selectedContactData = contacts.find(c => c.contactId === selectedContact);

  const handleContactSelect = (contactId: string) => {
    if (contactId === '') {
      onContactChange(undefined);
    } else {
      onContactChange(contactId);
    }
  };

  const getContactRoleBadgeColor = (role?: string) => {
    if (!role) return 'gray';
    
    if (role.toLowerCase().includes('geschäftsführer') || role.toLowerCase().includes('ceo')) {
      return 'purple';
    }
    if (role.toLowerCase().includes('marketing') || role.toLowerCase().includes('pr')) {
      return 'blue';  
    }
    return 'green';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
        <Text className="font-medium">Kunden-Kontakt für Freigabe</Text>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <Text className="text-sm text-red-800">{error}</Text>
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Text className="text-sm text-gray-600">
            Keine Kontakte für diesen Kunden gefunden. 
            Bitte fügen Sie zuerst Kontakte im CRM-System hinzu.
          </Text>
        </div>
      ) : (
        <>
          {/* Contact Selection */}
          <Select
            value={selectedContact || ''}
            onChange={(e) => handleContactSelect(e.target.value)}
            className="w-full"
          >
            <option value="">Bitte wählen Sie einen Kontakt aus...</option>
            {contacts.map((contact) => (
              <option key={contact.contactId} value={contact.contactId}>
                {contact.name} ({contact.role || 'Kontakt'}) - {contact.email}
              </option>
            ))}
          </Select>

          {/* Selected Contact Details */}
          {selectedContactData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Text className="font-medium text-green-900">
                      {selectedContactData.name}
                    </Text>
                    {selectedContactData.role && (
                      <Badge color={getContactRoleBadgeColor(selectedContactData.role)}>
                        {selectedContactData.role}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-green-700">
                      <EnvelopeIcon className="h-4 w-4" />
                      {selectedContactData.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-700">
                      <BuildingOfficeIcon className="h-4 w-4" />
                      {selectedContactData.companyName}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <Text className="text-sm text-green-800">
                  Dieser Kontakt wird per E-Mail über die Freigabe-Anfrage benachrichtigt 
                  und kann über einen sicheren Link die Kampagne prüfen und freigeben.
                </Text>
              </div>
            </div>
          )}

          {/* Helper Text */}
          {!selectedContact && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-sm text-blue-800">
                <strong>Hinweis:</strong> Wählen Sie den Hauptansprechpartner beim Kunden aus, 
                der für die Freigabe von Pressemitteilungen zuständig ist.
              </Text>
            </div>
          )}
        </>
      )}
    </div>
  );
}