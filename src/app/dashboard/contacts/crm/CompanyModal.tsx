// src/app/dashboard/contacts/CompanyModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { companiesService, tagsService } from "@/lib/firebase/crm-service";
import { Company, CompanyType, Tag, TagColor, SocialPlatform, socialPlatformLabels, MEDIA_TYPES } from "@/types/crm";
import { TagInput } from "@/components/tag-input";
import { FocusAreasInput } from "@/components/FocusAreasInput";
import { InfoTooltip } from "@/components/InfoTooltip";
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";
import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';

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

// Alert Component
function Alert({ type = 'info', message }: { type?: 'info' | 'error'; message: string }) {
  return (
    <div className={`rounded-md p-4 ${type === 'error' ? 'bg-red-50' : 'bg-blue-50'}`}>
      <div className="flex">
        <div className="shrink-0">
          <InformationCircleIcon 
            className={`h-5 w-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} 
          />
        </div>
        <div className="ml-3">
          <p className={`text-sm ${type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
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
    
    if (errors.length > 0) {
      setValidationErrors(errors);
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
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {company ? 'Firma bearbeiten' : 'Neue Firma hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
          {validationErrors.length > 0 && (
            <div className="mb-4">
              <Alert type="error" message={validationErrors[0]} />
            </div>
          )}

          <FieldGroup>
            <Field>
              <Label>Firmenname *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
                autoFocus
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
                />
              </Field>
              <Field>
                <Label>Telefon</Label>
                <Input 
                  type="tel" 
                  value={formData.phone || ''} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+49 123 456789"
                />
              </Field>
            </div>

            <Field>
              <Label>E-Mail</Label>
              <Input 
                type="email" 
                value={formData.email || ''} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                placeholder="info@firma.de"
              />
            </Field>
            
            {isMediaCompany && (
              <>
                {/* Publikationen */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      Publikationen
                      <InfoTooltip content="Fügen Sie hier alle Publikationen hinzu, die von diesem Medienunternehmen herausgegeben werden" className="ml-1.5 inline-flex align-text-top" />
                    </div>
                    <Button type="button" onClick={addPublication} className="text-sm">
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Publikation hinzufügen
                    </Button>
                  </div>
                  
                  {formData.mediaInfo?.publications && formData.mediaInfo.publications.length > 0 ? (
                    <div className="space-y-4">
                      {formData.mediaInfo.publications.map((pub, index) => (
                        <div key={pub.id} className="border rounded-lg p-4 bg-white space-y-3">
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
                              <Label>Name der Publikation *</Label>
                              <Input 
                                value={pub.name} 
                                onChange={(e) => updatePublication(index, 'name', e.target.value)}
                                placeholder="z.B. Tech Today"
                              />
                            </Field>
                            <Field>
                              <Label>Typ</Label>
                              <Select 
                                value={pub.type} 
                                onChange={(e) => updatePublication(index, 'type', e.target.value)}
                              >
                                {PUBLICATION_TYPES.map(pt => (
                                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                                ))}
                              </Select>
                            </Field>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field>
                              <Label>Format</Label>
                              <Select 
                                value={pub.format} 
                                onChange={(e) => updatePublication(index, 'format', e.target.value)}
                              >
                                {PUBLICATION_FORMATS.map(pf => (
                                  <option key={pf.value} value={pf.value}>{pf.label}</option>
                                ))}
                              </Select>
                            </Field>
                            <Field>
                              <Label>Erscheinungsweise</Label>
                              <Select 
                                value={pub.frequency} 
                                onChange={(e) => updatePublication(index, 'frequency', e.target.value)}
                              >
                                {PUBLICATION_FREQUENCIES.map(pf => (
                                  <option key={pf.value} value={pf.value}>{pf.label}</option>
                                ))}
                              </Select>
                            </Field>
                            <Field>
                              <Label>Auflage/Reichweite</Label>
                              <Input 
                                type="number" 
                                value={pub.circulation || pub.reach || ''} 
                                onChange={(e) => updatePublication(index, pub.format === 'print' ? 'circulation' : 'reach', parseInt(e.target.value, 10))}
                                placeholder="100000"
                              />
                            </Field>
                          </div>
                          
                          <Field>
                            <Label>
                              Themenschwerpunkte
                              <InfoTooltip content="Fügen Sie die Hauptthemen dieser Publikation hinzu" className="ml-1.5 inline-flex align-text-top" />
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
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Adresse */}
            <div className="space-y-2 rounded-md border p-4">
              <div className="text-sm font-medium text-gray-900">Adresse</div>
              <Field>
                <Label className="sr-only">Straße und Hausnummer</Label>
                <Input 
                  value={formData.address?.street || ''} 
                  onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), street: e.target.value }})} 
                  placeholder="Straße und Hausnummer" 
                />
              </Field>
              <Field>
                <Label className="sr-only">Adresszeile 2</Label>
                <Input 
                  value={formData.address?.street2 || ''} 
                  onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), street2: e.target.value }})} 
                  placeholder="Adresszeile 2" 
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <Label className="sr-only">PLZ</Label>
                  <Input 
                    value={formData.address?.zip || ''} 
                    onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), zip: e.target.value }})} 
                    placeholder="PLZ" 
                  />
                </Field>
                <Field className="col-span-2">
                  <Label className="sr-only">Stadt</Label>
                  <Input 
                    value={formData.address?.city || ''} 
                    onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), city: e.target.value }})} 
                    placeholder="Stadt" 
                  />
                </Field>
              </div>
              <Field>
                <Label className="sr-only">Land</Label>
                <Select 
                  value={formData.address?.country || 'Deutschland'} 
                  onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), country: e.target.value }})}
                >
                  {countryList.map(({ code, name }) => (
                    <option key={code} value={name}>{name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Social Media */}
            <div className="space-y-4 rounded-md border p-4">
              <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
              {(formData.socialMedia || []).map((profile, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select 
                      value={profile.platform} 
                      onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                    >
                      {Object.entries(socialPlatformLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Input 
                      value={profile.url} 
                      onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)} 
                      placeholder="https://..." 
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" plain onClick={() => removeSocialMediaField(index)}>
                      <TrashIcon className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" onClick={addSocialMediaField} className="w-full">
                <PlusIcon className="h-4 w-4 mr-2" />
                Profil hinzufügen
              </Button>
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

            {/* Notizen */}
            <Field>
              <Label>Notizen</Label>
              <Textarea 
                value={formData.notes || ''} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                rows={3} 
              />
            </Field>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <button 
            type="submit" 
            disabled={loading}
            className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab] disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}