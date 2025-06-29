// src/app/dashboard/pr/campaigns/new/page.tsx - KORRIGIERT ohne Duplikate
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign } from '@/types/pr';
import { GenerationResult } from '@/types/ai'; // Importiere den offiziellen Typ
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from 'next/link';

// Dynamic import für das neue Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
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
  const [aiGenerationHistory, setAiGenerationHistory] = useState<GenerationResult[]>([]);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);

  // Success/Warning State
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
      
      // Erfolgs-Nachricht anzeigen
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      // Optional: Metadata für KI-Nutzung speichern
      if (lastGeneration && lastGeneration.metadata) {
        localStorage.setItem(`campaign_ai_metadata_${newCampaignId}`, JSON.stringify({
          generatedBy: lastGeneration.metadata.generatedBy,
          timestamp: lastGeneration.metadata.timestamp,
          context: lastGeneration.metadata.context
        }));
      }

      router.push(`/dashboard/pr/campaigns/edit/${newCampaignId}`);

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  // Neuer KI-Content Handler mit intelligenter Übernahme
  const handleAiGenerate = (result: GenerationResult) => {
    console.log('🤖 AI Generation Result:', result);

    // Intelligente Feld-Übernahme - verwende die Struktur des importierten Typs
    if (result.headline && result.structured?.headline) {
      // Wenn ein separater Titel generiert wurde, nutze ihn
      setCampaignTitle(result.headline);
    } else if (result.structured?.headline) {
      // Sonst nutze die Headline aus der Struktur
      setCampaignTitle(result.structured.headline);
    }

    // Content in Rich-Text-Editor übernehmen
    setPressReleaseContent(result.content);

    // Generation History und Metadata
    setLastGeneration(result);
    setAiGenerationHistory(prev => [...prev, result]);

    // Modal schließen
    setShowAiModal(false);

    // Success-Indikator anzeigen
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
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

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="font-medium text-green-900">
                {lastGeneration ? 'KI-Assistent erfolgreich verwendet!' : 'Entwurf gespeichert!'}
              </h4>
              <p className="text-sm text-green-700 mt-1">
                {lastGeneration 
                  ? 'Die Pressemitteilung wurde automatisch in Titel und Inhalt übernommen.'
                  : 'Deine Kampagne wurde als Entwurf gespeichert.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

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

        {/* Schritt 2: Pressemitteilung mit verbessertem KI-Assistent */}
        <div className="border-t pt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
            <div>
              <h3 className="text-base font-semibold">Schritt 2: Pressemitteilung verfassen</h3>
              <Text>Erstelle professionelle Pressemitteilungen mit dem KI-Assistenten oder manuell.</Text>
              
              {/* KI-Features Highlight */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <SparklesIcon className="w-3 h-3 mr-1" />
                  Strukturierte Generierung
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Intelligente Übernahme
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Journalistische Standards
                </span>
              </div>
            </div>
            
            <Button 
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg self-start sm:self-auto"
            >
              <SparklesIcon className="w-5 h-5" />
              KI-Assistent öffnen
            </Button>
          </div>

          {/* KI-Generation History */}
          {aiGenerationHistory.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <SparklesIcon className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    KI-Assistent verwendet ({aiGenerationHistory.length}x)
                  </span>
                </div>
                <button
                  onClick={handleOpenModal}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Erneut verwenden
                </button>
              </div>
              {lastGeneration?.metadata && (
                <div className="mt-2 text-xs text-blue-700">
                  Letzte Generierung: {lastGeneration.metadata.timestamp ? 
                    new Date(lastGeneration.metadata.timestamp).toLocaleString('de-DE') : 
                    'Gerade eben'
                  }
                  {lastGeneration.metadata.context?.industry && 
                    ` • ${lastGeneration.metadata.context.industry}`
                  }
                  {lastGeneration.metadata.context?.tone && 
                    ` • ${lastGeneration.metadata.context.tone}`
                  }
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 space-y-4">
            <Field>
              <Label>Titel / Betreffzeile</Label>
              <Input 
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Innovative Partnerschaft revolutioniert die Branche..."
              />
              {lastGeneration?.structured && campaignTitle === lastGeneration.structured.headline && (
                <div className="mt-1 text-xs text-green-600 flex items-center">
                  <SparklesIcon className="w-3 h-3 mr-1" />
                  Von KI generierte Headline
                </div>
              )}
            </Field>
            
            <Field>
              <Label>Inhalt</Label>
              <RichTextEditor 
                content={pressReleaseContent}
                onChange={setPressReleaseContent}
              />
              {lastGeneration && pressReleaseContent === lastGeneration.content && (
                <div className="mt-1 text-xs text-green-600 flex items-center">
                  <SparklesIcon className="w-3 h-3 mr-1" />
                  Von KI generierte strukturierte Pressemitteilung
                </div>
              )}
            </Field>
          </div>
        </div>
        
        {/* Schritt 3: Versand planen (Placeholder) */}
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

      {/* Neues strukturiertes KI-Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={handleCloseModal}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
        />
      )}
    </div>
  );
}