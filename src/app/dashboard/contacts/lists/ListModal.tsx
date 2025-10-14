// src/app/dashboard/contacts/lists/ListModal.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Radio, RadioGroup, RadioField } from "@/components/ui/radio";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import PublicationFilterSection from "@/components/listen/PublicationFilterSection";
import { listsService } from "@/lib/firebase/lists-service";
import { useCrmData } from "@/context/CrmDataContext";
import { DistributionList, ListFilters } from "@/types/lists";
import { ContactEnhanced, CompanyEnhanced } from "@/types/crm-enhanced";
import { Company, Contact, companyTypeLabels } from "@/types/crm";
import { COUNTRY_NAMES, LANGUAGE_NAMES } from "@/types/international";
import ContactSelectorModal from "./ContactSelectorModal";
import {
  InformationCircleIcon,
  UsersIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  FunnelIcon,
  LanguageIcon,
  NewspaperIcon
} from "@heroicons/react/24/outline";

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

  const Icon = InformationCircleIcon;

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

interface ListModalProps {
  list?: DistributionList;
  onClose: () => void;
  onSave: (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
  organizationId: string;
}

export default function ListModal({ list, onClose, onSave, userId, organizationId }: ListModalProps) {
  const { companies, contacts, tags } = useCrmData();

  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    filters: {},
    contactIds: []
  });
  
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<ContactEnhanced[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  // GEÄNDERT: Erweiterte CompanyTypes für Medien
  const extendedCompanyTypeLabels = {
    ...companyTypeLabels,
    'publisher': 'Verlag',
    'media_house': 'Medienhaus',
    'agency': 'Agentur'
  };

  // Extract unique values from Enhanced Model
  const availableIndustries = useMemo(() => 
    Array.from(new Set(
      companies
        .map(c => c.industryClassification?.primary)
        .filter((item): item is string => !!item)
    )).sort(), 
    [companies]
  );
  
  const availableCountries = useMemo(() => 
    Array.from(new Set(
      companies
        .map(c => c.mainAddress?.countryCode)
        .filter((item): item is string => !!item)
    )).sort(), 
    [companies]
  );

  // GEÄNDERT: Sprachen aus Kontakten extrahieren
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    contacts.forEach(contact => {
      if ('communicationPreferences' in contact) {
        const enhanced = contact as any;
        if (enhanced.communicationPreferences?.preferredLanguage) {
          languages.add(enhanced.communicationPreferences.preferredLanguage);
        }
      }
    });
    return Array.from(languages).sort();
  }, [contacts]);

  // GEÄNDERT: Beats aus Journalisten-Profilen extrahieren
  const availableBeats = useMemo(() => {
    const beats = new Set<string>();
    contacts.forEach(contact => {
      if ('mediaProfile' in contact) {
        const enhanced = contact as any;
        if (enhanced.mediaProfile?.beats) {
          enhanced.mediaProfile.beats.forEach((beat: string) => beats.add(beat));
        }
      }
    });
    return Array.from(beats).sort();
  }, [contacts]);

  useEffect(() => {
    if (list) {
      setFormData({
        ...list,
        filters: list.filters || {},
        contactIds: list.contactIds || []
      });
    }
  }, [list]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.type === 'dynamic') {
        updatePreview();
      } else if (formData.type === 'static') {
        updateStaticPreview();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.filters, formData.contactIds, formData.type]);

  const updatePreview = async () => {
    if (!formData.filters || !organizationId) return;
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, organizationId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      // Error handled silently - user will see loading state timeout
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateStaticPreview = async () => {
    if (!formData.contactIds || formData.contactIds.length === 0) {
      setPreviewContacts([]);
      setPreviewCount(0);
      return;
    }
    setLoadingPreview(true);
    try {
      // Pass organizationId to support Reference contacts
      const contacts = await listsService.getContactsByIds(formData.contactIds, organizationId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error('Error loading static preview:', error);
      setPreviewCount(0);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFilterChange = (filterKey: keyof ListFilters, value: any) => {
    setFormData(prev => ({ ...prev, filters: { ...prev.filters, [filterKey]: value } }));
  };

  const handleSaveContactSelection = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, contactIds: selectedIds }));
    setIsContactSelectorOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const errors: string[] = [];
    if (!formData.name?.trim()) {
      errors.push('Listenname ist erforderlich');
    }
    
    if (formData.type === 'dynamic' && (!formData.filters || Object.keys(formData.filters).length === 0)) {
      errors.push('Mindestens ein Filter muss für dynamische Listen ausgewählt werden');
    }
    
    if (formData.type === 'static' && (!formData.contactIds || formData.contactIds.length === 0)) {
      errors.push('Mindestens ein Kontakt muss für statische Listen ausgewählt werden');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      const dataToSave: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
        name: formData.name!, 
        description: formData.description || '', 
        type: formData.type!, 
        category: formData.category || 'custom',
        userId: userId,
        organizationId: organizationId,
        filters: formData.type === 'dynamic' ? formData.filters : {},
        contactIds: formData.type === 'static' ? formData.contactIds : [],
      };
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [ 
    { value: 'press', label: 'Presse' }, 
    { value: 'customers', label: 'Kunden' }, 
    { value: 'partners', label: 'Partner' }, 
    { value: 'leads', label: 'Leads' }, 
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  // GEÄNDERT: Formatiere Namen für Enhanced Contacts
  const formatContactName = (contact: Contact | ContactEnhanced) => {
    if ('name' in contact && typeof contact.name === 'object') {
      // Enhanced Contact
      const enhanced = contact as ContactEnhanced;
      const parts = [];
      if (enhanced.name.title) parts.push(enhanced.name.title);
      if (enhanced.name.firstName) parts.push(enhanced.name.firstName);
      if (enhanced.name.lastName) parts.push(enhanced.name.lastName);
      return parts.join(' ') || enhanced.displayName;
    } else {
      // Legacy Contact
      const legacy = contact as Contact;
      return `${legacy.firstName} ${legacy.lastName}`;
    }
  };

  return (
    <>
      <Dialog open={true} onClose={onClose} size="5xl">
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogTitle className="px-6 py-4 text-lg font-semibold">
            {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
          </DialogTitle>
          
          <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
            {validationErrors.length > 0 && (
              <div className="mb-4">
                <Alert type="error" message={validationErrors[0]} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <FieldGroup>
                  {/* Basic Info */}
                  <Field>
                    <Label>Listen-Name *</Label>
                    <Input 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      required 
                      autoFocus
                      placeholder="z.B. Tech-Journalisten Deutschland"
                    />
                  </Field>
                  
                  <Field>
                    <Label>Beschreibung</Label>
                    <Textarea 
                      value={formData.description || ''} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      rows={2} 
                      placeholder="Kurze Beschreibung der Liste..."
                    />
                  </Field>
                  
                  <Field>
                    <Label>Kategorie</Label>
                    <Select 
                      value={formData.category || 'custom'} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </Field>
                  
                  {/* List Type */}
                  <Field>
                    <Label>Listen-Typ</Label>
                    <RadioGroup 
                      value={formData.type} 
                      onChange={(value: 'dynamic' | 'static') => setFormData({ ...formData, type: value })} 
                      className="mt-2 space-y-4"
                    >
                      <RadioField>
                        <Radio value="dynamic" />
                        <div className="ml-3 text-sm leading-6">
                          <Label>Dynamische Liste</Label>
                          <Description>Kontakte werden automatisch basierend auf Filtern aktualisiert.</Description>
                        </div>
                      </RadioField>
                      <RadioField>
                        <Radio value="static" />
                        <div className="ml-3 text-sm leading-6">
                          <Label>Statische Liste</Label>
                          <Description>Kontakte werden manuell ausgewählt und bleiben fest.</Description>
                        </div>
                      </RadioField>
                    </RadioGroup>
                  </Field>
                  
                  {/* Dynamic Filters */}
                  {formData.type === 'dynamic' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <FunnelIcon className="h-4 w-4" />
                          Filter-Kriterien
                        </h3>
                      </div>
                      
                      {/* Firmen Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                          Firmen-Filter
                        </div>
                        
                        <div className="space-y-4">
                          <MultiSelectDropdown 
                            label="Firmentypen" 
                            placeholder="Alle Typen" 
                            options={Object.entries(extendedCompanyTypeLabels).map(([value, label]) => ({ value, label }))} 
                            selectedValues={formData.filters?.companyTypes || []} 
                            onChange={(values) => handleFilterChange('companyTypes', values)}
                          />
                          
                          <MultiSelectDropdown 
                            label="Branchen" 
                            placeholder="Alle Branchen" 
                            options={availableIndustries.map(i => ({ value: i, label: i }))} 
                            selectedValues={formData.filters?.industries || []} 
                            onChange={(values) => handleFilterChange('industries', values)}
                          />
                          
                          <MultiSelectDropdown 
                            label="Tags" 
                            placeholder="Alle Tags" 
                            options={tags.map(tag => ({ value: tag.id!, label: tag.name }))} 
                            selectedValues={formData.filters?.tagIds || []} 
                            onChange={(values) => handleFilterChange('tagIds', values)}
                          />
                          
                          <MultiSelectDropdown 
                            label="Länder" 
                            placeholder="Alle Länder" 
                            options={availableCountries.map(c => ({ 
                              value: c, 
                              label: COUNTRY_NAMES[c] || c 
                            }))} 
                            selectedValues={formData.filters?.countries || []} 
                            onChange={(values) => handleFilterChange('countries', values)}
                          />
                        </div>
                      </div>
                      
                      {/* Personen Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <UsersIcon className="h-4 w-4 text-gray-400" />
                          Personen-Filter
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="relative flex items-center">
                              <Checkbox 
                                checked={formData.filters?.hasEmail || false} 
                                onChange={(checked) => handleFilterChange('hasEmail', checked)} 
                              />
                              <label className="ml-3 flex items-center text-sm text-gray-900">
                                <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                                Hat E-Mail
                              </label>
                            </div>
                            <div className="relative flex items-center">
                              <Checkbox 
                                checked={formData.filters?.hasPhone || false} 
                                onChange={(checked) => handleFilterChange('hasPhone', checked)} 
                              />
                              <label className="ml-3 flex items-center text-sm text-gray-900">
                                <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                                Hat Telefon
                              </label>
                            </div>
                          </div>

                          {availableLanguages.length > 0 && (
                            <MultiSelectDropdown
                              label="Bevorzugte Sprachen"
                              placeholder="Alle Sprachen"
                              options={availableLanguages.map(lang => ({
                                value: lang,
                                label: LANGUAGE_NAMES[lang] || lang
                              }))}
                              selectedValues={formData.filters?.languages || []}
                              onChange={(values) => handleFilterChange('languages', values)}
                            />
                          )}
                        </div>
                      </div>

                      {/* NEU: Journalisten-Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <NewspaperIcon className="h-4 w-4 text-gray-400" />
                          Journalisten-Filter
                        </div>
                        
                        <div className="space-y-4">
                          {availableBeats.length > 0 && (
                            <MultiSelectDropdown 
                              label="Ressorts/Beats" 
                              placeholder="Alle Ressorts" 
                              options={availableBeats.map(beat => ({ value: beat, label: beat }))} 
                              selectedValues={formData.filters?.beats || []} 
                              onChange={(values) => handleFilterChange('beats', values)}
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* NEU: Publikations-Filter mit neuer Komponente */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          Publikations-Filter
                        </div>
                        
                        <PublicationFilterSection
                          filters={formData.filters?.publications}
                          organizationId={organizationId}
                          onChange={(publicationFilters) => 
                            handleFilterChange('publications', publicationFilters)
                          }
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Static Contact Selection */}
                  {formData.type === 'static' && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium mb-2 text-gray-900">Manuelle Kontaktauswahl</h3>
                      <Text className="text-sm mb-4">
                        Füge Kontakte manuell zu dieser Liste hinzu. Die Auswahl bleibt unverändert, bis du sie wieder anpasst.
                      </Text>
                      <Button type="button" onClick={() => setIsContactSelectorOpen(true)} className="whitespace-nowrap">
                        <UsersIcon />
                        {(formData.contactIds?.length || 0).toLocaleString()} Kontakte auswählen
                      </Button>
                    </div>
                  )}
                </FieldGroup>
              </div>
              
              {/* Live Preview */}
              <div className="space-y-4">
                <div className="sticky top-6 border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Live-Vorschau</h3>
                    {loadingPreview ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Lade...</span>
                      </div>
                    ) : (
                      <Badge color="blue" className="whitespace-nowrap">{previewCount.toLocaleString()} Kontakte</Badge>
                    )}
                  </div>
                  
                  {previewContacts.length > 0 ? (
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {previewContacts.map((contact) => (
                        <div 
                          key={contact.id} 
                          className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded"
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-800">
                              {formatContactName(contact)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {contact.position && `${contact.position} • `}
                              {contact.companyName || 'Keine Firma'}
                            </div>
                            {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                              <div className="text-xs text-blue-600 mt-0.5">
                                <NewspaperIcon className="h-3 w-3 inline mr-1" />
                                Journalist
                                {(contact as any).mediaProfile.beats?.length ? ` • ${(contact as any).mediaProfile.beats.join(', ')}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {(('emails' in contact && contact.emails && contact.emails.length > 0) || 
                              ('email' in contact && contact.email)) && (
                              <EnvelopeIcon className="h-3 w-3 text-primary" title="Hat E-Mail" />
                            )}
                            {(('phones' in contact && contact.phones && contact.phones.length > 0) || 
                              ('phone' in contact && contact.phone)) && (
                              <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                            )}
                            {'communicationPreferences' in contact && (contact as any).communicationPreferences?.preferredLanguage && (
                              <span className="text-xs text-gray-500" title={`Sprache: ${LANGUAGE_NAMES[(contact as any).communicationPreferences.preferredLanguage] || (contact as any).communicationPreferences.preferredLanguage}`}>
                                {(contact as any).communicationPreferences.preferredLanguage.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {previewCount > 10 && (
                        <Text className="text-sm text-center pt-2">
                          ... und {(previewCount - 10).toLocaleString()} weitere Kontakte
                        </Text>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <Text className="text-sm">
                        {formData.type === 'dynamic' 
                          ? "Keine Kontakte entsprechen den Filtern." 
                          : "Noch keine Kontakte ausgewählt."
                        }
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>
          
          <DialogActions className="px-6 py-4">
            <Button plain onClick={onClose} className="whitespace-nowrap">
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name}
              color="primary"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Contact Selector Modal */}
      {isContactSelectorOpen && (
        <ContactSelectorModal
          initialSelectedIds={formData.contactIds || []}
          onClose={() => setIsContactSelectorOpen(false)}
          onSave={handleSaveContactSelection}
        />
      )}
    </>
  );
}