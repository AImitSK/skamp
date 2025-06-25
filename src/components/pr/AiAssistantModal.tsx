// src/components/pr/AiAssistantModal.tsx (KORRIGIERT)
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input"; // KORREKTUR: Fehlender Import hinzugefügt
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { useAuth } from "@/context/AuthContext";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { Boilerplate } from "@/types/crm";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Timestamp } from "firebase/firestore"; // Import für Timestamp hinzugefügt

interface AiAssistantModalProps {
  onClose: () => void;
  onGenerate: (generatedText: string) => void;
}

export default function AiAssistantModal({ onClose, onGenerate }: AiAssistantModalProps) {
  const { user } = useAuth();
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tonality, setTonality] = useState('professionell');
  const [selectedBoilerplateId, setSelectedBoilerplateId] = useState('');

  useEffect(() => {
    if (user) {
      boilerplatesService.getAll(user.uid).then(setBoilerplates);
    }
  }, [user]);

  const handleGenerateClick = async () => {
    if (!keywords) {
        alert("Bitte geben Sie die wichtigsten Stichpunkte an.");
        return;
    }
    setLoading(true);
    
    const selectedBoilerplate = boilerplates.find(b => b.id === selectedBoilerplateId);
    const prompt = `
      Erstelle eine Pressemitteilung mit folgenden Informationen:
      - Stichpunkte: ${keywords}
      - Zielgruppe: ${targetAudience || 'Allgemeine Öffentlichkeit'}
      - Tonalität: ${tonality}
      - Verwende folgenden Textbaustein als Unternehmensbeschreibung: ${selectedBoilerplate?.content || ''}
    `;

    console.log("Simulierter KI-Prompt:", prompt);
    
    setTimeout(() => {
      const generatedText = `<h2>Titel basierend auf "${keywords.substring(0, 20)}..."</h2><p>Dies ist ein von der KI generierter Text basierend auf Ihren Eingaben. Der Text wurde im Ton <strong>${tonality}</strong> für die Zielgruppe <strong>${targetAudience || 'Allgemeine Öffentlichkeit'}</strong> verfasst.</p><p>Ihre Stichpunkte waren: ${keywords}.</p>${selectedBoilerplate ? `<h3>Über uns</h3><p>${selectedBoilerplate.content}</p>` : ''}`;
      
      onGenerate(generatedText);
      setLoading(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="p-6 flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-indigo-600" />
        KI-Presse-Assistent
      </DialogTitle>
      <DialogBody className="p-6">
        <FieldGroup>
          <Field>
            <Label>Wichtige Stichpunkte / Kernaussage *</Label>
            <Description>Was ist die Nachricht? Gib die wichtigsten Informationen an (z.B. neues Produkt, Partnerschaft, Event).</Description>
            <Textarea
              value={keywords}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKeywords(e.target.value)} // KORREKTUR: Typ hinzugefügt
              rows={5}
              required
              placeholder="z.B. Markteinführung unseres neuen Produkts 'SuperTool' am 15. Juli. Features: ..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label>Zielgruppe (optional)</Label>
              <Input
                value={targetAudience}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetAudience(e.target.value)} // KORREKTUR: Typ hinzugefügt
                placeholder="z.B. Tech-Journalisten, Endkunden"
              />
            </Field>
            <Field>
              <Label>Tonalität</Label>
              <Select value={tonality} onChange={(e) => setTonality(e.target.value)}>
                <option>Professionell</option>
                <option>Locker & Modern</option>
                <option>Technisch & Detailliert</option>
                <option>Enthusiastisch</option>
              </Select>
            </Field>
          </div>
          <Field>
            <Label>Textbaustein einfügen (optional)</Label>
            <Description>Wähle einen vordefinierten Textbaustein (z.B. für die Unternehmensbeschreibung), der in den Text integriert werden soll.</Description>
            <Select value={selectedBoilerplateId} onChange={(e) => setSelectedBoilerplateId(e.target.value)}>
              <option value="">Keinen Textbaustein verwenden</option>
              {boilerplates.map(bp => (
                <option key={bp.id} value={bp.id!}>{bp.name} {bp.category && `(${bp.category})`}</option>
              ))}
            </Select>
          </Field>
        </FieldGroup>
      </DialogBody>
      <DialogActions className="p-6">
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button color="indigo" onClick={handleGenerateClick} disabled={loading}>
          {loading ? 'Generiere...' : 'Text erstellen lassen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}