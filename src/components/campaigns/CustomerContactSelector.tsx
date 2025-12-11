// src/components/campaigns/CustomerContactSelector.tsx - Kunden-Kontakt Einzel-Auswahl
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CustomerContactSelectorProps, CustomerContact } from '@/types/approvals-enhanced';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
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
  const t = useTranslations('campaigns.contacts');
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
      const crmContacts = await contactsEnhancedService.searchEnhanced(
        currentOrganization.id,
        {
          companyIds: [clientId]
        }
      );
      
      // Konvertiere CRM-Kontakte zu CustomerContact Format
      const customerContacts: CustomerContact[] = crmContacts.map(contact => {
        // Korrekte Struktur: contact.name.firstName/lastName
        const firstName = contact.name?.firstName || '';
        const lastName = contact.name?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // E-Mail aus dem emails Array holen (primaryEmail oder erste E-Mail)
        const primaryEmail = contact.emails?.find(e => e.isPrimary)?.email || 
                            contact.emails?.[0]?.email || '';
        
        return {
          contactId: contact.id!,
          name: fullName || primaryEmail || t('unknownContact'),
          email: primaryEmail,
          companyName: contact.companyDetails?.name || '',
          role: contact.position || undefined
        };
      });
      
      setContacts(customerContacts);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden-Kontakte:', error);
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  // selectedContact kann entweder ein String (ID) oder ein Objekt sein
  const selectedContactId = typeof selectedContact === 'string' 
    ? selectedContact 
    : selectedContact?.contactId;
    
  const selectedContactData = contacts.find(c => c.contactId === selectedContactId);

  const handleContactSelect = (contactId: string) => {
    if (contactId === '') {
      onContactChange(undefined);
    } else {
      // Finde das komplette Kontakt-Objekt und übergebe es
      const selectedContactObj = contacts.find(c => c.contactId === contactId);
      if (selectedContactObj) {
        onContactChange(selectedContactObj);
      } else {
        // Fallback: nur die ID übergeben
        onContactChange(contactId);
      }
    }
  };

  const getContactRoleBadgeColor = (role?: string) => {
    if (!role) return 'zinc';
    
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
        <Text className="font-medium">{t('title')}</Text>
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
            {t('noContactsFound')}
          </Text>
        </div>
      ) : (
        <>
          {/* Contact Selection */}
          <Select
            value={selectedContactId || ''}
            onChange={(e) => handleContactSelect(e.target.value)}
            className="w-full"
          >
            <option value="">{t('selectPlaceholder')}</option>
            {contacts.map((contact) => (
              <option key={contact.contactId} value={contact.contactId}>
                {contact.name} 
                {contact.role && ` (${contact.role})`}
                {contact.email && ` - ${contact.email}`}
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
                      {selectedContactData.name || t('nameNotAvailable')}
                    </Text>
                    {selectedContactData.role && (
                      <Badge color={getContactRoleBadgeColor(selectedContactData.role)}>
                        {selectedContactData.role}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {selectedContactData.email && (
                      <div className="flex items-center gap-1 text-sm text-green-700">
                        <EnvelopeIcon className="h-4 w-4" />
                        {selectedContactData.email}
                      </div>
                    )}
                    {selectedContactData.companyName && (
                      <div className="flex items-center gap-1 text-sm text-green-700">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {selectedContactData.companyName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <Text className="text-sm text-green-800">
                  {t('notificationInfo')}
                </Text>
              </div>
            </div>
          )}

          {/* Helper Text */}
          {!selectedContact && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-sm text-blue-800">
                <strong>{t('hint')}</strong> {t('hintDescription')}
              </Text>
            </div>
          )}
        </>
      )}
    </div>
  );
}