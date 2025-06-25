// src/app/dashboard/contacts/CompanyModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { companiesService, tagsService } from "@/lib/firebase/crm-service";
import { Company, CompanyType, Tag, TagColor, SocialPlatform, socialPlatformLabels, MEDIA_TYPES } from "@/types/crm";
import { TagInput } from "@/components/tag-input";
import { PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';

// Länderliste vorbereiten
countries.registerLocale(de);
const countryObject = countries.getNames('de', { select: 'official' });
const countryList = Object.entries(countryObject).map(([code, name]) => ({
  code,
  name
})).sort((a, b) => a.name.localeCompare(b.name));


interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

export default function CompanyModal({ company, onClose, onSave, userId }: CompanyModalProps) {
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    type: 'customer',
    industry: '',
    website: '',
    phone: '',
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
    }
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

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
      console.error("Fehler beim Laden der Tags:", error);
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    const tagId = await tagsService.create({ name, color, userId });
    await loadTags();
    return tagId;
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
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
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
      alert("Fehler beim Speichern der Firma");
    } finally {
      setLoading(false);
    }
  };
  
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-base font-semibold">
          {company ? 'Firma bearbeiten' : 'Neue Firma hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          <FieldGroup>
            <Field>
              <Label>Firmenname *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Branche</Label>
                <Input value={formData.industry || ''} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="z.B. IT, Handel, Industrie" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <Label>Website</Label>
                    <Input type="url" value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                </Field>
                <Field>
                    <Label>Telefon</Label>
                    <Input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+49 123 456789" />
                </Field>
            </div>
            
            {isMediaCompany && (
                 <div className="space-y-4 rounded-md border p-4 bg-zinc-50/50">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Medien-Informationen</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <Label>Medientyp</Label>
                            <Select value={formData.mediaInfo?.mediaType} onChange={(e) => handleMediaInfoChange('mediaType', e.target.value)}>
                                {MEDIA_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                            </Select>
                        </Field>
                         <Field>
                            <Label>Erscheinungsweise</Label>
                            <Select value={formData.mediaInfo?.publicationFrequency} onChange={(e) => handleMediaInfoChange('publicationFrequency', e.target.value)}>
                                <option value="daily">Täglich</option>
                                <option value="weekly">Wöchentlich</option>
                                <option value="monthly">Monatlich</option>
                                <option value="quarterly">Quartalsweise</option>
                                <option value="other">Andere</option>
                            </Select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <Label>Auflage (Print)</Label>
                            <Input type="number" value={formData.mediaInfo?.circulation} onChange={(e) => handleMediaInfoChange('circulation', parseInt(e.target.value, 10))} />
                        </Field>
                        <Field>
                            <Label>Reichweite (Online)</Label>
                            <Input type="number" value={formData.mediaInfo?.reach} onChange={(e) => handleMediaInfoChange('reach', parseInt(e.target.value, 10))} />
                        </Field>
                    </div>
                     <Field>
                        <Label>Themenschwerpunkte</Label>
                        <Input value={formData.mediaInfo?.focusAreas?.join(', ') || ''} onChange={(e) => handleMediaInfoChange('focusAreas', e.target.value.split(',').map(s => s.trim()))} placeholder="z.B. Technologie, Wirtschaft, Lifestyle"/>
                        <Description>Mehrere Schwerpunkte mit Komma trennen.</Description>
                    </Field>
                </div>
            )}
            
            <div className="space-y-2 rounded-md border p-4">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">Adresse</Label>
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
               <Label className="text-sm font-medium text-gray-900 dark:text-white">Social Media Profile</Label>
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
              <Button type="button" onClick={addSocialMediaField} className="w-full">
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

        <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button color="indigo" type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}