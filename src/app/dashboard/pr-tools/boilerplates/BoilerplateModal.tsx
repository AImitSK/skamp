// src\app\dashboard\pr-tools\boilerplates\BoilerplateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { Boilerplate } from "@/types/crm";

interface BoilerplateModalProps {
  boilerplate: Boilerplate | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

export default function BoilerplateModal({ boilerplate, onClose, onSave, userId }: BoilerplateModalProps) {
  const [formData, setFormData] = useState<Partial<Boilerplate>>({
    name: '',
    category: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (boilerplate) {
      setFormData(boilerplate);
    }
  }, [boilerplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) return;

    setLoading(true);
    try {
      if (boilerplate?.id) {
        // Bestehenden Baustein aktualisieren
        const { id, ...updateData } = formData;
        await boilerplatesService.update(boilerplate.id, updateData);
      } else {
        // Neuen Baustein erstellen
        const dataToSave = {
            name: formData.name!,
            content: formData.content!,
            category: formData.category || '',
            userId: userId,
        };
        await boilerplatesService.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Textbausteins");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle className="p-6">
          {boilerplate ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein'}
        </DialogTitle>
        <DialogBody className="p-6">
          <FieldGroup>
            <Field>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </Field>
            <Field>
              <Label>Kategorie (optional)</Label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="z.B. Über Uns, Produktinfo"
              />
            </Field>
            <Field>
              <Label>Inhalt *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={8}
              />
            </Field>
          </FieldGroup>
        </DialogBody>
        <DialogActions className="p-6">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button color="indigo" type="submit" disabled={loading}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}