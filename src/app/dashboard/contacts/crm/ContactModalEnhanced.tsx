// src/app/dashboard/contacts/crm/ContactModalEnhanced.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { contactsEnhancedService, companiesEnhancedService, tagsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { publicationService } from "@/lib/firebase/library-service";
import { Tag, TagColor, SocialPlatform, socialPlatformLabels } from "@/types/crm";
import { ContactEnhanced, CompanyEnhanced, ContactType, contactTypeLabels, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { ContactModalEnhancedProps, ContactTabId, ContactTabConfig } from "@/types/crm-enhanced-ui";
import { CONTACT_TABS } from "@/lib/constants/crm-constants";
import { CountryCode, LanguageCode } from "@/types/international";
import { Publication } from "@/types/library";
import { TagInput } from "@/components/ui/tag-input";
import { CountrySelector } from "@/components/ui/country-selector";
import { PhoneInput } from "@/components/ui/phone-input";
import * as Flags from 'country-flag-icons/react/3x2';
import { InfoTooltip } from "@/components/InfoTooltip";
import { interceptSave } from '@/lib/utils/global-interceptor';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { useAuth } from '@/context/AuthContext';
import { Timestamp } from 'firebase/firestore';

// Flag Component
const FlagIcon = ({ countryCode, className = "h-4 w-6" }: { countryCode?: string; className?: string }) => {
  if (!countryCode) return null;
  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};

// Vorwahl-Optionen
const COUNTRY_OPTIONS = [
  { code: 'DE', label: '+49 DE', callingCode: '49' },
  { code: 'AT', label: '+43 AT', callingCode: '43' },
  { code: 'CH', label: '+41 CH', callingCode: '41' },
  { code: 'US', label: '+1 US', callingCode: '1' },
  { code: 'GB', label: '+44 GB', callingCode: '44' },
  { code: 'FR', label: '+33 FR', callingCode: '33' },
  { code: 'IT', label: '+39 IT', callingCode: '39' },
  { code: 'ES', label: '+34 ES', callingCode: '34' },
  { code: 'NL', label: '+31 NL', callingCode: '31' },
  { code: 'BE', label: '+32 BE', callingCode: '32' },
  { code: 'PL', label: '+48 PL', callingCode: '48' },
  { code: 'SE', label: '+46 SE', callingCode: '46' },
  { code: 'NO', label: '+47 NO', callingCode: '47' },
  { code: 'DK', label: '+45 DK', callingCode: '45' },
  { code: 'FI', label: '+358 FI', callingCode: '358' },
  { code: 'CZ', label: '+420 CZ', callingCode: '420' },
  { code: 'HU', label: '+36 HU', callingCode: '36' },
  { code: 'PT', label: '+351 PT', callingCode: '351' },
  { code: 'GR', label: '+30 GR', callingCode: '30' },
  { code: 'IE', label: '+353 IE', callingCode: '353' }
];
import { 
  PlusIcon, 
  TrashIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  HeartIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// Tab-Konfiguration ist jetzt in @/lib/constants/crm-constants.ts definiert

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    error: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

// Props Interface ist jetzt in @/types/crm-enhanced-ui.ts definiert

interface Props {
  contact: ContactEnhanced | null;
  companies: CompanyEnhanced[];
  onClose: () => void;
  onSave: () => void;
  userId: string;
  organizationId: string;
}

export default function ContactModalEnhanced({
  contact,
  companies,
  onClose,
  onSave,
  userId,
  organizationId
}: Props) {
  const { user } = useAuth();
  const { autoGlobalMode } = useAutoGlobal();
  const queryClient = useQueryClient();
  const t = useTranslations('crm.contactModalFull');
  const [activeTab, setActiveTab] = useState<ContactTabId>('general');

  // Defensive: Stelle sicher, dass companies nie undefined ist
  const safeCompanies = companies || [];
  const [formData, setFormData] = useState<Partial<ContactEnhanced>>({
    contactType: 'person',
    name: {
      firstName: '',
      lastName: '',
      salutation: '',
      title: ''
    },
    functionName: '',
    displayName: '',
    status: 'active',
    emails: [],
    phones: [],
    addresses: [],
    socialProfiles: [],
    tagIds: [],
    communicationPreferences: {
      preferredLanguage: 'de' as LanguageCode
    },
    mediaProfile: {
      isJournalist: false,
      publicationIds: [],
      beats: [],
      mediaTypes: [],
      preferredFormats: []
    },
    professionalInfo: {},
    personalInfo: {},
    gdprConsents: []
  });
  
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyEnhanced | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const loadTags = useCallback(async () => {
    if (!organizationId) return;
    try {
      const orgTags = await tagsEnhancedService.getAllAsLegacyTags(organizationId);
      setTags(orgTags);
    } catch (error) {
      // Error loading tags - operation tracked internally
    }
  }, [organizationId]);

  const loadPublications = useCallback(async () => {
    if (!organizationId) return;
    try {
      // Wenn eine Firma ausgewählt ist, lade nur deren Publikationen
      if (formData.companyId) {
        const pubs = await publicationService.getByPublisherId(formData.companyId, organizationId);
        setPublications(pubs);
      } else {
        // Sonst lade alle Publikationen
        const pubs = await publicationService.getAll(organizationId);
        setPublications(pubs);
      }
    } catch (error) {
      // Error loading publications - operation tracked internally
    }
  }, [formData.companyId, organizationId]);

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      // Directly use enhanced contact data
      setFormData({
        ...contact,
        // Ensure required fields have defaults
        contactType: contact.contactType || 'person',
        name: contact.name || {
          firstName: '',
          lastName: '',
          salutation: '',
          title: ''
        },
        functionName: contact.functionName || '',
        displayName: contact.displayName || (contact.contactType !== 'person' ? contact.functionName : `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`),
        status: contact.status || 'active',
        emails: contact.emails || [],
        phones: contact.phones || [],
        addresses: contact.addresses || [],
        socialProfiles: contact.socialProfiles || [],
        tagIds: contact.tagIds || [],
        communicationPreferences: contact.communicationPreferences || {
          preferredLanguage: 'de' as LanguageCode
        },
        mediaProfile: contact.mediaProfile || {
          isJournalist: false,
          publicationIds: [],
          beats: [],
          mediaTypes: [],
          preferredFormats: []
        },
        professionalInfo: contact.professionalInfo || {},
        personalInfo: contact.personalInfo || {},
        gdprConsents: contact.gdprConsents || []
      });

      if (contact.companyId) {
        const company = safeCompanies.find(c => c.id === contact.companyId);
        setSelectedCompany(company || null);
      }
    }

    loadTags();
  }, [contact, safeCompanies, organizationId, loadTags]); // Removed formData.companyId from dependencies!

  // Load publications when component mounts or companyId changes
  useEffect(() => {
    loadPublications();
  }, [formData.companyId, organizationId, loadPublications]);

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    try {
      const tagId = await tagsEnhancedService.create(
        {
          name,
          color,
          organizationId: organizationId
        },
        { organizationId: organizationId, userId: userId }
      );
      await loadTags();
      // Invalidate React Query cache so new tag appears immediately in contacts table
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companyId ? safeCompanies.find(c => c.id === companyId) : null;

    setSelectedCompany(company || null);

    setFormData(prev => ({
      ...prev,
      companyId: companyId,
      companyName: company?.name || ''
    }));
  };

  // Tab visibility check
  const isTabVisible = (tab: ContactTabConfig): boolean => {
    if (!tab.visible) return true;
    return tab.visible(formData);
  };

  const visibleTabs = CONTACT_TABS.filter(isTabVisible);

  // Email handlers
  const addEmailField = () => {
    const newEmail = { 
      type: 'business' as const, 
      email: '', 
      isPrimary: formData.emails?.length === 0 
    };
    setFormData({ 
      ...formData, 
      emails: [...(formData.emails || []), newEmail] 
    });
  };

  const removeEmailField = (index: number) => {
    const updatedEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updatedEmails });
  };

  // Phone handlers
  const addPhoneField = () => {
    const newPhone = { 
      type: 'business' as const, 
      number: '', 
      isPrimary: formData.phones?.length === 0 
    };
    setFormData({ 
      ...formData, 
      phones: [...(formData.phones || []), newPhone] 
    });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updatedPhones });
  };

  // Social profile handlers
  const addSocialProfile = () => {
    const newProfile = { 
      platform: 'linkedin' as const, 
      url: '' 
    };
    setFormData({ 
      ...formData, 
      socialProfiles: [...(formData.socialProfiles || []), newProfile] 
    });
  };

  const removeSocialProfile = (index: number) => {
    const updatedProfiles = (formData.socialProfiles || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialProfiles: updatedProfiles });
  };

  // Beat handlers
  const addBeat = (beat: string) => {
    if (!beat.trim()) return;
    const currentBeats = formData.mediaProfile?.beats || [];
    if (!currentBeats.includes(beat)) {
      setFormData({
        ...formData,
        mediaProfile: {
          ...formData.mediaProfile!,
          beats: [...currentBeats, beat]
        }
      });
    }
  };

  const removeBeat = (beat: string) => {
    setFormData({
      ...formData,
      mediaProfile: {
        ...formData.mediaProfile!,
        beats: formData.mediaProfile?.beats?.filter(b => b !== beat) || []
      }
    });
  };

  // GDPR handlers
  const updateGdprConsent = (purpose: string, granted: boolean) => {
    const existingConsents = formData.gdprConsents || [];
    const existingIndex = existingConsents.findIndex(c => c.purpose === purpose);
    
    const newConsent = {
      id: `consent_${purpose.toLowerCase()}_${Date.now()}`,
      purpose,
      status: granted ? 'granted' as const : 'revoked' as const,
      method: 'webform' as const,
      legalBasis: 'consent' as const,
      informationProvided: 'Via CRM',
      privacyPolicyVersion: '1.0'
    };

    if (existingIndex >= 0) {
      existingConsents[existingIndex] = newConsent;
    } else {
      existingConsents.push(newConsent);
    }

    setFormData({
      ...formData,
      gdprConsents: existingConsents
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung je nach Kontakttyp
    const errors: string[] = [];
    const isPerson = formData.contactType === 'person' || !formData.contactType;

    if (isPerson) {
      // Personen brauchen Vor- und Nachname
      if (!formData.name?.firstName?.trim()) {
        errors.push(t('validation.firstNameRequired'));
      }
      if (!formData.name?.lastName?.trim()) {
        errors.push(t('validation.lastNameRequired'));
      }
    } else {
      // Funktionskontakte brauchen functionName
      if (!formData.functionName?.trim()) {
        errors.push(t('validation.functionNameRequired'));
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setLoading(true);

    try {
      // Prepare data for save
      let dataToSave: Partial<ContactEnhanced> = {
        ...formData,
        // Display Name je nach Kontakttyp generieren
        displayName: isPerson
          ? (formData.name ? `${formData.name.firstName} ${formData.name.lastName}` : '')
          : (formData.functionName || ''),
        status: formData.status || 'active'
      };

      // Apply global interceptor for SuperAdmin/Team
      if (autoGlobalMode) {
        dataToSave = interceptSave(dataToSave, 'contact', user, {
          liveMode: true, // TODO: Get from banner toggle
          sourceType: 'manual',
          autoGlobalMode: true
        });
      }

      const context = { organizationId: organizationId, userId: userId };

      if (contact?.id) {
        // Update existing contact
        await contactsEnhancedService.update(
          contact.id,
          dataToSave,
          context
        );
      } else {
        // Create new contact
        await contactsEnhancedService.create(
          dataToSave as Omit<ContactEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
          context
        );
      }

      // Invalidate contacts query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
      // Also invalidate companies since contacts reference companies
      await queryClient.invalidateQueries({ queryKey: ['companies', organizationId] });

      onSave();
      onClose();
    } catch (error) {
      // Error saving contact - handled via UI feedback
      setValidationErrors([t('validation.generalError')]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {contact ? t('titleEdit') : t('titleAdd')}
        </DialogTitle>
        
        <DialogBody className="p-0">
          {validationErrors.length > 0 && (
            <div className="px-6 pt-4">
              <Alert type="error" message={validationErrors[0]} />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap',
                      activeTab === tab.id
                        ? 'border-[#005fab] text-[#005fab]'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'mr-2 h-5 w-5',
                        activeTab === tab.id ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {t(`tabs.${tab.id}.label`)}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6 h-[500px] overflow-y-auto overflow-x-hidden">
            {/* General Tab */}
            {activeTab === 'general' && (
              <FieldGroup>
                {/* Kontakttyp und Anrede/Funktionsname in einer Zeile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label>{t('general.labels.contactType')}</Label>
                    <Select
                      value={formData.contactType || 'person'}
                      onChange={(e) => setFormData({ ...formData, contactType: e.target.value as 'person' | 'function' })}
                    >
                      <option value="person">{t('general.contactTypes.person')}</option>
                      <option value="function">{t('general.contactTypes.function')}</option>
                    </Select>
                  </Field>

                  {/* Anrede nur für Personen */}
                  {(formData.contactType === 'person' || !formData.contactType) && (
                    <Field>
                      <Label>{t('general.labels.salutation')}</Label>
                      <Select
                        value={formData.name?.salutation || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          name: {
                            ...formData.name!,
                            salutation: e.target.value
                          }
                        })}
                      >
                        <option value="">{t('general.salutations.none')}</option>
                        <option value="Herr">{t('general.salutations.mr')}</option>
                        <option value="Frau">{t('general.salutations.ms')}</option>
                        <option value="Dr.">{t('general.salutations.dr')}</option>
                        <option value="Prof.">{t('general.salutations.prof')}</option>
                        <option value="Prof. Dr.">{t('general.salutations.profDr')}</option>
                      </Select>
                    </Field>
                  )}

                  {/* Titel nur für Personen */}
                  {(formData.contactType === 'person' || !formData.contactType) && (
                    <Field>
                      <Label>{t('general.labels.title')}</Label>
                      <Input
                        value={formData.name?.title || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          name: {
                            ...formData.name!,
                            title: e.target.value
                          }
                        })}
                        placeholder={t('general.placeholders.title')}
                      />
                    </Field>
                  )}

                  {/* Funktionsname für Funktionskontakte - nimmt 2 Spalten */}
                  {formData.contactType === 'function' && (
                    <Field className="md:col-span-2">
                      <Label>{t('general.labels.functionName')} *</Label>
                      <Input
                        value={formData.functionName || ''}
                        onChange={(e) => setFormData({ ...formData, functionName: e.target.value })}
                        placeholder={t('general.placeholders.functionName')}
                        required
                        autoFocus
                      />
                    </Field>
                  )}
                </div>

                {/* Felder für Personen */}
                {(formData.contactType === 'person' || !formData.contactType) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>{t('general.labels.firstName')} *</Label>
                      <Input
                        value={formData.name?.firstName || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          name: {
                            ...formData.name!,
                            firstName: e.target.value
                          }
                        })}
                        required
                        autoFocus
                      />
                    </Field>
                    <Field>
                      <Label>{t('general.labels.lastName')} *</Label>
                      <Input
                        value={formData.name?.lastName || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          name: {
                            ...formData.name!,
                            lastName: e.target.value
                          }
                        })}
                        required
                      />
                    </Field>
                  </div>
                )}

                <Field>
                  <Label>
                    {t('general.labels.company')}
                    <InfoTooltip content={t('general.company.tooltip')} className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Select
                    value={formData.companyId || ''}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                  >
                    <option value="">{t('general.company.none')}</option>
                    {safeCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>{t('general.labels.position')}</Label>
                    <Input
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder={t('general.placeholders.position')}
                    />
                  </Field>
                  <Field>
                    <Label>{t('general.labels.department')}</Label>
                    <Input
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder={t('general.placeholders.department')}
                    />
                  </Field>
                </div>

                {/* Tags */}
                <Field>
                  <Label>{t('general.labels.tags')}</Label>
                  <TagInput
                    selectedTagIds={formData.tagIds || []}
                    availableTags={tags}
                    onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                    onCreateTag={handleCreateTag}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>{t('general.labels.status')}</Label>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      {CONTACT_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label>
                      {t('general.labels.isJournalist')}
                      <InfoTooltip content={t('general.journalist.tooltip')} className="ml-1.5 inline-flex align-text-top" />
                    </Label>
                    <div className="mt-2">
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.mediaProfile?.isJournalist || false}
                          onChange={(checked) => setFormData({
                            ...formData,
                            mediaProfile: {
                              ...formData.mediaProfile!,
                              isJournalist: checked
                            }
                          })}
                        />
                        <span className="ml-2">{t('general.journalist.label')}</span>
                      </label>
                    </div>
                  </Field>
                </div>
              </FieldGroup>
            )}

            {/* Communication Tab */}
            {activeTab === 'communication' && (
              <FieldGroup>
                {/* Email Addresses */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{t('communication.emails.title')}</div>
                    <Button type="button" onClick={addEmailField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      {t('communication.emails.addButton')}
                    </Button>
                  </div>

                  {formData.emails && formData.emails.length > 0 ? (
                    <div className="space-y-2">
                      {formData.emails.map((email, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <Select
                              value={email.type}
                              onChange={(e) => {
                                const updated = [...formData.emails!];
                                updated[index].type = e.target.value as any;
                                setFormData({ ...formData, emails: updated });
                              }}
                            >
                              <option value="business">{t('communication.emails.types.business')}</option>
                              <option value="private">{t('communication.emails.types.private')}</option>
                              <option value="other">{t('communication.emails.types.other')}</option>
                            </Select>
                          </div>
                          <div className="col-span-7">
                            <Input
                              type="email"
                              value={email.email}
                              onChange={(e) => {
                                const updated = [...formData.emails!];
                                updated[index].email = e.target.value;
                                setFormData({ ...formData, emails: updated });
                              }}
                              placeholder={t('communication.emails.placeholder')}
                            />
                          </div>
                          <div className="col-span-1 flex items-center">
                            <Checkbox
                              checked={email.isPrimary}
                              onChange={(checked) => {
                                const updated = [...formData.emails!];
                                // Ensure only one primary
                                updated.forEach((e, i) => {
                                  e.isPrimary = i === index && checked;
                                });
                                setFormData({ ...formData, emails: updated });
                              }}
                              aria-label={t('communication.primary')}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button type="button" plain onClick={() => removeEmailField(index)}>
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">{t('communication.emails.empty')}</Text>
                  )}
                </div>

                {/* Phone Numbers */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{t('communication.phones.title')}</div>
                    <Button type="button" onClick={addPhoneField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      {t('communication.phones.addButton')}
                    </Button>
                  </div>

                  {formData.phones && formData.phones.length > 0 ? (
                    <div className="space-y-2">
                      {formData.phones.map((phone, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-2">
                            <Select
                              value={phone.type}
                              onChange={(e) => {
                                const updated = [...formData.phones!];
                                updated[index].type = e.target.value as any;
                                setFormData({ ...formData, phones: updated });
                              }}
                            >
                              <option value="business">{t('communication.phones.types.business')}</option>
                              <option value="mobile">{t('communication.phones.types.mobile')}</option>
                              <option value="private">{t('communication.phones.types.private')}</option>
                              <option value="fax">{t('communication.phones.types.fax')}</option>
                              <option value="other">{t('communication.phones.types.other')}</option>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Select
                              value={phone.countryCode || 'DE'}
                              onChange={(e) => {
                                const updated = [...formData.phones!];
                                updated[index].countryCode = e.target.value;
                                setFormData({ ...formData, phones: updated });
                              }}
                            >
                              {COUNTRY_OPTIONS.map(country => (
                                <option key={country.code} value={country.code}>
                                  {country.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="col-span-6">
                            <PhoneInput
                              value={phone.number}
                              onChange={(value) => {
                                const updated = [...formData.phones!];
                                updated[index].number = value || '';
                                setFormData({ ...formData, phones: updated });
                              }}
                              defaultCountry={phone.countryCode || 'DE'}
                              showCountrySelect={false}
                              placeholder={t('communication.phones.placeholder')}
                              keepInvalidInput={true}
                              onValidationError={(error) => {
                                // Telefonnummer-Validierungsfehler werden automatisch angezeigt
                              }}
                            />
                          </div>
                          <div className="col-span-1 flex items-center pt-2">
                            <Checkbox
                              checked={phone.isPrimary}
                              onChange={(checked) => {
                                const updated = [...formData.phones!];
                                // Ensure only one primary
                                updated.forEach((p, i) => {
                                  p.isPrimary = i === index && checked;
                                });
                                setFormData({ ...formData, phones: updated });
                              }}
                              aria-label={t('communication.primary')}
                            />
                          </div>
                          <div className="col-span-1 pt-2">
                            <Button type="button" plain onClick={() => removePhoneField(index)}>
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">{t('communication.phones.empty')}</Text>
                  )}
                </div>

                {/* Social Profiles */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{t('communication.social.title')}</div>
                    <Button type="button" onClick={addSocialProfile} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      {t('communication.social.addButton')}
                    </Button>
                  </div>

                  {formData.socialProfiles && formData.socialProfiles.length > 0 ? (
                    <div className="space-y-2">
                      {formData.socialProfiles.map((profile, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <Select
                              value={profile.platform}
                              onChange={(e) => {
                                const updated = [...formData.socialProfiles!];
                                updated[index].platform = e.target.value;
                                setFormData({ ...formData, socialProfiles: updated });
                              }}
                            >
                              {Object.entries(socialPlatformLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="col-span-7">
                            <Input
                              value={profile.url}
                              onChange={(e) => {
                                const updated = [...formData.socialProfiles!];
                                updated[index].url = e.target.value;
                                setFormData({ ...formData, socialProfiles: updated });
                              }}
                              placeholder={t('communication.social.urlPlaceholder')}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button type="button" plain onClick={() => removeSocialProfile(index)}>
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">{t('communication.social.empty')}</Text>
                  )}
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="text-sm font-medium text-gray-900">{t('communication.preferences.title')}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>{t('communication.preferences.preferredChannel')}</Label>
                      <Select
                        value={formData.communicationPreferences?.preferredChannel || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          communicationPreferences: {
                            ...formData.communicationPreferences,
                            preferredChannel: e.target.value as any
                          }
                        })}
                      >
                        <option value="">{t('communication.preferences.noPreference')}</option>
                        {COMMUNICATION_CHANNELS.map(channel => (
                          <option key={channel.value} value={channel.value}>
                            {channel.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field>
                      <Label>{t('communication.preferences.preferredLanguage')}</Label>
                      <div className="relative" data-slot="control">
                        {formData.communicationPreferences?.preferredLanguage && (
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                            <FlagIcon
                              countryCode={formData.communicationPreferences.preferredLanguage === 'en' ? 'GB' : formData.communicationPreferences.preferredLanguage.toUpperCase()}
                              className="h-3 w-5"
                            />
                          </div>
                        )}
                        <Select
                          value={formData.communicationPreferences?.preferredLanguage || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            communicationPreferences: {
                              ...formData.communicationPreferences,
                              preferredLanguage: e.target.value as LanguageCode
                            }
                          })}
                          className={formData.communicationPreferences?.preferredLanguage ? 'pl-11' : ''}
                        >
                          <option value="">{t('communication.preferences.selectLanguage')}</option>
                          <option value="de">{t('communication.preferences.languages.de')}</option>
                          <option value="en">{t('communication.preferences.languages.en')}</option>
                          <option value="fr">{t('communication.preferences.languages.fr')}</option>
                          <option value="es">{t('communication.preferences.languages.es')}</option>
                          <option value="it">{t('communication.preferences.languages.it')}</option>
                          <option value="pt">{t('communication.preferences.languages.pt')}</option>
                          <option value="nl">{t('communication.preferences.languages.nl')}</option>
                          <option value="pl">{t('communication.preferences.languages.pl')}</option>
                          <option value="ru">{t('communication.preferences.languages.ru')}</option>
                          <option value="ja">{t('communication.preferences.languages.ja')}</option>
                          <option value="ko">{t('communication.preferences.languages.ko')}</option>
                          <option value="zh">{t('communication.preferences.languages.zh')}</option>
                        </Select>
                      </div>
                    </Field>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Media Tab (nur sichtbar wenn Journalist) */}
            {activeTab === 'media' && formData.mediaProfile?.isJournalist && (
              <div className="space-y-6">
                {/* Publikationen */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">{t('media.publications.title')}</h3>
                    <p className="text-xs text-gray-500">
                      {formData.companyId ?
                        t('media.publications.chooseForJournalist') :
                        t('media.publications.selectCompanyFirst')
                      }
                    </p>
                  </div>

                  {formData.companyId ? (
                    <div className="max-h-60 overflow-y-auto rounded-lg border bg-gray-50 p-2">
                      {publications.length > 0 ? (
                        <div className="space-y-1">
                          {publications.map((pub) => (
                            <label key={pub.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-white cursor-pointer transition-colors">
                              <Checkbox
                                checked={formData.mediaProfile?.publicationIds?.includes(pub.id!) || false}
                                onChange={(checked) => {
                                  const currentIds = formData.mediaProfile?.publicationIds || [];
                                  const newIds = checked
                                    ? [...currentIds, pub.id!]
                                    : currentIds.filter(id => id !== pub.id);
                                  setFormData({
                                    ...formData,
                                    mediaProfile: {
                                      ...formData.mediaProfile!,
                                      publicationIds: newIds
                                    }
                                  });
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900">{pub.title}</div>
                                <div className="text-xs text-gray-500">
                                  {pub.type === 'magazine' ? t('media.publications.types.magazine') :
                                   pub.type === 'newspaper' ? t('media.publications.types.newspaper') :
                                   pub.type === 'website' ? t('media.publications.types.website') :
                                   pub.type === 'blog' ? t('media.publications.types.blog') :
                                   pub.type === 'trade_journal' ? t('media.publications.types.trade_journal') :
                                   pub.type} • {pub.format === 'print' ? t('media.publications.formats.print') : pub.format === 'online' ? t('media.publications.formats.online') : t('media.publications.formats.both')}
                                </div>
                              </div>
                              {pub.verified && (
                                <Badge color="green" className="text-xs">{t('media.publications.verified')}</Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Text className="text-sm text-gray-500 text-center py-4">
                          {t('media.publications.empty')}
                        </Text>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-50 p-4">
                      <Text className="text-sm text-amber-800">
                        {t('media.publications.selectCompanyHint')}
                      </Text>
                    </div>
                  )}
                </div>

                {/* Ressorts/Beats */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">{t('media.beats.title')}</h3>
                    <p className="text-xs text-gray-500">{t('media.beats.description')}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('media.beats.placeholder')}
                        onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            addBeat(input.value);
                            input.value = '';
                          }
                        }}
                      />
                      <Button
                        type="button"
                        plain
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addBeat(input.value);
                          input.value = '';
                        }}
                        className="whitespace-nowrap"
                      >
                        {t('media.beats.addButton')}
                      </Button>
                    </div>

                    {formData.mediaProfile?.beats?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.mediaProfile.beats.map((beat) => (
                          <Badge key={beat} color="blue">
                            {beat}
                            <button
                              type="button"
                              onClick={() => removeBeat(beat)}
                              className="ml-1.5 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Text className="text-xs text-gray-500">{t('media.beats.empty')}</Text>
                    )}
                  </div>
                </div>

                {/* Medientypen & Formate in zwei Spalten */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Media Types */}
                  <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">{t('media.mediaTypes.title')}</h3>
                      <p className="text-xs text-gray-500">{t('media.mediaTypes.description')}</p>
                    </div>

                    <div className="space-y-2">
                      {MEDIA_TYPES.map(type => (
                        <label key={type.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={formData.mediaProfile?.mediaTypes?.includes(type.value) || false}
                            onChange={(checked) => {
                              const current = formData.mediaProfile?.mediaTypes || [];
                              const updated = checked
                                ? [...current, type.value]
                                : current.filter(t => t !== type.value);
                              setFormData({
                                ...formData,
                                mediaProfile: {
                                  ...formData.mediaProfile!,
                                  mediaTypes: updated
                                }
                              });
                            }}
                          />
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Submission Formats */}
                  <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">{t('media.preferredFormats.title')}</h3>
                      <p className="text-xs text-gray-500">{t('media.preferredFormats.description')}</p>
                    </div>

                    <div className="space-y-2">
                      {SUBMISSION_FORMATS.map(format => (
                        <label key={format.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={formData.mediaProfile?.preferredFormats?.includes(format.value) || false}
                            onChange={(checked) => {
                              const current = formData.mediaProfile?.preferredFormats || [];
                              const updated = checked
                                ? [...current, format.value]
                                : current.filter(f => f !== format.value);
                              setFormData({
                                ...formData,
                                mediaProfile: {
                                  ...formData.mediaProfile!,
                                  preferredFormats: updated
                                }
                              });
                            }}
                          />
                          <span>{format.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submission Guidelines */}
                <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">{t('media.submissionGuidelines.title')}</h3>
                    <p className="text-xs text-gray-500">{t('media.submissionGuidelines.description')}</p>
                  </div>

                  <Textarea
                    value={formData.mediaProfile?.submissionGuidelines || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mediaProfile: {
                        ...formData.mediaProfile!,
                        submissionGuidelines: e.target.value
                      }
                    })}
                    rows={3}
                    placeholder={t('media.submissionGuidelines.placeholder')}
                  />
                </div>
              </div>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <FieldGroup>
                {/* Professional Info */}
                <Field>
                  <Label>{t('professional.biography.label')}</Label>
                  <Textarea
                    value={formData.professionalInfo?.biography || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      professionalInfo: {
                        ...formData.professionalInfo,
                        biography: e.target.value
                      }
                    })}
                    rows={4}
                    placeholder={t('professional.biography.placeholder')}
                  />
                </Field>

              </FieldGroup>
            )}

            {/* GDPR Tab */}
            {activeTab === 'gdpr' && (
              <FieldGroup>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">{t('gdpr.marketing.title')}</Text>
                        <Text className="text-sm text-gray-500">{t('gdpr.marketing.description')}</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Marketing' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Marketing', checked)}
                        />
                        <span className="ml-2">{t('gdpr.consentGranted')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">{t('gdpr.newsletter.title')}</Text>
                        <Text className="text-sm text-gray-500">{t('gdpr.newsletter.description')}</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Newsletter' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Newsletter', checked)}
                        />
                        <span className="ml-2">{t('gdpr.consentGranted')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">{t('gdpr.phoneContact.title')}</Text>
                        <Text className="text-sm text-gray-500">{t('gdpr.phoneContact.description')}</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Telefonische Kontaktaufnahme' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Telefonische Kontaktaufnahme', checked)}
                        />
                        <span className="ml-2">{t('gdpr.consentGranted')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Personal Tab */}
            {activeTab === 'personal' && (
              <FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>{t('personal.birthday')}</Label>
                    <Input
                      type="date"
                      value={(() => {
                        if (!formData.personalInfo?.birthday) return '';

                        // Handle Date object
                        if (formData.personalInfo.birthday instanceof Date) {
                          return formData.personalInfo.birthday.toISOString().split('T')[0];
                        }

                        // Handle Firestore Timestamp with toDate method
                        if ((formData.personalInfo.birthday as any).toDate) {
                          return (formData.personalInfo.birthday as any).toDate().toISOString().split('T')[0];
                        }

                        // Handle plain Timestamp object {seconds, nanoseconds}
                        const ts = formData.personalInfo.birthday as any;
                        if (ts.seconds !== undefined) {
                          const date = new Date(ts.seconds * 1000);
                          return date.toISOString().split('T')[0];
                        }

                        return '';
                      })()}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          birthday: e.target.value ? (Timestamp.fromDate(new Date(e.target.value)) as unknown as Date) : undefined
                        }
                      })}
                    />
                  </Field>
                  <Field>
                    <Label>{t('personal.nationality')}</Label>
                    <div className="relative" data-slot="control">
                      {formData.personalInfo?.nationality && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                          <FlagIcon countryCode={formData.personalInfo.nationality} className="h-3 w-5" />
                        </div>
                      )}
                      <Select
                        value={formData.personalInfo?.nationality || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          personalInfo: {
                            ...formData.personalInfo,
                            nationality: e.target.value as CountryCode
                          }
                        })}
                        className={formData.personalInfo?.nationality ? 'pl-11' : ''}
                      >
                        <option value="">{t('personal.nationalityPlaceholder')}</option>
                        <option value="DE">{t('personal.countries.DE')}</option>
                        <option value="AT">{t('personal.countries.AT')}</option>
                        <option value="CH">{t('personal.countries.CH')}</option>
                        <option value="US">{t('personal.countries.US')}</option>
                        <option value="GB">{t('personal.countries.GB')}</option>
                        <option value="FR">{t('personal.countries.FR')}</option>
                        <option value="IT">{t('personal.countries.IT')}</option>
                        <option value="ES">{t('personal.countries.ES')}</option>
                        <option value="NL">{t('personal.countries.NL')}</option>
                        <option value="BE">{t('personal.countries.BE')}</option>
                        <option value="LU">{t('personal.countries.LU')}</option>
                        <option value="DK">{t('personal.countries.DK')}</option>
                        <option value="SE">{t('personal.countries.SE')}</option>
                        <option value="NO">{t('personal.countries.NO')}</option>
                        <option value="FI">{t('personal.countries.FI')}</option>
                        <option value="PL">{t('personal.countries.PL')}</option>
                        <option value="CZ">{t('personal.countries.CZ')}</option>
                        <option value="HU">{t('personal.countries.HU')}</option>
                        <option value="PT">{t('personal.countries.PT')}</option>
                        <option value="GR">{t('personal.countries.GR')}</option>
                        <option value="IE">{t('personal.countries.IE')}</option>
                        <option value="CA">{t('personal.countries.CA')}</option>
                        <option value="AU">{t('personal.countries.AU')}</option>
                        <option value="JP">{t('personal.countries.JP')}</option>
                        <option value="CN">{t('personal.countries.CN')}</option>
                        <option value="IN">{t('personal.countries.IN')}</option>
                        <option value="BR">{t('personal.countries.BR')}</option>
                        <option value="MX">{t('personal.countries.MX')}</option>
                        <option value="RU">{t('personal.countries.RU')}</option>
                        <option value="TR">{t('personal.countries.TR')}</option>
                      </Select>
                    </div>
                  </Field>
                </div>

                <Field>
                  <Label>{t('personal.interests.label')}</Label>
                  <Textarea
                    value={formData.personalInfo?.interests?.join(', ') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: {
                        ...formData.personalInfo,
                        interests: e.target.value.split(',').map(i => i.trim()).filter(i => i.length > 0)
                      }
                    })}
                    rows={2}
                    placeholder={t('personal.interests.placeholder')}
                  />
                </Field>

                <Field>
                  <Label>{t('personal.internalNotes.label')}</Label>
                  <Textarea
                    value={formData.internalNotes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      internalNotes: e.target.value
                    })}
                    rows={4}
                    placeholder={t('personal.internalNotes.placeholder')}
                  />
                </Field>
              </FieldGroup>
            )}
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>{t('actions.cancel')}</Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
          >
            {loading ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}