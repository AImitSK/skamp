// src/app/dashboard/pr/campaigns/new/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // NEU
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service'; // NEU
import { DistributionList } from '@/types/lists';
import { PRCampaign } from '@/types/pr'; // NEU
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import Link from 'next/link';

export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter(); // NEU
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // NEU

  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');

  useEffect(() => {
    if (user) {
      setLoading(true);
      listsService.getAll(user.uid)
        .then(setAvailableLists)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const selectedList = availableLists.find(list => list.id === selectedListId);

  const isFormValid = !!selectedListId && campaignTitle.trim() !== '' && pressReleaseContent.trim() !== '' && pressReleaseContent !== '<p></p>';

  // NEU: Funktion zum Speichern des Entwurfs
  const handleSaveDraft = async () => {
    if (!isFormValid || !user || !selectedList) return;

    setIsSaving(true);
    try {
      const campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        status: 'draft', // Wir speichern als Entwurf
        distributionListId: selectedList.id!,
        distributionListName: selectedList.name,
        recipientCount: selectedList.contactCount,
        scheduledAt: null,
        sentAt: null,
      };

      const newCampaignId = await prService.create(campaignData);
      alert('Kampagnen-Entwurf gespeichert!');
      // Leite den Benutzer zur (zukünftigen) Bearbeitungsseite der Kampagne weiter
      router.push(`/dashboard/pr/campaigns/edit/${newCampaignId}`);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten.");
      setIsSaving(false);
    }
  };

return (
    <div>
      <div className="mb-8">
        <Heading>Neue PR-Kampagne erstellen</Heading>
        <Text className="mt-1">Wähle einen Verteiler und verfasse deine Aussendung.</Text>
      </div>

      <div className="space-y-8 p-8 border rounded-lg bg-white">
        {/* Schritt 1: Verteiler auswählen */}
        <Field>
          <Label className="text-base font-semibold">Schritt 1: Verteiler auswählen</Label>
          <Text className="mb-2">Wähle aus, an wen deine Kampagne gesendet werden soll.</Text>
          {loading ? (
            <div className="h-10 w-full bg-zinc-100 rounded-md animate-pulse" />
          ) : (
            <Select 
              value={selectedListId} 
              onChange={(e) => setSelectedListId(e.target.value)}
            >
              <option value="">Verteiler wählen...</option>
              {availableLists.map(list => (
                <option key={list.id} value={list.id!}>
                  {list.name} ({list.contactCount} Kontakte)
                </option>
              ))}
            </Select>
          )}
          
          {selectedList && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm">
              <p>
                <strong>{selectedList.contactCount} Empfänger</strong> in der Liste "{selectedList.name}" ausgewählt.
                {selectedList.type === 'dynamic' && " (Diese Liste wird automatisch aktualisiert)"}
              </p>
              <Link href={`/dashboard/listen/${selectedList.id}`} className="text-indigo-600 font-medium hover:underline mt-1 inline-block">
                Liste ansehen oder bearbeiten &rarr;
              </Link>
            </div>
          )}
        </Field>

        {/* GEÄNDERT: Schritt 2 - <Label> wurde durch <div> und <h3> ersetzt */}
        <div className="border-t pt-8">
            <h3 className="text-base font-semibold">Schritt 2: Pressemitteilung verfassen</h3>
            <Text className="mb-2">Gib den Titel und den Inhalt deiner Mitteilung ein.</Text>
            <div className="mt-4 space-y-4">
              <Field>
                <Label>Titel / Betreffzeile</Label>
                <Input 
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="Zukunftsweisende Partnerschaft bekannt gegeben..."
                />
              </Field>
              <Field>
                <Label>Inhalt</Label>
                <RichTextEditor 
                  content={pressReleaseContent}
                  onChange={setPressReleaseContent}
                />
              </Field>
            </div>
        </div>
        
        {/* GEÄNDERT: Schritt 3 - <Label> wurde durch <h3> ersetzt */}
        <div className="border-t pt-8">
           <h3 className="text-base font-semibold text-zinc-400">Schritt 3: Versand planen (zukünftiges Feature)</h3>
            <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
        </div>
      </div>
      
<div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Abbrechen</Button>
        </Link>
        {/* GEÄNDERT: Button speichert jetzt den Entwurf */}
        <Button 
          color="indigo" 
          disabled={!isFormValid || isSaving}
          onClick={handleSaveDraft}
        >
          {isSaving ? 'Speichern...' : 'Als Entwurf speichern'}
        </Button>
      </div>
    </div>
  );
}