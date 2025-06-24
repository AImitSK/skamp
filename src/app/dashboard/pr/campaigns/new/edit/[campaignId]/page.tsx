// src/app/dashboard/pr/campaigns/edit/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import Link from 'next/link';

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaignData = useCallback(async () => {
    if (!user || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [campaignData, listsData] = await Promise.all([
        prService.getById(campaignId),
        listsService.getAll(user.uid)
      ]);

      if (!campaignData) {
        setError("Kampagne nicht gefunden.");
        setLoading(false);
        return;
      }

      setCampaign(campaignData);
      setAvailableLists(listsData);
      
      // Formular-Felder mit den geladenen Daten befüllen
      setCampaignTitle(campaignData.title);
      setSelectedListId(campaignData.distributionListId);
      setPressReleaseContent(campaignData.contentHtml);

    } catch (err) {
      console.error("Fehler beim Laden der Kampagne:", err);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const selectedList = availableLists.find(list => list.id === selectedListId);
  const isFormValid = !!selectedListId && campaignTitle.trim() !== '' && pressReleaseContent.trim() !== '' && pressReleaseContent !== '<p></p>';

  const handleUpdate = async () => {
    if (!isFormValid || !campaign) return;

    setIsSaving(true);
    try {
      const updatedData: Partial<PRCampaign> = {
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        distributionListId: selectedListId,
        distributionListName: selectedList?.name,
        recipientCount: selectedList?.contactCount,
      };
      
      await prService.update(campaign.id!, updatedData);
      alert('Änderungen gespeichert!');

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Lade Kampagnen-Daten...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <Heading>Kampagne bearbeiten</Heading>
        <Text className="mt-1">Du bearbeitest den Entwurf: "{campaign?.title}"</Text>
      </div>

      <div className="space-y-8 p-8 border rounded-lg bg-white">
        <Field>
          <Label className="text-base font-semibold">Schritt 1: Verteiler auswählen</Label>
          <Select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
            <option value="">Verteiler wählen...</option>
            {availableLists.map(list => (
              <option key={list.id} value={list.id!}>
                {list.name} ({list.contactCount} Kontakte)
              </option>
            ))}
          </Select>
        </Field>

        <div className="border-t pt-8">
          <h3 className="text-base font-semibold">Schritt 2: Pressemitteilung verfassen</h3>
          <div className="mt-4 space-y-4">
            <Field>
              <Label>Titel / Betreffzeile</Label>
              <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
            </Field>
            <Field>
              <Label>Inhalt</Label>
              <RichTextEditor content={pressReleaseContent} onChange={setPressReleaseContent} />
            </Field>
          </div>
        </div>
        
        <div className="border-t pt-8">
           <h3 className="text-base font-semibold text-zinc-400">Schritt 3: Versand planen (zukünftiges Feature)</h3>
           <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Zurück zur Übersicht</Button>
        </Link>
        <Button color="indigo" disabled={!isFormValid || isSaving} onClick={handleUpdate}>
          {isSaving ? 'Speichern...' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  );
}
