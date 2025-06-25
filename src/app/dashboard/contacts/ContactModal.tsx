// src/app/dashboard/contacts/ContactModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Contact, Company, Tag, TagColor, STANDARD_BEATS } from "@/types/crm";
import { TagInput } from "@/components/tag-input";

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
    mediaInfo: {
        beat: '',
        expertise: [],
        preferredContactTime: '',
        deadlines: '',
        languagePreferences: [],
        socialHandles: {
            twitter: '',
            linkedin: '',
            mastodon: ''
        }
    }
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (contact) {
      setFormData({ 
          ...contact, 
          tagIds: contact.tagIds || [],
          mediaInfo: {
            beat: '',
            expertise: [],
            preferredContactTime: '',
            deadlines: '',
            languagePreferences: [],
            socialHandles: {
                twitter: '',
                linkedin: '',
                mastodon: ''
            },
            ...(contact.mediaInfo || {})
          }
    });
    }
    loadTags();
  }, [contact]);

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

  const handleMediaInfoChange = (field: keyof NonNullable<Contact['mediaInfo']>, value: any) => {
    setFormData(prev => ({
        ...prev,
        mediaInfo: {
            ...prev.mediaInfo,
            [field]: value,
        }
    }));
  }
  
    const handleSocialHandleChange = (platform: 'twitter' | 'linkedin' | 'mastodon', value: string) => {
        setFormData(prev => ({
            ...prev,
            mediaInfo: {
                ...prev.mediaInfo,
                socialHandles: {
                    ...prev.mediaInfo?.socialHandles,
                    [platform]: value,
                }
            }
        }));
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;

    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (!dataToSave.tagIds) {
        dataToSave.tagIds = [];
      }

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
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Kontakts");
    } finally {
      setLoading(false);
    }
  };

  const isMediaContact = formData.tagIds?.some(tagId => tags.find(t => t.id === tagId)?.name.toLowerCase().includes('presse')) || false;

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="p-6">
          {contact ? 'Person bearbeiten' : 'Neue Person hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
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
              <Label>Firma</Label>
              <Select
                value={formData.companyId || ''}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              >
                <option value="">Keine Firma zugeordnet</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Position</Label>
              <Input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="z.B. Geschäftsführer, Einkäufer"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
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

            <Field>
              <Label>Tags</Label>
              <TagInput
                selectedTagIds={formData.tagIds || []}
                availableTags={tags}
                onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                onCreateTag={handleCreateTag}
              />
            </Field>
            
            {isMediaContact && (
                 <div className="space-y-4 rounded-md border p-4 bg-zinc-50/50">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Journalisten-Informationen</p>
                    <Field>
                        <Label>Ressort / Beat</Label>
                        <Select value={formData.mediaInfo?.beat} onChange={(e) => handleMediaInfoChange('beat', e.target.value)}>
                            <option value="">Kein Ressort</option>
                            {STANDARD_BEATS.map(beat => <option key={beat} value={beat}>{beat}</option>)}
                        </Select>
                    </Field>
                    <Field>
                        <Label>Expertise-Bereiche</Label>
                        <Input value={formData.mediaInfo?.expertise?.join(', ') || ''} onChange={e => handleMediaInfoChange('expertise', e.target.value.split(',').map(s => s.trim()))} placeholder="z.B. KI, SaaS, B2B"/>
                        <Description>Mehrere Bereiche mit Komma trennen.</Description>
                    </Field>
                     <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <Label>Bevorzugte Kontaktzeit</Label>
                            <Input value={formData.mediaInfo?.preferredContactTime} onChange={e => handleMediaInfoChange('preferredContactTime', e.target.value)} placeholder="z.B. Vormittags"/>
                        </Field>
                         <Field>
                            <Label>Redaktionsschluss</Label>
                            <Input value={formData.mediaInfo?.deadlines} onChange={e => handleMediaInfoChange('deadlines', e.target.value)} placeholder="z.B. Montags 14:00"/>
                        </Field>
                    </div>
                     <Field>
                        <Label>Social Media Handles</Label>
                        <div className="grid grid-cols-3 gap-2">
                             <Input value={formData.mediaInfo?.socialHandles?.twitter} onChange={e => handleSocialHandleChange('twitter', e.target.value)} placeholder="Twitter / X"/>
                             <Input value={formData.mediaInfo?.socialHandles?.linkedin} onChange={e => handleSocialHandleChange('linkedin', e.target.value)} placeholder="LinkedIn"/>
                             <Input value={formData.mediaInfo?.socialHandles?.mastodon} onChange={e => handleSocialHandleChange('mastodon', e.target.value)} placeholder="Mastodon"/>
                        </div>
                    </Field>
                </div>
            )}
            
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

        <DialogActions className="p-6">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <Button color="indigo" type="submit" disabled={loading}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}