// src/app/dashboard/contacts/ContactModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Label } from "@/components/label"; // <-- Importiere die neue Label-Komponente
import { Button } from "@/components/button";
import { contactsService } from "@/lib/firebase/crm-service";
import { Contact, Company } from "@/types/crm";

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
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;

    setLoading(true);
    try {
      if (contact?.id) {
        // Update
        await contactsService.update(contact.id, formData);
      } else {
        // Create
        await contactsService.create({
          ...formData as Omit<Contact, 'id'>,
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

  return (
    <Dialog open={true} onClose={onClose}>
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

{/* KORREKTUR: Wir fügen dem Container Flexbox-Eigenschaften hinzu 
            und geben den Buttons explizite Klassen für ein garantiertes Aussehen. */}
        <DialogActions className="flex justify-end gap-4 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}