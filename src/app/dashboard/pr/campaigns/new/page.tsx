// src/app/dashboard/pr/campaigns/new/page.tsx - Komplett korrigiert
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign } from '@/types/pr';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SparklesIcon } from "@heroicons/react/24/outline";
import Link from 'next/link';

// Dynamic import für das Modal um SSR-Probleme zu vermeiden
import dynamic from 'next/dynamic';
const AiAssistantModal = dynamic(() => import('@/components/pr/AiAssistantModal'), {
  ssr: false
});

export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Form State
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      listsService.getAll(user.uid)
        .then(setAvailableLists)
        .catch((error) => {
          console.error('Fehler beim Laden der Listen:', error);
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const selectedList = availableLists.find(list => list.id === selectedListId);
  const isFormValid = !!selectedListId && 
                     campaignTitle.trim() !== '' && 
                     pressReleaseContent.trim() !== '' && 
                     pressReleaseContent !== '<p></p>';

  const handleSaveDraft = async () => {
    if (!isFormValid || !user || !selectedList) return;

    setIsSaving(true);
    try {
      const campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        status: 'draft',
        distributionListId: selectedList.id!,
        distributionListName: selectedList.name,
        recipientCount: selectedList.contactCount,
        scheduledAt: null,
        sentAt: null,
      };

      const newCampaignId = await prService.create(campaignData);
      alert('Kampagnen-Entwurf gespeichert!');
      router.push(`/dashboard/pr/campaigns/edit/${newCampaignId}`);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  // KI-Content Handler
  const handleAiGenerate = (generatedText: string) => {
    setPressReleaseContent(generatedText);
    setShowAiModal(false);
  };

  const handleCloseModal = () => {
    setShowAiModal(false);
  };

  const handleOpenModal = () => {
    setShowAiModal(true);
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

        {/* Schritt 2: Pressemitteilung mit KI-Assistent */}
        <div className="border-t pt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <div>
              <h3 className="text-base font-semibold">Schritt 2: Pressemitteilung verfassen</h3>
              <Text>Gib den Titel und den Inhalt deiner Mitteilung ein oder nutze den KI-Assistenten.</Text>
            </div>
            <Button 
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg self-start sm:self-auto"
            >
              <SparklesIcon className="w-5 h-5" />
              KI-Assistent
            </Button>
          </div>
          
          <div className="mt-4 space-y-4">
            <Field>
              <Label>Titel / Betreffzeile</Label>
              <Input 
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Innovative Partnerschaft revolutioniert die Branche..."
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
        
        {/* Schritt 3: Versand planen */}
        <div className="border-t pt-8">
          <h3 className="text-base font-semibold text-zinc-400">Schritt 3: Versand planen (zukünftiges Feature)</h3>
          <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Abbrechen</Button>
        </Link>
        <Button 
          color="indigo" 
          disabled={!isFormValid || isSaving}
          onClick={handleSaveDraft}
        >
          {isSaving ? 'Speichern...' : 'Als Entwurf speichern'}
        </Button>
      </div>

      {/* KI-Assistent Modal */}
      {showAiModal && (
        <AiAssistantModal
          onClose={handleCloseModal}
          onGenerate={handleAiGenerate}
          existingContent={pressReleaseContent || ''}
        />
      )}
    </div>
  );
}