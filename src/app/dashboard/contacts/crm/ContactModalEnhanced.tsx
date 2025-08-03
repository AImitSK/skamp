// src/app/dashboard/contacts/crm/ContactModalEnhanced.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { ContactEnhanced, CompanyEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { ContactModalEnhancedProps, ContactTabId, ContactTabConfig } from "@/types/crm-enhanced-ui";
import { CONTACT_TABS } from "@/lib/constants/crm-constants";
import { CountryCode, LanguageCode } from "@/types/international";
import { Publication } from "@/types/library";
import { TagInput } from "@/components/ui/tag-input";
// CountrySelector, LanguageSelector durch reguläre Select ersetzt
import { PhoneInput } from "@/components/ui/phone-input";
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
  const [activeTab, setActiveTab] = useState<ContactTabId>('general');
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
  const [selectedCompany, setSelectedCompany] = useState<CompanyEnhanced | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      // Directly use enhanced contact data
      setFormData({
        ...contact,
        // Ensure required fields have defaults
        name: contact.name || {
          firstName: '',
          lastName: '',
          salutation: '',
          title: ''
        },
        displayName: contact.displayName || `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`,
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
        const company = companies.find(c => c.id === contact.companyId);
        setSelectedCompany(company || null);
      }
    }
    
    loadTags();
  }, [contact, companies, organizationId]); // Removed formData.companyId from dependencies!

  // Load publications when component mounts or companyId changes
  useEffect(() => {
    loadPublications();
  }, [formData.companyId, organizationId]);

  const loadTags = async () => {
    if (!organizationId) return;
    try {
      const orgTags = await tagsEnhancedService.getAllAsLegacyTags(organizationId);
      setTags(orgTags);
    } catch (error) {
      // Error loading tags - operation tracked internally
    }
  };

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
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companyId ? companies.find(c => c.id === companyId) : null;
    
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
      
      onSave();
      onClose();
    } catch (error) {
      // Error saving contact - handled via UI feedback
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
                  <div className="relative z-[60]">
                    <TagInput 
                      selectedTagIds={formData.tagIds || []} 
                      availableTags={tags} 
                      onChange={(tagIds) => setFormData({ ...formData, tagIds })} 
                      onCreateTag={handleCreateTag} 
                    />
                  </div>
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
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
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
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
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
                              <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
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
                      <Select 
                        value={formData.communicationPreferences?.preferredLanguage || ''} 
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          communicationPreferences: { 
                            ...formData.communicationPreferences,
                            preferredLanguage: e.target.value as LanguageCode
                          }
                        })}
                      >
                        <option value="">Sprache auswählen...</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="pt">🇵🇹 Português</option>
                        <option value="nl">🇳🇱 Nederlands</option>
                        <option value="pl">🇵🇱 Polski</option>
                        <option value="ru">🇷🇺 Русский</option>
                        <option value="ja">🇯🇵 日本語</option>
                        <option value="ko">🇰🇷 한국어</option>
                        <option value="zh">🇨🇳 中文</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Media Tab (nur sichtbar wenn Journalist) */}
            {activeTab === 'media' && formData.mediaProfile?.isJournalist && (
              <div className="space-y-6">
                {/* Info Section */}
                <Alert 
                  type="info" 
                  message="Konfigurieren Sie hier das Medienprofil für Journalisten und Redakteure."
                />

                {/* Publikationen */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">Publikationen</h3>
                    <p className="text-xs text-gray-500">
                      {formData.companyId ? 
                        'Wählen Sie die Publikationen dieser Firma aus, für die der Journalist arbeitet.' :
                        'Wählen Sie zuerst eine Firma aus, um deren Publikationen anzuzeigen.'
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
                                  {pub.type === 'magazine' ? 'Magazin' :
                                   pub.type === 'newspaper' ? 'Zeitung' :
                                   pub.type === 'website' ? 'Website' :
                                   pub.type === 'blog' ? 'Blog' :
                                   pub.type === 'trade_journal' ? 'Fachzeitschrift' :
                                   pub.type} • {pub.format === 'print' ? 'Print' : pub.format === 'online' ? 'Online' : 'Print & Online'}
                                </div>
                              </div>
                              {pub.verified && (
                                <Badge color="green" className="text-xs">Verifiziert</Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Text className="text-sm text-gray-500 text-center py-4">
                          Diese Firma hat noch keine Publikationen.
                        </Text>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-50 p-4">
                      <Text className="text-sm text-amber-800">
                        Bitte wählen Sie zuerst eine Firma im Tab &ldquo;Allgemein&rdquo; aus.
                      </Text>
                    </div>
                  )}
                </div>

                {/* Ressorts/Beats */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">Ressorts & Themengebiete</h3>
                    <p className="text-xs text-gray-500">Über welche Themen berichtet dieser Journalist?</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="z.B. Technologie, Wirtschaft, Politik..." 
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
                        Hinzufügen
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
                      <Text className="text-xs text-gray-500">Noch keine Ressorts hinzugefügt</Text>
                    )}
                  </div>
                </div>

                {/* Medientypen & Formate in zwei Spalten */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Media Types */}
                  <div className="space-y-4 rounded-md border p-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">Medientypen</h3>
                      <p className="text-xs text-gray-500">In welchen Medien arbeitet der Journalist?</p>
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
                  <div className="space-y-4 rounded-md border p-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">Bevorzugte Formate</h3>
                      <p className="text-xs text-gray-500">Welche Inhaltsformate werden bevorzugt?</p>
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
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900">Einreichungs-Richtlinien</h3>
                    <p className="text-xs text-gray-500">Spezielle Anforderungen oder Hinweise für die Kontaktaufnahme</p>
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
                    placeholder="z.B. Bevorzugte Kontaktzeiten, spezielle Anforderungen an Pressemitteilungen, Deadlines..." 
                  />
                </div>
              </div>
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
                    <Select 
                      value={formData.personalInfo?.nationality || ''} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        personalInfo: { 
                          ...formData.personalInfo,
                          nationality: e.target.value as CountryCode
                        }
                      })}
                    >
                      <option value="">Nationalität auswählen...</option>
                      <option value="DE">🇩🇪 Deutschland</option>
                      <option value="AT">🇦🇹 Österreich</option>
                      <option value="CH">🇨🇭 Schweiz</option>
                      <option value="US">🇺🇸 USA</option>
                      <option value="GB">🇬🇧 Großbritannien</option>
                      <option value="FR">🇫🇷 Frankreich</option>
                      <option value="IT">🇮🇹 Italien</option>
                      <option value="ES">🇪🇸 Spanien</option>
                      <option value="NL">🇳🇱 Niederlande</option>
                      <option value="BE">🇧🇪 Belgien</option>
                      <option value="LU">🇱🇺 Luxemburg</option>
                      <option value="DK">🇩🇰 Dänemark</option>
                      <option value="SE">🇸🇪 Schweden</option>
                      <option value="NO">🇳🇴 Norwegen</option>
                      <option value="FI">🇫🇮 Finnland</option>
                      <option value="PL">🇵🇱 Polen</option>
                      <option value="CZ">🇨🇿 Tschechien</option>
                      <option value="HU">🇭🇺 Ungarn</option>
                      <option value="PT">🇵🇹 Portugal</option>
                      <option value="GR">🇬🇷 Griechenland</option>
                      <option value="IE">🇮🇪 Irland</option>
                      <option value="CA">🇨🇦 Kanada</option>
                      <option value="AU">🇦🇺 Australien</option>
                      <option value="JP">🇯🇵 Japan</option>
                      <option value="CN">🇨🇳 China</option>
                      <option value="IN">🇮🇳 Indien</option>
                      <option value="BR">🇧🇷 Brasilien</option>
                      <option value="MX">🇲🇽 Mexiko</option>
                      <option value="RU">🇷🇺 Russland</option>
                      <option value="TR">🇹🇷 Türkei</option>
                    </Select>
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
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}