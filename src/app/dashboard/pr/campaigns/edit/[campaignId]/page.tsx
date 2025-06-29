// src/app/dashboard/pr/campaigns/edit/[campaignId]/page.tsx - Mit Customer Support
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
import { CustomerBadge } from '@/components/pr/CustomerSelector';
import Link from 'next/link';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ClockIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

// Dynamic import für das kompatible Modal
import dynamic from 'next/dynamic';
import { LegacyGenerationResult } from '@/lib/ai/interface-adapters';

const CompatibleStructuredModal = dynamic(() => import('@/components/pr/ai/CompatibleStructuredModal'), {
  ssr: false
});

// Verwende Legacy Generation Result für Kompatibilität
type GenerationResult = LegacyGenerationResult;

export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  // Form State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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

      // KI-Metadata laden (falls vorhanden)
      try {
        const metadata = localStorage.getItem(`campaign_ai_metadata_${campaignId}`);
        if (metadata) {
          setAiMetadata(JSON.parse(metadata));
        }
      } catch (e) {
        // Ignoriere Fehler beim Laden der Metadata
      }

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
      
      // Erfolgs-Nachricht anzeigen
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  // KI-Content Handler mit intelligenter Übernahme
  const handleAiGenerate = (result: GenerationResult) => {
    console.log('🤖 AI Generation Result (Edit Mode):', result);

    // Intelligente Feld-Übernahme
    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    setPressReleaseContent(result.content);

    // Metadata aktualisieren
    if (result.metadata) {
      setAiMetadata({
        generatedBy: result.metadata.generatedBy,
        timestamp: result.metadata.timestamp,
        context: result.metadata.context
      });

      // Metadata in localStorage speichern
      if (campaign?.id) {
        localStorage.setItem(`campaign_ai_metadata_${campaign.id}`, JSON.stringify({
          generatedBy: result.metadata.generatedBy,
          timestamp: result.metadata.timestamp,
          context: result.metadata.context
        }));
      }
    }

    // Modal schließen und Success anzeigen
    setShowAiModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  if (loading) return <div className="p-8 text-center">Lade Kampagnen-Daten...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <Heading>Kampagne bearbeiten</Heading>
        <Text className="mt-1">Du bearbeitest den Entwurf: "{campaign?.title}"</Text>
        
        {/* Campaign Metadata with Customer Info */}
        {campaign && (
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Erstellt: {campaign.createdAt?.toDate().toLocaleDateString('de-DE')}
            </div>
            {campaign.clientId && (
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="h-4 w-4" />
                <CustomerBadge 
                  customerId={campaign.clientId} 
                  customerName={campaign.clientName}
                  showIcon={false}
                />
              </div>
            )}
            {aiMetadata && (
              <div className="flex items-center text-indigo-600">
                <SparklesIcon className="h-4 w-4 mr-1" />
                KI-generiert: {new Date(aiMetadata.timestamp).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="font-medium text-green-900">Änderungen gespeichert!</h4>
              <p className="text-sm text-green-700 mt-1">
                Die Kampagne wurde erfolgreich aktualisiert.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 p-8 border rounded-lg bg-white">
        {/* Customer Info Section - READ ONLY in Edit Mode */}
        {campaign?.clientId && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-600">Kunde</Label>
                <div className="mt-1 flex items-center gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {campaign.clientName || 'Unbekannter Kunde'}
                  </span>
                  <CustomerBadge 
                    customerId={campaign.clientId} 
                    customerName={campaign.clientName}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/mediathek?clientId=${campaign.clientId}`}>
                  <Button plain className="text-sm">
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    Medien verwalten
                  </Button>
                </Link>
                {/* TODO: Add Asset Manager Button */}
                {/* <Button plain className="text-sm">
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  Assets anhängen
                </Button> */}
              </div>
            </div>
          </div>
        )}

        <Field>
          <Label className="text-base font-semibold">Verteiler</Label>
          <Select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
            <option value="">Verteiler wählen...</option>
            {availableLists.map(list => (
              <option key={list.id} value={list.id!}>
                {list.name} ({list.contactCount} Kontakte)
              </option>
            ))}
          </Select>
          
          {selectedList && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm">
              <p>
                <strong>{selectedList.contactCount} Empfänger</strong> in der Liste "{selectedList.name}".
              </p>
            </div>
          )}
        </Field>

        <div className="border-t pt-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-semibold">Pressemitteilung</h3>
              <Text>Bearbeite den Titel und den Inhalt deiner Mitteilung.</Text>
              
              {/* KI-Metadata anzeigen */}
              {aiMetadata && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                  <div className="flex items-center text-indigo-700">
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    <span className="font-medium">Von KI generiert</span>
                    <span className="ml-2">
                      {new Date(aiMetadata.timestamp).toLocaleString('de-DE')}
                    </span>
                    {aiMetadata.context?.industry && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                        {aiMetadata.context.industry}
                      </span>
                    )}
                    {aiMetadata.context?.tone && (
                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                        {aiMetadata.context.tone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg"
            >
              <SparklesIcon className="w-5 h-5"/>
              KI-Assistent verwenden
            </Button>
          </div>
          
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

        {/* Assets Section - Coming Soon */}
        <div className="border-t pt-8">
          <h3 className="text-base font-semibold text-zinc-400">
            <DocumentTextIcon className="h-5 w-5 inline mr-2" />
            Medien anhängen (zukünftiges Feature)
          </h3>
          <Text className="text-zinc-400">
            Hier kannst du bald Bilder, Dokumente und andere Medien an deine Kampagne anhängen.
          </Text>
        </div>
        
        <div className="border-t pt-8">
           <h3 className="text-base font-semibold text-zinc-400">Versand planen (zukünftiges Feature)</h3>
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

      {/* Kompatibles strukturiertes KI-Modal */}
      {showAiModal && (
        <CompatibleStructuredModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
          // TODO: Pass customer context
          // customerContext={{
          //   companyName: campaign?.clientName,
          //   companyId: campaign?.clientId
          // }}
        />
      )}
    </div>
  );
}