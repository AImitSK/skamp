// src/app/dashboard/contacts/crm/ContactModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { contactsService, tagsService, companiesService } from "@/lib/firebase/crm-service";
import { Contact, Company, Tag, TagColor, SocialPlatform, socialPlatformLabels } from "@/types/crm";
import { TagInput } from "@/components/tag-input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { 
  PlusIcon, 
  TrashIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

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

interface ContactModalProps {
  contact: Contact | null;
  companies: Company[];
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

export default function ContactModal({ contact, companies, onClose, onSave, userId }: ContactModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    companyId: '',
    notes: '',
    tagIds: [],
    socialMedia: [],
    mediaInfo: {
      publications: []
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (contact) {
      setFormData({ 
        ...contact, 
        tagIds: contact.tagIds || [],
        socialMedia: contact.socialMedia || [],
        mediaInfo: {
          publications: [],
          ...(contact.mediaInfo || {})
        }
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

  const handleCompanyChange = async (companyId: string) => {
    setFormData({ ...formData, companyId });
    
    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      setSelectedCompany(company || null);
      
      if (formData.mediaInfo) {
        setFormData(prev => ({
          ...prev,
          mediaInfo: {
            ...prev.mediaInfo!,
            publications: []
          }
        }));
      }
    } else {
      setSelectedCompany(null);
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

  const handlePublicationToggle = (publicationName: string) => {
    const currentPublications = formData.mediaInfo?.publications || [];
    const updated = currentPublications.includes(publicationName)
      ? currentPublications.filter(p => p !== publicationName)
      : [...currentPublications, publicationName];
    
    setFormData(prev => ({
      ...prev,
      mediaInfo: {
        ...prev.mediaInfo!,
        publications: updated
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const errors: string[] = [];
    if (!formData.firstName?.trim()) {
      errors.push('Vorname ist erforderlich');
    }
    if (!formData.lastName?.trim()) {
      errors.push('Nachname ist erforderlich');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      const dataToSave = { 
        ...formData, 
        tagIds: formData.tagIds || [],
        socialMedia: formData.socialMedia || []
      };
      
      if (contact?.id) {
        await contactsService.update(contact.id, dataToSave);
      } else {
        await contactsService.create({
          ...dataToSave as Omit<Contact, 'id'>,
          userId
        });
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
  const companyPublications = selectedCompany?.mediaInfo?.publications || [];

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {contact ? 'Person bearbeiten' : 'Neue Person hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
          {validationErrors.length > 0 && (
            <div className="mb-4">
              <Alert type="error" message={validationErrors[0]} />
            </div>
          )}

          <FieldGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Vorname *</Label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  autoFocus
                />
              </Field>

              <Field>
                <Label>Nachname *</Label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

            {/* Publikations-Zuordnung für Medienunternehmen */}
            {isMediaCompany && companyPublications.length > 0 && (
              <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                  Publikationen
                  <InfoTooltip content="Wählen Sie aus, für welche Publikationen dieser Kontakt arbeitet" className="ml-1.5 inline-flex align-text-top" />
                </div>
                <div className="space-y-2">
                  {companyPublications.map((publication) => (
                    <label 
                      key={publication.id}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.mediaInfo?.publications?.includes(publication.name) || false}
                        onChange={() => handlePublicationToggle(publication.name)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{publication.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {publication.type} • {publication.format} • {publication.frequency}
                        </div>
                        {publication.focusAreas && publication.focusAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {publication.focusAreas.slice(0, 3).map(area => (
                              <Badge key={area} color="zinc" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {publication.focusAreas.length > 3 && (
                              <span className="text-xs text-gray-500">+{publication.focusAreas.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Field>
              <Label>Position</Label>
              <Input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="z.B. Geschäftsführer, Einkäufer, Redakteur"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@firma.de"
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
                placeholder="Weitere Informationen zur Person..."
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