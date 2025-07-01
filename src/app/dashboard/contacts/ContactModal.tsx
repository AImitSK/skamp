// src/app/dashboard/contacts/ContactModal.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from "@heroicons/react/20/solid";
import clsx from 'clsx';

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
function validateContactData(formData: Partial<Contact>) {
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
  
  if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
    errors.push('Ungültige Telefonnummer');
  }
  
  return errors;
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
  const { toasts, showToast, removeToast } = useToast();
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
      
      // Load selected company if contact has one
      if (contact.companyId) {
        const company = companies.find(c => c.id === contact.companyId);
        setSelectedCompany(company || null);
      }
    }
    loadTags();
  }, [contact, companies]);

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

  const handleCompanyChange = async (companyId: string) => {
    setFormData({ ...formData, companyId });
    
    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      setSelectedCompany(company || null);
      
      // Reset publications if company changed
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
    const errors = validateContactData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast('error', 'Validierungsfehler', errors[0]);
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
        showToast('success', 'Kontakt aktualisiert', `${formData.firstName} ${formData.lastName} wurde erfolgreich aktualisiert.`);
      } else {
        await contactsService.create({
          ...dataToSave as Omit<Contact, 'id'>,
          userId
        });
        showToast('success', 'Kontakt erstellt', `${formData.firstName} ${formData.lastName} wurde erfolgreich erstellt.`);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      showToast('error', 'Fehler beim Speichern', 'Der Kontakt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const isMediaCompany = selectedCompany && ['publisher', 'media_house', 'agency'].includes(selectedCompany.type);
  const companyPublications = selectedCompany?.mediaInfo?.publications || [];

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
            {contact ? 'Person bearbeiten' : 'Neue Person hinzufügen'}
          </DialogTitle>
          
          <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
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
                    className={clsx(
                      "transition-colors",
                      validationErrors.some(e => e.includes('Vorname')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                  />
                </Field>

                <Field>
                  <Label>Nachname *</Label>
                  <Input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className={clsx(
                      "transition-colors",
                      validationErrors.some(e => e.includes('Nachname')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
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
                <div className="space-y-4 rounded-md border p-4 bg-zinc-50/50 animate-fade-in">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    Publikationen
                    <InfoTooltip content="Wählen Sie aus, für welche Publikationen dieser Kontakt arbeitet" className="ml-1.5 inline-flex align-text-top" />
                  </div>
                  <div className="space-y-2">
                    {companyPublications.map((publication, index) => (
                      <label 
                        key={publication.id}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
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
                    className={clsx(
                      "transition-colors",
                      validationErrors.some(e => e.includes('E-Mail')) && "border-red-500 focus:border-red-500 focus:ring-red-500"
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
                <TagInput
                  selectedTagIds={formData.tagIds || []}
                  availableTags={tags}
                  onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                  onCreateTag={handleCreateTag}
                />
              </Field>
              
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