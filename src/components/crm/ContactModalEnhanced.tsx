// src/app/dashboard/contacts/crm/ContactModalEnhanced.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { contactsService, tagsService, companiesService } from "@/lib/firebase/crm-service";
import { Contact, Company, Tag, TagColor, SocialPlatform, socialPlatformLabels, STANDARD_BEATS } from "@/types/crm";
import { ContactEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { CountryCode, LanguageCode } from "@/types/international";
import { TagInput } from "@/components/ui/tag-input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CountrySelector } from "@/components/ui/country-selector";
import { LanguageSelector, LanguageSelectorMulti } from "@/components/ui/language-selector";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon
} from "@heroicons/react/20/solid";
import clsx from "clsx";

// Tab Definition
type TabId = 'general' | 'communication' | 'media' | 'professional' | 'gdpr' | 'personal';

interface TabConfig {
  id: TabId;
  icon: React.ComponentType<{ className?: string }>;
  visible?: (formData: Partial<ContactEnhanced>) => boolean;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'general',
    icon: UserIcon
  },
  {
    id: 'communication',
    icon: ChatBubbleLeftRightIcon
  },
  {
    id: 'media',
    icon: NewspaperIcon,
    visible: (formData) => formData.mediaProfile?.isJournalist === true
  },
  {
    id: 'professional',
    icon: BriefcaseIcon
  },
  {
    id: 'gdpr',
    icon: ShieldCheckIcon
  },
  {
    id: 'personal',
    icon: CalendarIcon
  }
];

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

