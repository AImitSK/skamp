// src/app/dashboard/contacts/lists/ListModal.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { Radio, RadioGroup, RadioField } from "@/components/radio";
import { Checkbox } from "@/components/checkbox";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { listsService } from "@/lib/firebase/lists-service";
import { useCrmData } from "@/context/CrmDataContext";
import { DistributionList, ListFilters } from "@/types/lists";
import { Contact, CompanyType, companyTypeLabels } from "@/types/crm";
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
  FunnelIcon
} from "@heroicons/react/20/solid";

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
}

export default function ListModal({ list, onClose, onSave, userId }: ListModalProps) {
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
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  // Extract unique values for filters
  const availableIndustries = useMemo(() => 
    Array.from(new Set(companies.map(c => c.industry).filter((item): item is string => !!item))).sort(), 
    [companies]
  );
  
  const availableCountries = useMemo(() => 
    Array.from(new Set(companies.map(c => c.address?.country).filter((item): item is string => !!item))).sort(), 
    [companies]
  );

  // Extract publications data
  const availablePublications = useMemo(() => {
    const pubs: { name: string; format: string; focusAreas: string[]; circulation?: number }[] = [];
    companies.forEach(company => {
      if (company.mediaInfo?.publications) {
        company.mediaInfo.publications.forEach(pub => {
          pubs.push({
            name: pub.name,
            format: pub.format,
            focusAreas: pub.focusAreas || [],
            circulation: pub.circulation || pub.reach
          });
        });
      }
    });
    return pubs;
  }, [companies]);

  const uniquePublicationNames = useMemo(() => 
    Array.from(new Set(availablePublications.map(p => p.name))).sort(),
    [availablePublications]
  );

  const allFocusAreas = useMemo(() => {
    const areas = new Set<string>();
    availablePublications.forEach(pub => {
      pub.focusAreas.forEach(area => areas.add(area));
    });
    return Array.from(areas).sort();
  }, [availablePublications]);

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
    if (!formData.filters || !userId) return;
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, userId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
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
      const contacts = await listsService.getContactsByIds(formData.contactIds);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
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
                          <FunnelIcon className="h-5 w-5" />
                          Filter-Kriterien
                        </h3>
                      </div>
                      
                      {/* Firmen Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                          Firmen-Filter
                        </div>
                        
                        <div className="space-y-4">
                          <MultiSelectDropdown 
                            label="Firmentypen" 
                            placeholder="Alle Typen" 
                            options={Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))} 
                            selectedValues={formData.filters?.companyTypes || []} 
                            onChange={(values) => handleFilterChange('companyTypes', values as CompanyType[])}
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
                            options={availableCountries.map(c => ({ value: c, label: c }))} 
                            selectedValues={formData.filters?.countries || []} 
                            onChange={(values) => handleFilterChange('countries', values)}
                          />
                        </div>
                      </div>
                      
                      {/* Personen Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <UsersIcon className="h-5 w-5 text-gray-400" />
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
                        </div>
                      </div>
                      
                      {/* Publikationen Filter */}
                      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          Publikationen-Filter
                        </div>
                        
                        <div className="space-y-4">
                          <Field>
                            <Label>Format</Label>
                            <Select 
                              value={formData.filters?.publicationFormat || ''} 
                              onChange={(e) => handleFilterChange('publicationFormat', e.target.value || undefined)}
                            >
                              <option value="">Alle Formate</option>
                              <option value="print">Print</option>
                              <option value="online">Online</option>
                              <option value="both">Print & Online</option>
                            </Select>
                          </Field>
                          
                          <MultiSelectDropdown 
                            label="Themenschwerpunkte" 
                            placeholder="Alle Schwerpunkte" 
                            options={allFocusAreas.map(f => ({ value: f, label: f }))} 
                            selectedValues={formData.filters?.publicationFocusAreas || []} 
                            onChange={(values) => handleFilterChange('publicationFocusAreas', values)}
                          />
                          
                          <Field>
                            <Label>Auflage größer als</Label>
                            <Input 
                              type="number" 
                              value={formData.filters?.minCirculation || ''} 
                              onChange={(e) => handleFilterChange('minCirculation', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="z.B. 10000"
                            />
                          </Field>
                          
                          <MultiSelectDropdown 
                            label="Name der Publikation" 
                            placeholder="Alle Publikationen" 
                            options={uniquePublicationNames.map(n => ({ value: n, label: n }))} 
                            selectedValues={formData.filters?.publicationNames || []} 
                            onChange={(values) => handleFilterChange('publicationNames', values)}
                          />
                        </div>
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#005fab]"></div>
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
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {contact.position && `${contact.position} • `}
                              {contact.companyName || 'Keine Firma'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {contact.email && (
                              <EnvelopeIcon className="h-3 w-3 text-[#005fab]" title="Hat E-Mail" />
                            )}
                            {contact.phone && (
                              <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
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
              className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
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