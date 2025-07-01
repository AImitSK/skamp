// src/app/dashboard/contacts/CompanyModal.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { companiesService, tagsService } from "@/lib/firebase/crm-service";
import { Company, CompanyType, Tag, TagColor, SocialPlatform, socialPlatformLabels, MEDIA_TYPES } from "@/types/crm";
import { TagInput } from "@/components/tag-input";
import { FocusAreasInput } from "@/components/FocusAreasInput";
import { InfoTooltip } from "@/components/InfoTooltip";
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";
import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';
import clsx from 'clsx';

// Länderliste vorbereiten
countries.registerLocale(de);
const countryObject = countries.getNames('de', { select: 'official' });
const countryList = Object.entries(countryObject).map(([code, name]) => ({
  code,
  name
})).sort((a, b) => a.name.localeCompare(b.name));

// Publication Typen
const PUBLICATION_TYPES = [
  { value: 'newspaper', label: 'Tageszeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'online', label: 'Online-Medium' },
  { value: 'blog', label: 'Blog' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV-Sender' },
  { value: 'radio', label: 'Radio' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'trade_journal', label: 'Fachzeitschrift' },
];

const PUBLICATION_FORMATS = [
  { value: 'print', label: 'Print' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'Print & Online' },
];

const PUBLICATION_FREQUENCIES = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Vierteljährlich' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'irregular', label: 'Unregelmäßig' },
];

// Toast Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Toast Component
function ToastNotification({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-[9999]">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-up`}
            style={{ minWidth: '320px' }}
          >
            <div className="flex">
              <Icon className={`h-5 w-5 ${iconColors[toast.type]} mr-3 flex-shrink-0`} />
              <div className="flex-1">
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 flex-shrink-0 rounded-md hover:opacity-70 focus:outline-none"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Custom Hook für Toast
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration: 5000 };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

// Validation Helper
function validateCompanyData(formData: Partial<Company>) {
  const errors: string[] = [];
  
  if (!formData.name?.trim()) {
    errors.push('Firmenname ist erforderlich');
  }
  
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }
  
  if (formData.website && !/^https?:\/\/.+\..+/.test(formData.website)) {
    errors.push('Website muss mit http:// oder https:// beginnen');
  }
  
  if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
    errors.push('Ungültige Telefonnummer');
  }
  
  // Publikationen validieren
  if (formData.mediaInfo?.publications) {
    formData.mediaInfo.publications.forEach((pub, index) => {
      if (!pub.name?.trim()) {
        errors.push(`Publikation ${index + 1}: Name ist erforderlich`);
      }
    });
  }
  
  return errors;
}

interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

interface Publication {
  id: string;
  name: string;
  type: string;
  format: string;
  frequency: string;
  focusAreas: string[];
  circulation?: number;
  reach?: number;
}

