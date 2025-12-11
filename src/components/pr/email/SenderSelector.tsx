// src/components/pr/email/SenderSelector.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';
import { SenderInfo } from '@/types/email-composer';
import { contactsService } from '@/lib/firebase/crm-service';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon
} from '@heroicons/react/20/solid';

interface SenderSelectorProps {
  campaign: PRCampaign;
  sender: SenderInfo;
  onChange: (sender: SenderInfo) => void;
  error?: string;
}

export default function SenderSelector({ campaign, sender, onChange, error }: SenderSelectorProps) {
  const t = useTranslations('email.senderSelector');
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [manualData, setManualData] = useState({
    name: sender.manual?.name || '',
    email: sender.manual?.email || '',
    title: sender.manual?.title || '',
    company: sender.manual?.company || campaign.clientName || '',
    phone: sender.manual?.phone || ''
  });

  // Lade Kontakte der Firma
  useEffect(() => {
    const loadCompanyContacts = async () => {
      if (!campaign.clientId) return;

      setLoadingContacts(true);
      try {
        const contacts = await contactsService.getByCompanyId(campaign.clientId);
        setCompanyContacts(contacts);

        // Wenn noch kein Kontakt ausgewählt, wähle den ersten
        if (sender.type === 'contact' && !sender.contactId && contacts.length > 0) {
          handleContactSelect(contacts[0].id!);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Kontakte:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    loadCompanyContacts();
  }, [campaign.clientId]);

  // Handler für Kontakt-Auswahl
  const handleContactSelect = (contactId: string) => {
    const contact = companyContacts.find(c => c.id === contactId);

    if (contact) {
      const contactData = {
        name: contact.functionName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email || '',
        title: contact.position || '',
        company: campaign.clientName || contact.companyName || '',
        phone: contact.phone || ''
      };

      onChange({
        type: 'contact',
        contactId: contact.id,
        contactData
      });
    }
  };

  // Handler für manuelle Daten
  const handleManualChange = (field: keyof typeof manualData, value: string) => {
    const newData = { ...manualData, [field]: value };
    setManualData(newData);
    
    // Update sender info
    onChange({
      type: 'manual',
      manual: newData
    });
  };

  return (
    <div className="space-y-4">
      {/* Absender-Typ Auswahl */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('senderType')}</label>
        <Select
          value={sender.type}
          onChange={(e) => {
            const newType = e.target.value as 'contact' | 'manual';
            if (newType === 'contact' && companyContacts.length > 0) {
              handleContactSelect(companyContacts[0].id!);
            } else {
              onChange({ type: newType });
            }
          }}
        >
          <option value="contact">{t('selectContactFrom', { company: campaign.clientName || t('companyFallback') })}</option>
          <option value="manual">{t('enterManually')}</option>
        </Select>
      </div>

      {/* Kontakt-Auswahl */}
      {sender.type === 'contact' && (
        <div>
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
            </div>
          ) : companyContacts.length === 0 ? (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                {t('noContactsFound', { company: campaign.clientName || t('companyFallback') })}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">{t('selectContact')}</label>
                <Select
                  value={sender.contactId || ''}
                  onChange={(e) => handleContactSelect(e.target.value)}
                >
                  <option value="">{t('pleaseSelect')}</option>
                  {companyContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.functionName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                      {contact.position && ` - ${contact.position}`}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manuelle Eingabe */}
      {sender.type === 'manual' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sender-name" className="block text-sm font-medium mb-1">
                {t('fields.name')}
              </label>
              <Input
                id="sender-name"
                value={manualData.name}
                onChange={(e) => handleManualChange('name', e.target.value)}
                placeholder={t('placeholders.name')}
              />
            </div>
            <div>
              <label htmlFor="sender-email" className="block text-sm font-medium mb-1">
                {t('fields.email')}
              </label>
              <Input
                id="sender-email"
                type="email"
                value={manualData.email}
                onChange={(e) => handleManualChange('email', e.target.value)}
                placeholder={t('placeholders.email')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sender-title" className="block text-sm font-medium mb-1">
                {t('fields.position')}
              </label>
              <Input
                id="sender-title"
                value={manualData.title}
                onChange={(e) => handleManualChange('title', e.target.value)}
                placeholder={t('placeholders.position')}
              />
            </div>
            <div>
              <label htmlFor="sender-phone" className="block text-sm font-medium mb-1">
                {t('fields.phone')}
              </label>
              <Input
                id="sender-phone"
                value={manualData.phone}
                onChange={(e) => handleManualChange('phone', e.target.value)}
                placeholder={t('placeholders.phone')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sender-company" className="block text-sm font-medium mb-1">
              {t('fields.company')}
            </label>
            <Input
              id="sender-company"
              value={manualData.company}
              onChange={(e) => handleManualChange('company', e.target.value)}
              placeholder={campaign.clientName || t('placeholders.company')}
            />
          </div>
        </div>
      )}

      {/* Fehleranzeige */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}