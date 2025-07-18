// src/app/dashboard/contacts/crm/ContactModalEnhanced.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { Checkbox } from "@/components/checkbox";
import { contactsService, tagsService, companiesService } from "@/lib/firebase/crm-service";
import { Contact, Company, Tag, TagColor, SocialPlatform, socialPlatformLabels, STANDARD_BEATS } from "@/types/crm";
import { ContactEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { CountryCode, LanguageCode } from "@/types/international";
import { TagInput } from "@/components/tag-input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CountrySelector } from "@/components/country-selector";
import { LanguageSelector, LanguageSelectorMulti } from "@/components/language-selector";
import { PhoneInput } from "@/components/phone-input";
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  visible?: (formData: Partial<ContactEnhanced>) => boolean;
}

const TABS: TabConfig[] = [
  { 
    id: 'general', 
    label: 'Allgemein', 
    icon: UserIcon,
    description: 'Basis-Informationen zur Person' 
  },
  { 
    id: 'communication', 
    label: 'Kommunikation', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Kontaktdaten und Präferenzen' 
  },
  { 
    id: 'media', 
    label: 'Medien', 
    icon: NewspaperIcon,
    description: 'Journalisten-Profile und Publikationen',
    visible: (formData) => formData.mediaProfile?.isJournalist === true
  },
  { 
    id: 'professional', 
    label: 'Beruflich', 
    icon: BriefcaseIcon,
    description: 'Position, Ausbildung, Mitgliedschaften' 
  },
  { 
    id: 'gdpr', 
    label: 'DSGVO', 
    icon: ShieldCheckIcon,
    description: 'Einwilligungen und Datenschutz' 
  },
  { 
    id: 'personal', 
    label: 'Persönlich', 
    icon: CalendarIcon,
    description: 'Persönliche Informationen' 
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
          firstName: contact.firstName,
          lastName: contact.lastName
        },
        displayName: `${contact.firstName} ${contact.lastName}`,
        companyId: contact.companyId,
        companyName: contact.companyName,
        position: contact.position,
        department: contact.department,
        
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

  const visibleTabs = TABS.filter(isTabVisible);

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
      errors.push('Vorname ist erforderlich');
    }
    if (!formData.name?.lastName?.trim()) {
      errors.push('Nachname ist erforderlich');
    }
    if (formData.emails?.some(e => e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))) {
      errors.push('Ungültige E-Mail-Adresse');
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
        email: formData.emails?.find(e => e.isPrimary)?.email || formData.emails?.[0]?.email,
        phone: formData.phones?.find(p => p.isPrimary)?.number || formData.phones?.[0]?.number,
        position: formData.position,
        department: formData.department,
        companyId: formData.companyId,
        companyName: formData.companyName,
        
        socialMedia: formData.socialProfiles?.map(sp => ({
          platform: sp.platform as SocialPlatform,
          url: sp.url
        })),
        
        communicationPreferences: {
          preferredChannel: formData.communicationPreferences?.preferredChannel === 'messaging' ? 'meeting' :
                           formData.communicationPreferences?.preferredChannel === 'mail' ? 'email' :
                           formData.communicationPreferences?.preferredChannel,
          doNotContact: formData.communicationPreferences?.doNotContact,
          language: formData.communicationPreferences?.preferredLanguage
        },
        
        mediaInfo: formData.mediaProfile?.isJournalist ? {
          publications: formData.mediaProfile.publicationIds,
          expertise: formData.mediaProfile.beats
        } : undefined,
        
        birthday: formData.personalInfo?.birthday,
        notes: formData.personalInfo?.notes,
        photoUrl: formData.photoUrl,
        tagIds: formData.tagIds || []
      };
      
      if (contact?.id) {
        await contactsService.update(contact.id, dataToSave);
      } else {
        await contactsService.create({ ...dataToSave as Omit<Contact, 'id'>, userId });
      }
      onSave();
      onClose();
    } catch (error) {
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = selectedCompany && ['publisher', 'media_house', 'agency'].includes(selectedCompany.type);

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {contact ? 'Person bearbeiten' : 'Neue Person hinzufügen'}
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
                    {tab.label}
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
                    <Label>Vorname *</Label>
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
                    <Label>Nachname *</Label>
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
                    <Label>Anrede</Label>
                    <Select 
                      value={formData.name?.salutation || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        name: { ...formData.name!, salutation: e.target.value }
                      })}
                    >
                      <option value="">Keine</option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Prof. Dr.">Prof. Dr.</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label>Titel</Label>
                    <Input 
                      value={formData.name?.title || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        name: { ...formData.name!, title: e.target.value }
                      })}
                      placeholder="z.B. Dr., MBA"
                    />
                  </Field>
                </div>

                <Field>
                  <Label>
                    Firma
                    <InfoTooltip content="Wählen Sie die Firma aus, bei der diese Person arbeitet" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <Select
                    value={formData.companyId || ''}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                  >
                    <option value="">Keine Firma zugeordnet</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Position</Label>
                    <Input
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="z.B. Geschäftsführer, Redakteur"
                    />
                  </Field>
                  <Field>
                    <Label>Abteilung</Label>
                    <Input
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="z.B. Marketing, Redaktion"
                    />
                  </Field>
                </div>

                <Field>
                  <Label>Status</Label>
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
                    Ist Journalist/Redakteur
                    <InfoTooltip content="Aktiviert zusätzliche Medien-spezifische Felder" className="ml-1.5 inline-flex align-text-top" />
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
                  <Label>Tags</Label>
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
                    <div className="text-sm font-medium text-gray-900">E-Mail-Adressen</div>
                    <Button type="button" onClick={addEmailField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      E-Mail hinzufügen
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
                              <option value="business">Geschäftlich</option>
                              <option value="private">Privat</option>
                              <option value="other">Sonstige</option>
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
                              placeholder="email@beispiel.de" 
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
                              aria-label="Primär"
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
                    <Text className="text-sm text-gray-500">Keine E-Mail-Adressen hinzugefügt</Text>
                  )}
                </div>

                {/* Phone Numbers */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Telefonnummern</div>
                    <Button type="button" onClick={addPhoneField} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Nummer hinzufügen
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
                              <option value="business">Geschäftlich</option>
                              <option value="mobile">Mobil</option>
                              <option value="private">Privat</option>
                              <option value="fax">Fax</option>
                              <option value="other">Sonstige</option>
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
                              aria-label="Primär"
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
                    <Text className="text-sm text-gray-500">Keine Telefonnummern hinzugefügt</Text>
                  )}
                </div>

                {/* Social Profiles */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
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
                          placeholder="https://..." 
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
                    Profil hinzufügen
                  </Button>
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Kommunikationspräferenzen</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>Bevorzugter Kanal</Label>
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
                      <Label>Bevorzugte Sprache</Label>
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
                      Nicht kontaktieren
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
                  <Label>Medientypen</Label>
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
                  <Label>Ressorts/Themengebiete</Label>
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
                  <Label>Bevorzugte Formate</Label>
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
                  <Label>Einreichungsrichtlinien</Label>
                  <Textarea
                    value={formData.mediaProfile?.submissionGuidelines || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mediaProfile: { ...formData.mediaProfile!, submissionGuidelines: e.target.value }
                    })}
                    rows={4}
                    placeholder="Spezielle Anforderungen oder Hinweise für Einreichungen..."
                  />
                </Field>
              </FieldGroup>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <FieldGroup>
                {/* Education */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Ausbildung</div>
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
                          placeholder="Abschluss"
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
                          placeholder="Institution"
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
                          placeholder="Jahr"
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
                    Ausbildung hinzufügen
                  </Button>
                </div>

                {/* Certifications */}
                <Field>
                  <Label>Zertifizierungen</Label>
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
                    placeholder="Eine Zertifizierung pro Zeile..."
                  />
                </Field>

                {/* Memberships */}
                <Field>
                  <Label>Mitgliedschaften</Label>
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
                    placeholder="Eine Mitgliedschaft pro Zeile..."
                  />
                </Field>

                {/* Biography */}
                <Field>
                  <Label>Biografie</Label>
                  <Textarea
                    value={formData.professionalInfo?.biography || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      professionalInfo: { ...formData.professionalInfo!, biography: e.target.value }
                    })}
                    rows={5}
                    placeholder="Professionelle Biografie..."
                  />
                </Field>
              </FieldGroup>
            )}

            {/* GDPR Tab */}
            {activeTab === 'gdpr' && (
              <FieldGroup>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">DSGVO Einwilligungen</div>
                    <Button type="button" onClick={addGdprConsent} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Einwilligung hinzufügen
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
                              <span className="font-medium text-sm">Einwilligung {index + 1}</span>
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
                              <Label>Zweck</Label>
                              <Input 
                                value={consent.purpose} 
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].purpose = e.target.value;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                                placeholder="z.B. Marketing-Newsletter"
                              />
                            </Field>
                            <Field>
                              <Label>Status</Label>
                              <Select 
                                value={consent.status} 
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].status = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="pending">Ausstehend</option>
                                <option value="granted">Erteilt</option>
                                <option value="revoked">Widerrufen</option>
                              </Select>
                            </Field>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field>
                              <Label>Rechtsgrundlage</Label>
                              <Select 
                                value={consent.legalBasis} 
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].legalBasis = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="consent">Einwilligung</option>
                                <option value="contract">Vertrag</option>
                                <option value="legal_obligation">Rechtliche Verpflichtung</option>
                                <option value="vital_interests">Lebenswichtige Interessen</option>
                                <option value="public_task">Öffentliche Aufgabe</option>
                                <option value="legitimate_interests">Berechtigte Interessen</option>
                              </Select>
                            </Field>
                            <Field>
                              <Label>Methode</Label>
                              <Select 
                                value={consent.method} 
                                onChange={(e) => {
                                  const updated = [...formData.gdprConsents!];
                                  updated[index].method = e.target.value as any;
                                  setFormData({ ...formData, gdprConsents: updated });
                                }}
                              >
                                <option value="webform">Web-Formular</option>
                                <option value="email">E-Mail</option>
                                <option value="phone">Telefon</option>
                                <option value="written">Schriftlich</option>
                                <option value="double_opt_in">Double Opt-In</option>
                                <option value="import">Import</option>
                              </Select>
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <Text>Keine DSGVO Einwilligungen erfasst</Text>
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
                    <Label>Geburtstag</Label>
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
                    <Label>Nationalität</Label>
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
                  <Label>Sprachen</Label>
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
                  <Label>Interessen</Label>
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
                    placeholder="Ein Interesse pro Zeile..."
                  />
                </Field>

                <Field>
                  <Label>Persönliche Notizen</Label>
                  <Textarea
                    value={formData.personalInfo?.notes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo!, notes: e.target.value }
                    })}
                    rows={5}
                    placeholder="Persönliche Notizen (Hobbies, Familie, etc.)..."
                  />
                </Field>
              </FieldGroup>
            )}
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}