interface ContactModalProps {
  contact: Contact | null;
  companies: Company[];
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
}: ContactModalProps) {
  const t = useTranslations('crm.contactModal');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [formData, setFormData] = useState<Partial<ContactEnhanced>>({
    // Name
    name: {
      firstName: '',
      lastName: ''
    },
    displayName: '',
    
    // Company
    companyId: '',
    companyName: '',
    position: '',
    department: '',
    
    // Status
    status: 'active',
    
    // Arrays
    emails: [],
    phones: [],
    socialProfiles: [],
    tagIds: [],
    
    // Communication preferences
    communicationPreferences: {
      preferredChannel: 'email',
      doNotContact: false
    },
    
    // Media profile
    mediaProfile: {
      isJournalist: false,
      publicationIds: [],
      beats: [],
      mediaTypes: [],
      preferredTopics: [],
      preferredFormats: []
    },
    
    // Professional info
    professionalInfo: {
      education: [],
      certifications: [],
      memberships: [],
      awards: []
    },
    
    // Personal info
    personalInfo: {
      languages: [],
      interests: []
    },
    
    // GDPR
    gdprConsents: []
  });
  
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (contact) {
      // Map old contact format to enhanced format
      setFormData({
        name: {
          firstName: contact.firstName || '',
          lastName: contact.lastName || ''
        },
        displayName: `${contact.firstName || ''} ${contact.lastName || ''}`,
        companyId: contact.companyId || '',
        companyName: contact.companyName || '',
        position: contact.position || '',
        department: contact.department || '',
        
        emails: contact.email ? [{
          type: 'business',
          email: contact.email,
          isPrimary: true
        }] : [],
        
        phones: contact.phone ? [{
          type: 'business',
          number: contact.phone,
          isPrimary: true
        }] : [],
        
        socialProfiles: contact.socialMedia?.map(sm => ({
          platform: sm.platform,
          url: sm.url
        })),
        
        communicationPreferences: contact.communicationPreferences ? {
          preferredChannel: contact.communicationPreferences.preferredChannel === 'meeting' ? 'messaging' :
                           contact.communicationPreferences.preferredChannel === 'social' ? 'messaging' :
                           contact.communicationPreferences.preferredChannel || 'email',
          preferredLanguage: contact.communicationPreferences.language as LanguageCode,
          doNotContact: contact.communicationPreferences.doNotContact
        } : {
          preferredChannel: 'email',
          doNotContact: false
        },
        
        mediaProfile: contact.mediaInfo ? {
          isJournalist: true,
          publicationIds: contact.mediaInfo.publications || [],
          beats: contact.mediaInfo.expertise || [],
          mediaTypes: [],
          preferredTopics: contact.mediaInfo.expertise || [],
          preferredFormats: []
        } : {
          isJournalist: false,
          publicationIds: [],
          beats: [],
          mediaTypes: [],
          preferredTopics: [],
          preferredFormats: []
        },
        
        personalInfo: {
          birthday: contact.birthday,
          notes: contact.notes,
          languages: [],
          interests: []
        },
        
        tagIds: contact.tagIds || [],
        photoUrl: contact.photoUrl,
        status: 'active'
      });
      
      if (contact.companyId) {
        const company = companies.find(c => c.id === contact.companyId);
        setSelectedCompany(company || null);
      }
    }
    loadTags();
  }, [contact, companies]);

  const loadTags = async () => {
    if (!userId) return;
    try {
      const userTags = await tagsService.getAll(userId);
      setTags(userTags);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    try {
      const tagId = await tagsService.create({ name, color, userId });
      await loadTags();
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  // Tab visibility check
  const isTabVisible = (tab: TabConfig): boolean => {
    if (!tab.visible) return true;
    return tab.visible(formData);
  };

  const visibleTabs = TAB_CONFIGS.filter(isTabVisible);

  // Handler functions
  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, companyId });
    
    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      setSelectedCompany(company || null);
      if (company) {
        setFormData(prev => ({ ...prev, companyName: company.name }));
      }
    } else {
      setSelectedCompany(null);
      setFormData(prev => ({ ...prev, companyName: '' }));
    }
  };

  // Phone handlers
  const addPhoneField = () => {
    const newPhone = { type: 'business' as const, number: '', isPrimary: false };
    setFormData({ ...formData, phones: [...(formData.phones || []), newPhone] });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updatedPhones });
  };

  // Email handlers
  const addEmailField = () => {
    const newEmail = { type: 'business' as const, email: '', isPrimary: false };
    setFormData({ ...formData, emails: [...(formData.emails || []), newEmail] });
  };

  const removeEmailField = (index: number) => {
    const updatedEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updatedEmails });
  };

  // Social profile handlers
  const addSocialProfile = () => {
    const newProfile = { platform: 'linkedin', url: '' };
    setFormData({ ...formData, socialProfiles: [...(formData.socialProfiles || []), newProfile] });
  };

  const removeSocialProfile = (index: number) => {
    const updatedProfiles = (formData.socialProfiles || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialProfiles: updatedProfiles });
  };

  // GDPR Consent handlers
  const addGdprConsent = () => {
    const newConsent = {
      id: Date.now().toString(),
      purpose: '',
      status: 'pending' as const,
      legalBasis: 'consent' as const,
      informationProvided: '',
      privacyPolicyVersion: '1.0',
      method: 'webform' as const
    };
    setFormData({ ...formData, gdprConsents: [...(formData.gdprConsents || []), newConsent] });
  };

  const removeGdprConsent = (index: number) => {
    const updatedConsents = (formData.gdprConsents || []).filter((_, i) => i !== index);
    setFormData({ ...formData, gdprConsents: updatedConsents });
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: string[] = [];
    if (!formData.name?.firstName?.trim()) {
      errors.push(t('validation.firstNameRequired'));
    }
    if (!formData.name?.lastName?.trim()) {
      errors.push(t('validation.lastNameRequired'));
    }
    if (formData.emails?.some(e => e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))) {
      errors.push(t('validation.invalidEmail'));
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      // For now, we'll save to the old format
      const dataToSave: Partial<Contact> = {
        firstName: formData.name!.firstName,
        lastName: formData.name!.lastName,
        email: formData.emails?.find(e => e.isPrimary)?.email || formData.emails?.[0]?.email || '',
        phone: formData.phones?.find(p => p.isPrimary)?.number || formData.phones?.[0]?.number || '',
        position: formData.position || '',
        department: formData.department || '',
        companyId: formData.companyId || '',
        companyName: formData.companyName || '',
        
        socialMedia: formData.socialProfiles?.map(sp => ({
          platform: sp.platform as SocialPlatform,
          url: sp.url
        })) || [],
        
        communicationPreferences: formData.communicationPreferences ? (() => {
          const prefs: any = {
            preferredChannel: formData.communicationPreferences.preferredChannel === 'messaging' ? 'meeting' :
                             formData.communicationPreferences.preferredChannel === 'mail' ? 'email' :
                             formData.communicationPreferences.preferredChannel || 'email',
            doNotContact: formData.communicationPreferences.doNotContact || false
          };
          if (formData.communicationPreferences.preferredLanguage) {
            prefs.language = formData.communicationPreferences.preferredLanguage;
          }
          return prefs;
        })() : undefined,
        
        mediaInfo: formData.mediaProfile?.isJournalist ? {
          publications: formData.mediaProfile.publicationIds || [],
          expertise: formData.mediaProfile.beats || []
        } : undefined,
        
        birthday: formData.personalInfo?.birthday,
        notes: formData.personalInfo?.notes || '',
        photoUrl: formData.photoUrl || '',
        tagIds: formData.tagIds || []
      };
      
      // Remove undefined values to prevent Firebase errors
      const cleanedData = JSON.parse(JSON.stringify(dataToSave, (key, value) => 
        value === undefined ? null : value
      ));
      
      // Debug logging
      console.log('Saving contact data:', cleanedData);
      console.log('UserId:', userId);
      
      if (contact?.id) {
        await contactsService.update(contact.id, cleanedData);
      } else {
        // Ensure userId is set for create
        const createData = {
          ...cleanedData,
          userId: userId
        } as Omit<Contact, 'id'> & { userId: string };

        console.log('Creating contact with data:', createData);
        await contactsService.create(createData);
      }

      // Invalidate contacts query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      if (error instanceof Error) {
        setValidationErrors([t('validation.errorPrefix', { message: error.message })]);
      } else {
        setValidationErrors([t('validation.generalError')]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = selectedCompany && ['publisher', 'media_house', 'agency'].includes(selectedCompany.type);

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
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>{t('general.labels.firstName')} {t('general.required')}</Label>
                    <Input
                      value={formData.name?.firstName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        name: { ...formData.name!, firstName: e.target.value },
                        displayName: `${e.target.value} ${formData.name?.lastName || ''}`
                      })}
                      required
                      autoFocus
                    />
                  </Field>
                  <Field>
                    <Label>{t('general.labels.lastName')} {t('general.required')}</Label>
                    <Input
                      value={formData.name?.lastName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        name: { ...formData.name!, lastName: e.target.value },
                        displayName: `${formData.name?.firstName || ''} ${e.target.value}`
                      })}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>{t('general.labels.salutation')}</Label>
                    <Select
                      value={formData.name?.salutation || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        name: { ...formData.name!, salutation: e.target.value }
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
                  <Field>
                    <Label>{t('general.labels.title')}</Label>
                    <Input
                      value={formData.name?.title || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        name: { ...formData.name!, title: e.target.value }
                      })}
                      placeholder={t('general.placeholders.titleExample')}
                    />
                  </Field>
                </div>

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
                    {companies.map((company) => (
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
                      placeholder={t('general.placeholders.positionExample')}
                    />
                  </Field>
                  <Field>
                    <Label>{t('general.labels.department')}</Label>
                    <Input
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder={t('general.placeholders.departmentExample')}
                    />
                  </Field>
                </div>

                <Field>
                  <Label>{t('general.labels.status')}</Label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    {CONTACT_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{t(`general.contactStatus.${opt.value}`)}</option>
                    ))}
                  </Select>
                </Field>

                <Field>
                  <Label>
                    {t('general.journalist.label')}
                    <InfoTooltip content={t('general.journalist.tooltip')} className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Checkbox
                    checked={formData.mediaProfile?.isJournalist || false}
                    onChange={(checked) => setFormData({
                      ...formData,
                      mediaProfile: { ...formData.mediaProfile!, isJournalist: checked }
                    })}
                  />
                </Field>

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
              </FieldGroup>
            )}

            {/* Communication Tab */}
            {activeTab === 'communication' && (
              <FieldGroup>
                {/* Email Addresses */}
                <div className="space-y-4 rounded-md border p-4">
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
                              <TrashIcon className="h-5 w-5 text-red-500" />
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
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{t('communication.phones.title')}</div>
                    <Button type="button" onClick={addPhoneField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      {t('communication.phones.addButton')}
                    </Button>
                  </div>

                  {formData.phones && formData.phones.length > 0 ? (
                    <div className="space-y-3">
                      {formData.phones.map((phone, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-3">
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
                          <div className="col-span-7">
                            <PhoneInput
                              value={phone.number}
                              onChange={(value) => {
                                const updated = [...formData.phones!];
                                updated[index].number = value || '';
                                setFormData({ ...formData, phones: updated });
                              }}
                              defaultCountry={'DE'}
                            />
                          </div>
                          <div className="col-span-1 flex items-center pt-2">
                            <Checkbox
                              checked={phone.isPrimary}
                              onChange={(checked) => {
                                const updated = [...formData.phones!];
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
                              <TrashIcon className="h-5 w-5 text-red-500" />
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
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">{t('communication.social.title')}</div>
                  {(formData.socialProfiles || []).map((profile, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
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
                      <div className="col-span-6">
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
                          <TrashIcon className="h-5 w-5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" onClick={addSocialProfile} plain className="w-full">
                    <PlusIcon className="h-4 w-4" />
                    {t('communication.social.addButton')}
                  </Button>
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">{t('communication.preferences.title')}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>{t('communication.preferences.preferredChannel')}</Label>
                      <Select 
                        value={formData.communicationPreferences?.preferredChannel || 'email'} 
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          communicationPreferences: { 
                            ...formData.communicationPreferences!, 
                            preferredChannel: e.target.value as any 
                          }
                        })}
                      >
                        {COMMUNICATION_CHANNELS.map(ch => (
                          <option key={ch.value} value={ch.value}>{ch.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field>
                      <Label>{t('communication.preferences.preferredLanguage')}</Label>
                      <LanguageSelector
                        value={formData.communicationPreferences?.preferredLanguage || null}
                        onChange={(lang) => setFormData({
                          ...formData,
                          communicationPreferences: {
                            ...formData.communicationPreferences!,
                            preferredLanguage: lang || undefined
                          }
                        })}
                      />
                    </Field>
                  </div>

                  <Field>
                    <Label className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.communicationPreferences?.doNotContact || false}
                        onChange={(checked) => setFormData({
                          ...formData,
                          communicationPreferences: {
                            ...formData.communicationPreferences!,
                            doNotContact: checked
                          }
                        })}
                      />
                      {t('communication.preferences.doNotContact')}
                    </Label>
                  </Field>
                </div>
              </FieldGroup>
            )}

            {/* Media Tab (only for journalists) */}
            {activeTab === 'media' && formData.mediaProfile?.isJournalist && (
              <FieldGroup>
                {/* Media Types */}
                <Field>
                  <Label>{t('media.types.title')}</Label>
                  <div className="space-y-2">
                    {MEDIA_TYPES.map(type => (
                      <label key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.mediaProfile?.mediaTypes?.includes(type.value as any) || false}
                          onChange={(checked) => {
                            const types = formData.mediaProfile?.mediaTypes || [];
                            const updated = checked
                              ? [...types, type.value as any]
                              : types.filter(t => t !== type.value);
                            setFormData({
                              ...formData,
                              mediaProfile: { ...formData.mediaProfile!, mediaTypes: updated }
                            });
                          }}
                        />
                        {type.label}
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Beats/Ressorts */}
                <Field>
                  <Label>{t('media.beats.title')}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {STANDARD_BEATS.map(beat => (
                      <label key={beat} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.mediaProfile?.beats?.includes(beat) || false}
                          onChange={(checked) => {
                            const beats = formData.mediaProfile?.beats || [];
                            const updated = checked
                              ? [...beats, beat]
                              : beats.filter(b => b !== beat);
                            setFormData({
                              ...formData,
                              mediaProfile: { ...formData.mediaProfile!, beats: updated }
                            });
                          }}
                        />
                        <span className="text-sm">{beat}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Submission Formats */}
                <Field>
                  <Label>{t('media.formats.title')}</Label>
                  <div className="space-y-2">
                    {SUBMISSION_FORMATS.map(format => (
                      <label key={format.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.mediaProfile?.preferredFormats?.includes(format.value as any) || false}
                          onChange={(checked) => {
                            const formats = formData.mediaProfile?.preferredFormats || [];
                            const updated = checked
                              ? [...formats, format.value as any]
                              : formats.filter(f => f !== format.value);
                            setFormData({
                              ...formData,
                              mediaProfile: { ...formData.mediaProfile!, preferredFormats: updated }
                            });
                          }}
                        />
                        {format.label}
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Submission Guidelines */}
                <Field>
                  <Label>{t('media.guidelines.title')}</Label>
                  <Textarea
                    value={formData.mediaProfile?.submissionGuidelines || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mediaProfile: { ...formData.mediaProfile!, submissionGuidelines: e.target.value }
                    })}
                    rows={4}
                    placeholder={t('media.guidelines.placeholder')}
                  />
                </Field>
              </FieldGroup>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <FieldGroup>
                {/* Education */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">{t('professional.education.title')}</div>
                  {formData.professionalInfo?.education?.map((edu, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                      <div className="col-span-4">
                        <Input
                          value={edu.degree}
                          onChange={(e) => {
                            const updated = [...(formData.professionalInfo?.education || [])];
                            updated[index].degree = e.target.value;
                            setFormData({
                              ...formData,
                              professionalInfo: { ...formData.professionalInfo!, education: updated }
                            });
                          }}
                          placeholder={t('professional.education.degree')}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={edu.institution}
                          onChange={(e) => {
                            const updated = [...(formData.professionalInfo?.education || [])];
                            updated[index].institution = e.target.value;
                            setFormData({
                              ...formData,
                              professionalInfo: { ...formData.professionalInfo!, education: updated }
                            });
                          }}
                          placeholder={t('professional.education.institution')}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={edu.year || ''}
                          onChange={(e) => {
                            const updated = [...(formData.professionalInfo?.education || [])];
                            updated[index].year = e.target.value ? parseInt(e.target.value) : undefined;
                            setFormData({
                              ...formData,
                              professionalInfo: { ...formData.professionalInfo!, education: updated }
                            });
                          }}
                          placeholder={t('professional.education.year')}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          plain
                          onClick={() => {
                            const updated = (formData.professionalInfo?.education || []).filter((_, i) => i !== index);
                            setFormData({
                              ...formData,
                              professionalInfo: { ...formData.professionalInfo!, education: updated }
                            });
                          }}
                        >
                          <TrashIcon className="h-5 w-5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    plain
                    className="w-full"
                    onClick={() => {
                      const newEdu = { degree: '', institution: '', year: undefined };
                      setFormData({
                        ...formData,
                        professionalInfo: {
                          ...formData.professionalInfo!,
                          education: [...(formData.professionalInfo?.education || []), newEdu]
                        }
                      });
                    }}
                  >
                    <PlusIcon className="h-4 w-4" />
                    {t('professional.education.addButton')}
                  </Button>
                </div>

                {/* Certifications */}
                <Field>
                  <Label>{t('professional.certifications.title')}</Label>
                  <Textarea
                    value={formData.professionalInfo?.certifications?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      professionalInfo: {
                        ...formData.professionalInfo!,
                        certifications: e.target.value.split('\n').filter(c => c.trim())
                      }
                    })}
                    rows={3}
                    placeholder={t('professional.certifications.placeholder')}
                  />
                </Field>

                {/* Memberships */}
                <Field>
                  <Label>{t('professional.memberships.title')}</Label>
                  <Textarea
                    value={formData.professionalInfo?.memberships?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      professionalInfo: {
                        ...formData.professionalInfo!,
                        memberships: e.target.value.split('\n').filter(m => m.trim())
                      }
                    })}
                    rows={3}
                    placeholder={t('professional.memberships.placeholder')}
                  />
                </Field>

                {/* Biography */}
                <Field>
                  <Label>{t('professional.biography')}</Label>
                  <Textarea
                    value={formData.professionalInfo?.biography || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      professionalInfo: { ...formData.professionalInfo!, biography: e.target.value }
                    })}
                    rows={5}
                    placeholder={t('professional.biographyPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            )}

            {/* GDPR Tab */}
            {activeTab === 'gdpr' && (
              <FieldGroup>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{t('gdpr.title')}</div>
                    <Button type="button" onClick={addGdprConsent} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      {t('gdpr.addButton')}
                    </Button>
                  </div>

                  {formData.gdprConsents && formData.gdprConsents.length > 0 ? (
                    <div className="space-y-4">
                      {formData.gdprConsents.map((consent, index) => (
                        <div key={consent.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircleIcon
                                className={clsx(
                                  'h-5 w-5',
                                  consent.status === 'granted' ? 'text-green-500' :
                                  consent.status === 'revoked' ? 'text-red-500' :
                                  'text-gray-400'
                                )}
                              />
                              <span className="font-medium text-sm">{t('gdpr.consentNumber', { number: index + 1 })}</span>
                            </div>
                            <Button
                              type="button"
                              plain
                              onClick={() => removeGdprConsent(index)}
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field>
                              <Label>{t('gdpr.fields.purpose')}</Label>
                              <Input
                                value={consent.purpose}
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].purpose = e.target.value;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                                placeholder={t('gdpr.fields.purposePlaceholder')}
                              />
                            </Field>
                            <Field>
                              <Label>{t('gdpr.fields.status')}</Label>
                              <Select
                                value={consent.status}
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].status = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="pending">{t('gdpr.status.pending')}</option>
                                <option value="granted">{t('gdpr.status.granted')}</option>
                                <option value="revoked">{t('gdpr.status.revoked')}</option>
                              </Select>
                            </Field>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field>
                              <Label>{t('gdpr.fields.legalBasis')}</Label>
                              <Select
                                value={consent.legalBasis}
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].legalBasis = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="consent">{t('gdpr.legalBasis.consent')}</option>
                                <option value="contract">{t('gdpr.legalBasis.contract')}</option>
                                <option value="legal_obligation">{t('gdpr.legalBasis.legal_obligation')}</option>
                                <option value="vital_interests">{t('gdpr.legalBasis.vital_interests')}</option>
                                <option value="public_task">{t('gdpr.legalBasis.public_task')}</option>
                                <option value="legitimate_interests">{t('gdpr.legalBasis.legitimate_interests')}</option>
                              </Select>
                            </Field>
                            <Field>
                              <Label>{t('gdpr.fields.method')}</Label>
                              <Select
                                value={consent.method}
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].method = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="webform">{t('gdpr.method.webform')}</option>
                                <option value="email">{t('gdpr.method.email')}</option>
                                <option value="phone">{t('gdpr.method.phone')}</option>
                                <option value="written">{t('gdpr.method.written')}</option>
                                <option value="double_opt_in">{t('gdpr.method.double_opt_in')}</option>
                                <option value="import">{t('gdpr.method.import')}</option>
                              </Select>
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <Text>{t('gdpr.empty')}</Text>
                    </div>
                  )}
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
                      value={formData.personalInfo?.birthday ? new Date(formData.personalInfo.birthday).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo!,
                          birthday: e.target.value ? new Date(e.target.value) : undefined
                        }
                      })}
                    />
                  </Field>
                  <Field>
                    <Label>{t('personal.nationality')}</Label>
                    <CountrySelector
                      value={formData.personalInfo?.nationality || null}
                      onChange={(country) => setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo!,
                          nationality: country || undefined
                        }
                      })}
                    />
                  </Field>
                </div>

                <Field>
                  <Label>{t('personal.languages.title')}</Label>
                  <LanguageSelectorMulti
                    value={formData.personalInfo?.languages || []}
                    onChange={(languages) => setFormData({
                      ...formData,
                      personalInfo: {
                        ...formData.personalInfo!,
                        languages
                      }
                    })}
                    multiple
                  />
                </Field>

                <Field>
                  <Label>{t('personal.interests')}</Label>
                  <Textarea
                    value={formData.personalInfo?.interests?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: {
                        ...formData.personalInfo!,
                        interests: e.target.value.split('\n').filter(i => i.trim())
                      }
                    })}
                    rows={4}
                    placeholder={t('personal.interestsPlaceholder')}
                  />
                </Field>

                <Field>
                  <Label>{t('personal.personalNotes')}</Label>
                  <Textarea
                    value={formData.personalInfo?.notes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo!, notes: e.target.value }
                    })}
                    rows={5}
                    placeholder={t('personal.personalNotesPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            )}
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>{tCommon('cancel')}</Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {loading ? t('actions.saving') : tCommon('save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}