export default function CompanyModal({ company, onClose, onSave, userId }: CompanyModalProps) {
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    type: 'customer',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: {
      street: '',
      street2: '',
      city: '',
      zip: '',
      country: 'Deutschland'
    },
    notes: '',
    tagIds: [],
    socialMedia: [],
    mediaInfo: {
      circulation: 0,
      reach: 0,
      focusAreas: [],
      publicationFrequency: 'daily',
      mediaType: 'mixed',
      publications: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toasts, showToast, removeToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        ...company,
        tagIds: company.tagIds || [],
        socialMedia: company.socialMedia || [],
        address: {
          country: 'Deutschland',
          ...(company.address || {}),
        },
        mediaInfo: {
          circulation: 0,
          reach: 0,
          focusAreas: [],
          publicationFrequency: 'daily',
          mediaType: 'mixed',
          publications: [],
          ...(company.mediaInfo || {}),
        }
      });
    }
    loadTags();
  }, [company]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S = Speichern
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e as any);
      }
      
      // Escape = Modal schließen
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [formData]);

  const loadTags = async () => {
    if (!userId) return;
    try {
      const userTags = await tagsService.getAll(userId);
      setTags(userTags);
    } catch (error) {
      console.error("Fehler beim Laden der Tags:", error);
      showToast('error', 'Fehler beim Laden der Tags');
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    try {
      const tagId = await tagsService.create({ name, color, userId });
      await loadTags();
      showToast('success', 'Tag erstellt', `"${name}" wurde hinzugefügt`);
      return tagId;
    } catch (error) {
      showToast('error', 'Fehler beim Erstellen des Tags');
      throw error;
    }
  };

  const handleSocialMediaChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updatedSocialMedia = [...(formData.socialMedia || [])];
    updatedSocialMedia[index] = { ...updatedSocialMedia[index], [field]: value };
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  const addSocialMediaField = () => {
    const newField = { platform: 'linkedin' as SocialPlatform, url: '' };
    setFormData({ ...formData, socialMedia: [...(formData.socialMedia || []), newField] });
  };

  const removeSocialMediaField = (index: number) => {
    const updatedSocialMedia = (formData.socialMedia || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };
  
  const handleMediaInfoChange = (field: keyof NonNullable<Company['mediaInfo']>, value: any) => {
    setFormData(prev => ({
      ...prev,
      mediaInfo: {
        ...prev.mediaInfo,
        [field]: value,
      }
    }));
  };

  // Publication Management
  const addPublication = () => {
    const newPublication: Publication = {
      id: Date.now().toString(),
      name: '',
      type: 'magazine',
      format: 'print',
      frequency: 'monthly',
      focusAreas: []
    };
    
    const currentPublications = formData.mediaInfo?.publications || [];
    handleMediaInfoChange('publications', [...currentPublications, newPublication]);
  };

  const updatePublication = (index: number, field: keyof Publication, value: any) => {
    const publications = [...(formData.mediaInfo?.publications || [])];
    publications[index] = { ...publications[index], [field]: value };
    handleMediaInfoChange('publications', publications);
  };

  const removePublication = (index: number) => {
    const publications = (formData.mediaInfo?.publications || []).filter((_, i) => i !== index);
    handleMediaInfoChange('publications', publications);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const errors = validateCompanyData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast('error', 'Validierungsfehler', errors[0]);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      const dataToSave = { ...formData, tagIds: formData.tagIds || [], socialMedia: formData.socialMedia || [] };
      if (company?.id) {
        await companiesService.update(company.id, dataToSave);
      } else {
        await companiesService.create({ ...dataToSave as Omit<Company, 'id'>, userId });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      showToast('error', 'Fehler beim Speichern', 'Die Firma konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <>
      <Dialog 
        open={true} 
        onClose={onClose} 
        size="3xl"
        className="animate-fade-in"
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogTitle className="px-6 py-4 text-base font-semibold">
            {company ? 'Firma bearbeiten' : 'Neue Firma hinzufügen'}
          </DialogTitle>
          
          <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
            <FieldGroup>
              <Field>
                <Label>Firmenname *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  autoFocus
                  className={clsx(
                    "transition-colors",
                    validationErrors.some(e => e.includes('Firmenname')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Typ</Label>
                  <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}>
                    <option value="customer">Kunde</option>
                    <option value="supplier">Lieferant</option>
                    <option value="partner">Partner</option>
                    <option value="publisher">Verlag</option>
                    <option value="media_house">Medienhaus</option>
                    <option value="agency">Agentur</option>
                    <option value="other">Sonstiges</option>
                  </Select>
                </Field>
                <Field>
                  <Label>
                    Branche
                    {isMediaCompany && (
                      <InfoTooltip content="Bei Medienunternehmen wird die Branche durch den Typ definiert" className="ml-1.5 inline-flex align-text-top" />
                    )}
                  </Label>
                  <Input 
                    value={formData.industry || ''} 
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })} 
                    placeholder={isMediaCompany ? "—" : "z.B. IT, Handel, Industrie"}
                    disabled={isMediaCompany}
                    className={isMediaCompany ? "bg-gray-100 text-gray-500" : ""}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Website</Label>
                  <Input 
                    type="url" 
                    value={formData.website || ''} 
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                    placeholder="https://..."
                    className={clsx(
                      "transition-colors",
                      validationErrors.some(e => e.includes('Website')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                  />
                </Field>
                <Field>
                  <Label>Telefon</Label>
                  <Input 
                    type="tel" 
                    value={formData.phone || ''} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="+49 123 456789"
                    className={clsx(
                      "transition-colors",
                      validationErrors.some(e => e.includes('Telefon')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                  />
                </Field>
              </div>
              
              {isMediaCompany && (
                <>
                  {/* Basis Medien-Informationen */}
                  <div className="space-y-4 rounded-md border p-4 bg-zinc-50/50 animate-fade-in">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Allgemeine Medien-Informationen</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <Label>Hauptmedientyp</Label>
                        <Select value={formData.mediaInfo?.mediaType} onChange={(e) => handleMediaInfoChange('mediaType', e.target.value)}>
                          {MEDIA_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                        </Select>
                      </Field>
                      <Field>
                        <Label>Haupterscheinungsweise</Label>
                        <Select value={formData.mediaInfo?.publicationFrequency} onChange={(e) => handleMediaInfoChange('publicationFrequency', e.target.value)}>
                          <option value="daily">Täglich</option>
                          <option value="weekly">Wöchentlich</option>
                          <option value="monthly">Monatlich</option>
                          <option value="quarterly">Quartalsweise</option>
                          <option value="other">Andere</option>
                        </Select>
                      </Field>
                    </div>
                  </div>

                  {/* Publikationen */}
                  <div className="space-y-4 rounded-md border p-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Publikationen
                        <InfoTooltip content="Fügen Sie hier alle Publikationen hinzu, die von diesem Medienunternehmen herausgegeben werden" className="ml-1.5 inline-flex align-text-top" />
                      </div>
                      <Button type="button" onClick={addPublication} className="text-sm py-1.5 px-3 bg-[#005fab] text-white hover:bg-[#004a8c]">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Publikation hinzufügen
                      </Button>
                    </div>
                    
                    {formData.mediaInfo?.publications && formData.mediaInfo.publications.length > 0 ? (
                      <div className="space-y-4">
                        {formData.mediaInfo.publications.map((pub, index) => (
                          <div 
                            key={pub.id} 
                            className="border rounded-lg p-4 bg-white space-y-3 animate-fade-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                                <span className="font-medium text-sm">Publikation {index + 1}</span>
                              </div>
                              <Button 
                                type="button" 
                                plain 
                                onClick={() => removePublication(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Field>
                                <Label className="text-xs">Name der Publikation *</Label>
                                <Input 
                                  value={pub.name} 
                                  onChange={(e) => updatePublication(index, 'name', e.target.value)}
                                  placeholder="z.B. Tech Today"
                                  className={clsx(
                                    "text-sm transition-colors",
                                    validationErrors.some(e => e.includes(`Publikation ${index + 1}`)) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                                  )}
                                />
                              </Field>
                              <Field>
                                <Label className="text-xs">Typ</Label>
                                <Select 
                                  value={pub.type} 
                                  onChange={(e) => updatePublication(index, 'type', e.target.value)}
                                  className="text-sm"
                                >
                                  {PUBLICATION_TYPES.map(pt => (
                                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                                  ))}
                                </Select>
                              </Field>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Field>
                                <Label className="text-xs">Format</Label>
                                <Select 
                                  value={pub.format} 
                                  onChange={(e) => updatePublication(index, 'format', e.target.value)}
                                  className="text-sm"
                                >
                                  {PUBLICATION_FORMATS.map(pf => (
                                    <option key={pf.value} value={pf.value}>{pf.label}</option>
                                  ))}
                                </Select>
                              </Field>
                              <Field>
                                <Label className="text-xs">Erscheinungsweise</Label>
                                <Select 
                                  value={pub.frequency} 
                                  onChange={(e) => updatePublication(index, 'frequency', e.target.value)}
                                  className="text-sm"
                                >
                                  {PUBLICATION_FREQUENCIES.map(pf => (
                                    <option key={pf.value} value={pf.value}>{pf.label}</option>
                                  ))}
                                </Select>
                              </Field>
                              <Field>
                                <Label className="text-xs">Auflage/Reichweite</Label>
                                <Input 
                                  type="number" 
                                  value={pub.circulation || pub.reach || ''} 
                                  onChange={(e) => updatePublication(index, pub.format === 'print' ? 'circulation' : 'reach', parseInt(e.target.value, 10))}
                                  placeholder="100000"
                                  className="text-sm"
                                />
                              </Field>
                            </div>
                            
                            <Field>
                              <Label className="text-xs">
                                Themenschwerpunkte
                                <InfoTooltip content="Fügen Sie die Hauptthemen dieser Publikation hinzu. Diese werden später für die Filterung in Verteilerlisten verwendet." className="ml-1.5 inline-flex align-text-top" />
                              </Label>
                              <FocusAreasInput 
                                value={pub.focusAreas || []} 
                                onChange={(areas) => updatePublication(index, 'focusAreas', areas)}
                                placeholder="Schwerpunkt hinzufügen..."
                              />
                            </Field>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm">Noch keine Publikationen hinzugefügt</div>
                        <div className="text-xs mt-1">Fügen Sie Publikationen hinzu, um Kontakte später zuordnen zu können</div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div className="space-y-2 rounded-md border p-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Adresse</div>
                <Field>
                  <Label className="sr-only">Straße und Hausnummer</Label>
                  <Input value={formData.address?.street || ''} onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), street: e.target.value }})} placeholder="Straße und Hausnummer" />
                </Field>
                <Field>
                  <Label className="sr-only">Adresszeile 2</Label>
                  <Input value={formData.address?.street2 || ''} onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), street2: e.target.value }})} placeholder="Adresszeile 2" />
                </Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field>
                    <Label className="sr-only">PLZ</Label>
                    <Input value={formData.address?.zip || ''} onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), zip: e.target.value }})} placeholder="PLZ" />
                  </Field>
                  <Field className="col-span-2">
                    <Label className="sr-only">Stadt</Label>
                    <Input value={formData.address?.city || ''} onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), city: e.target.value }})} placeholder="Stadt" />
                  </Field>
                </div>
                <Field>
                  <Label className="sr-only">Land</Label>
                  <Select value={formData.address?.country || 'Deutschland'} onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), country: e.target.value }})}>
                    {countryList.map(({ code, name }) => (
                      <option key={code} value={name}>{name}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Social Media Profile</div>
                {(formData.socialMedia || []).map((profile, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select value={profile.platform} onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}>
                        {Object.entries(socialPlatformLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-6">
                      <Input value={profile.url} onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" plain onClick={() => removeSocialMediaField(index)}>
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={addSocialMediaField} className="w-full bg-[#005fab] text-white hover:bg-[#004a8c]">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Profil hinzufügen
                </Button>
              </div>

              <Field>
                <Label>Tags</Label>
                <TagInput selectedTagIds={formData.tagIds || []} availableTags={tags} onChange={(tagIds) => setFormData({ ...formData, tagIds })} onCreateTag={handleCreateTag} />
              </Field>

              <Field>
                <Label>Notizen</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </Field>
            </FieldGroup>
          </DialogBody>

          <DialogActions className="px-6 py-4 flex justify-between">
            <div className="text-xs text-gray-500">
              <span className="hidden sm:inline">Tastenkürzel: </span>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">⌘S</kbd> Speichern
              <span className="mx-2">·</span>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Esc</kbd> Abbrechen
            </div>
            <div className="flex gap-x-4">
              <Button plain onClick={onClose}>Abbrechen</Button>
              <button 
                type="submit" 
                disabled={loading}
                className="relative inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="opacity-0">Speichern</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    </div>
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </DialogActions>
        </form>
      </Dialog>

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </>
  );
}