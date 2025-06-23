// src/app/dashboard/contacts/CompanyModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Label } from "@/components/label"; // <-- Importiere die neue Label-Komponente
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { companiesService } from "@/lib/firebase/crm-service";
import { Company, CompanyType } from "@/types/crm";

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
      city: '',
      zip: '',
      country: 'Deutschland'
    },
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      if (company?.id) {
        // Update
        await companiesService.update(company.id, formData);
      } else {
        // Create
        await companiesService.create({
          ...formData as Omit<Company, 'id'>,
          userId
        });
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

  return (
    <Dialog open={true} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle className="p-6">
          {company ? 'Firma bearbeiten' : 'Neue Firma hinzufügen'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          <FieldGroup>
            <Field>
              <Label>Firmenname *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Typ</Label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}
                >
                  <option value="customer">Kunde</option>
                  <option value="supplier">Lieferant</option>
                  <option value="partner">Partner</option>
                  <option value="other">Sonstiges</option>
                </Select>
              </Field>

              <Field>
                <Label>Branche</Label>
                <Input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="z.B. IT, Handel, Industrie"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-4">
              <Label>Adresse</Label>
              <Field>
                <Input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                  placeholder="Straße und Hausnummer"
                />
              </Field>
              
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <Input
                    type="text"
                    value={formData.address?.zip || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, zip: e.target.value }
                    })}
                    placeholder="PLZ"
                  />
                </Field>
                <Field className="col-span-2">
                  <Input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="Stadt"
                  />
                </Field>
              </div>
            </div>

            <Field>
              <Label>Notizen</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Weitere Informationen zur Firma..."
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