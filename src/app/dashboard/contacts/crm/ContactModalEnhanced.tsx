// src/components/crm/ContactModalEnhanced.tsx
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
import { Radio, RadioGroup } from "@/components/radio";
import { contactsService, companiesService, tagsService } from "@/lib/firebase/crm-service";
import { contactsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { publicationService } from "@/lib/firebase/library-service";
import { Contact, Company, Tag, TagColor, SocialPlatform, socialPlatformLabels } from "@/types/crm";
import { ContactEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { CountryCode, LanguageCode } from "@/types/international";
import { Publication } from "@/types/library";
import { TagInput } from "@/components/tag-input";
import { CountrySelector } from "@/components/country-selector";
import { LanguageSelector } from "@/components/language-selector";
import { PhoneInput } from "@/components/phone-input";
import { InfoTooltip } from "@/components/InfoTooltip";
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
    description: 'Basis-Kontaktinformationen' 
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
    description: 'Journalist-Profil und Publikationen',
    visible: (formData) => formData.mediaProfile?.isJournalist === true
  },
  { 
    id: 'professional', 
    label: 'Beruflich', 
    icon: BriefcaseIcon,
    description: 'Position, Bildung, Qualifikationen' 
  },
  { 
    id: 'gdpr', 
    label: 'GDPR', 
    icon: ShieldCheckIcon,
    description: 'Datenschutz-Einwilligungen' 
  },
  { 
    id: 'personal', 
    label: 'Persönlich', 
    icon: HeartIcon,
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

interface ContactModalEnhancedProps {
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
}: ContactModalEnhancedProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [formData, setFormData] = useState<Partial<ContactEnhanced>>({
    name: {
      firstName: '',
      lastName: '',
      salutation: '',
      title: ''
    },
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
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (contact) {
      // Convert legacy contact to enhanced format
      const enhancedData: Partial<ContactEnhanced> = {
        name: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          salutation: '',
          title: ''
        },
        displayName: `${contact.firstName} ${contact.lastName}`,
        position: contact.position,
        companyId: contact.companyId,
        companyName: contact.companyName,
        status: 'active',
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
        })) || [],
        tagIds: contact.tagIds || [],
        personalInfo: {
          notes: contact.notes
        },
        communicationPreferences: {
          preferredLanguage: 'de' as LanguageCode
        },
        mediaProfile: {
          isJournalist: false,
          publicationIds: [],
          beats: [],
          mediaTypes: [],
          preferredFormats: []
        }
      };
      
      setFormData(enhancedData);
      
      if (contact.companyId) {
        const company = companies.find(c => c.id === contact.companyId);
        setSelectedCompany(company || null);
      }
    }
    
    loadTags();
    loadPublications();
  }, [contact, companies]);

  const loadTags = async () => {
    if (!organizationId) return;
    try {
      const orgTags = await tagsService.getAll(organizationId);
      setTags(orgTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadPublications = async () => {
    if (!organizationId) return;
    try {
      const pubs = await publicationService.getAll(organizationId);
      setPublications(pubs);
    } catch (error) {
      console.error('Error loading publications:', error);
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    try {
      const tagId = await tagsService.create({ name, color, userId: organizationId });
      await loadTags();
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, companyId });
    
    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      setSelectedCompany(company || null);
      
      if (company) {
        setFormData(prev => ({
          ...prev,
          companyName: company.name
        }));
      }
    } else {
      setSelectedCompany(null);
      setFormData(prev => ({
        ...prev,
        companyName: undefined
      }));
    }
  };

  // Tab visibility check
  const isTabVisible = (tab: TabConfig): boolean => {
    if (!tab.visible) return true;
    return tab.visible(formData);
  };

  const visibleTabs = TABS.filter(isTabVisible);

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
      method: 'webform' as const,  // KORRIGIERT: 'form' zu 'webform' geändert
      legalBasis: 'consent' as const,
      informationProvided: 'Via CRM',
      privacyPolicyVersion: '1.0'
      // grantedAt und revokedAt werden vom Service automatisch als Timestamp gesetzt
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
    
    // Validierung
    const errors: string[] = [];
    if (!formData.name?.firstName?.trim()) {
      errors.push('Vorname ist erforderlich');
    }
    if (!formData.name?.lastName?.trim()) {
      errors.push('Nachname ist erforderlich');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      // Prepare data for save
      const dataToSave: Partial<ContactEnhanced> = {
        ...formData,
        displayName: formData.name ? `${formData.name.firstName} ${formData.name.lastName}` : '',
        status: formData.status || 'active'
      };

      if (contact?.id) {
        // Update existing contact
        try {
          // Prüfe zuerst, ob der Contact in der enhanced Collection existiert
          const enhancedContact = await contactsEnhancedService.getById(contact.id, userId);
          
          if (!enhancedContact) {
            // Contact existiert nicht in enhanced Collection
            setValidationErrors([
              'Dieser Kontakt muss zuerst migriert werden. Bitte kontaktieren Sie den Support oder erstellen Sie den Kontakt neu.'
            ]);
            setLoading(false);
            return;
          }
          
          // Update in enhanced collection
          await contactsEnhancedService.update(
            contact.id, 
            dataToSave,
            { organizationId: userId, userId: userId }
          );
        } catch (error) {
          console.error('Error updating contact:', error);
          throw error;
        }
      } else {
        // Create new contact - always in enhanced collection
        await contactsEnhancedService.create(
          dataToSave as Omit<ContactEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deletedAt' | 'deletedBy'>,
          { organizationId: userId, userId: userId }  // Verwende userId für beide!
        );
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };

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
                    <Label>Anrede</Label>
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
                      <option value="">Keine Anrede</option>
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
                        name: { 
                          ...formData.name!,
                          title: e.target.value 
                        }
                      })}
                      placeholder="z.B. Dr., Prof."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label>Vorname *</Label>
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
                    <Label>Nachname *</Label>
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
                      placeholder="z.B. Vertrieb, Redaktion"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Ist Journalist?
                      <InfoTooltip content="Aktiviert zusätzliche Medien-Felder" className="ml-1.5 inline-flex align-text-top" />
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
                        <span className="ml-2">Diese Person ist Journalist/Redakteur</span>
                      </label>
                    </div>
                  </Field>
                </div>

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
                                // Ensure only one primary
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
                                // Ensure only one primary
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
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
                    <Button type="button" onClick={addSocialProfile} plain className="text-sm">
                      <PlusIcon className="h-4 w-4" />
                      Profil hinzufügen
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
                    </div>
                  ) : (
                    <Text className="text-sm text-gray-500">Keine Social Media Profile hinzugefügt</Text>
                  )}
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="text-sm font-medium text-gray-900">Kommunikations-Präferenzen</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>Bevorzugter Kanal</Label>
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
                        <option value="">Keine Präferenz</option>
                        {COMMUNICATION_CHANNELS.map(channel => (
                          <option key={channel.value} value={channel.value}>
                            {channel.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field>
                      <Label>Bevorzugte Sprache</Label>
                      <LanguageSelector
                        value={formData.communicationPreferences?.preferredLanguage}
                        onChange={(lang) => setFormData({ 
                          ...formData, 
                          communicationPreferences: { 
                            ...formData.communicationPreferences,
                            preferredLanguage: lang as LanguageCode
                          }
                        })}
                      />
                    </Field>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Media Tab (nur sichtbar wenn Journalist) */}
            {activeTab === 'media' && formData.mediaProfile?.isJournalist && (
              <FieldGroup>
                {/* Publikationen */}
                <Field>
                  <Label>
                    Publikationen
                    <InfoTooltip content="Wählen Sie die Publikationen aus, für die dieser Journalist arbeitet" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {publications.length > 0 ? (
                      publications.map((pub) => (
                        <label key={pub.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                          <div className="flex-1">
                            <div className="font-medium text-sm">{pub.title}</div>
                            <div className="text-xs text-gray-500">
                              {pub.type} • {pub.format}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <Text className="text-sm text-gray-500 text-center py-4">
                        Keine Publikationen verfügbar
                      </Text>
                    )}
                  </div>
                </Field>

                {/* Ressorts/Beats */}
                <Field>
                  <Label>
                    Ressorts/Themengebiete
                    <InfoTooltip content="Themen, über die dieser Journalist berichtet" className="ml-1.5 inline-flex align-text-top" />
                  </Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ressort hinzufügen..." 
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
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {  // KORRIGIERT: Expliziter Typ für e
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addBeat(input.value);
                          input.value = '';
                        }}
                      >
                        Hinzufügen
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.mediaProfile?.beats?.map((beat) => (
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
                  </div>
                </Field>

                {/* Media Types */}
                <Field>
                  <Label>Medientypen</Label>
                  <div className="space-y-2">
                    {MEDIA_TYPES.map(type => (
                      <label key={type.value} className="flex items-center gap-2">
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
                </Field>

                {/* Submission Formats */}
                <Field>
                  <Label>Bevorzugte Formate</Label>
                  <div className="space-y-2">
                    {SUBMISSION_FORMATS.map(format => (
                      <label key={format.value} className="flex items-center gap-2">
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
                </Field>

                {/* Submission Guidelines */}
                <Field>
                  <Label>Einreichungs-Richtlinien</Label>
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
                    placeholder="Spezielle Anforderungen für Einreichungen..." 
                  />
                </Field>
              </FieldGroup>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <FieldGroup>
                {/* Professional Info */}
                <Field>
                  <Label>Biografie</Label>
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
                    placeholder="Beruflicher Werdegang..." 
                  />
                </Field>

                {/* TODO: Education, Certifications, etc. */}
                <Alert 
                  type="info" 
                  message="Weitere berufliche Informationen (Ausbildung, Zertifikate, Mitgliedschaften) werden in einer zukünftigen Version hinzugefügt."
                />
              </FieldGroup>
            )}

            {/* GDPR Tab */}
            {activeTab === 'gdpr' && (
              <FieldGroup>
                <Alert 
                  type="info" 
                  title="DSGVO-Einwilligungen"
                  message="Verwalten Sie hier die Einwilligungen für verschiedene Kommunikationszwecke."
                />

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">Marketing-Kommunikation</Text>
                        <Text className="text-sm text-gray-500">Erlaubnis für Marketing-E-Mails und -Anrufe</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Marketing' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Marketing', checked)}
                        />
                        <span className="ml-2">Einwilligung erteilt</span>
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">Newsletter</Text>
                        <Text className="text-sm text-gray-500">Erlaubnis für Newsletter-Versand</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Newsletter' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Newsletter', checked)}
                        />
                        <span className="ml-2">Einwilligung erteilt</span>
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="font-medium">Telefonische Kontaktaufnahme</Text>
                        <Text className="text-sm text-gray-500">Erlaubnis für Anrufe</Text>
                      </div>
                      <label className="flex items-center">
                        <Checkbox
                          checked={formData.gdprConsents?.some(c => c.purpose === 'Telefonische Kontaktaufnahme' && c.status === 'granted') || false}
                          onChange={(checked) => updateGdprConsent('Telefonische Kontaktaufnahme', checked)}
                        />
                        <span className="ml-2">Einwilligung erteilt</span>
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
                    <Label>Geburtstag</Label>
                    <Input 
                      type="date" 
                      value={formData.personalInfo?.birthday ? new Date(formData.personalInfo.birthday).toISOString().split('T')[0] : ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        personalInfo: { 
                          ...formData.personalInfo,
                          birthday: e.target.value ? new Date(e.target.value) : undefined
                        }
                      })} 
                    />
                  </Field>
                  <Field>
                    <Label>Nationalität</Label>
                    <CountrySelector
                      value={formData.personalInfo?.nationality}
                      onChange={(country) => setFormData({ 
                        ...formData, 
                        personalInfo: { 
                          ...formData.personalInfo,
                          nationality: country as CountryCode
                        }
                      })}
                      showCommonOnly={false}
                    />
                  </Field>
                </div>

                <Field>
                  <Label>Interessen</Label>
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
                    placeholder="z.B. Golf, Technologie, Reisen (kommagetrennt)" 
                  />
                </Field>

                <Field>
                  <Label>Persönliche Notizen</Label>
                  <Textarea 
                    value={formData.personalInfo?.notes || ''} 
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      personalInfo: { 
                        ...formData.personalInfo,
                        notes: e.target.value 
                      }
                    })} 
                    rows={4}
                    placeholder="Weitere Informationen zur Person..." 
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