// src/app/dashboard/pr/campaigns/new/page.tsx - Customer-First Version
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign } from '@/types/pr';
import { GenerationResult } from '@/types/ai';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import Link from 'next/link';

// Import Customer Selector
import { CustomerSelector } from '@/components/pr/CustomerSelector';

// Dynamic import für das neue Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Form State - Customer First!
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
  
  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedCustomerId) {
      errors.customer = 'Bitte wählen Sie einen Kunden aus';
    }
    if (!selectedListId) {
      errors.list = 'Bitte wählen Sie einen Verteiler aus';
    }
    if (!campaignTitle.trim()) {
      errors.title = 'Bitte geben Sie einen Titel ein';
    }
    if (!pressReleaseContent.trim() || pressReleaseContent === '<p></p>') {
      errors.content = 'Bitte verfassen Sie eine Pressemitteilung';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm() || !user || !selectedList) return;

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
        // NEU: Customer Data
        clientId: selectedCustomerId,
        clientName: selectedCustomerName,
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

  // KI-Content Handler
  const handleAiGenerate = (result: GenerationResult) => {
    console.log('🤖 AI Generation Result:', result);

    if (result.headline && result.structured?.headline) {
      setCampaignTitle(result.headline);
    } else if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }

    setPressReleaseContent(result.content);

    setLastGeneration(result);
    setAiGenerationHistory(prev => [...prev, result]);
    setShowAiModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // Progress Steps
  const steps = [
    { 
      id: 'customer', 
      name: 'Kunde', 
      icon: BuildingOfficeIcon,
      completed: !!selectedCustomerId 
    },
    { 
      id: 'list', 
      name: 'Verteiler', 
      icon: UsersIcon,
      completed: !!selectedListId 
    },
    { 
      id: 'content', 
      name: 'Inhalt', 
      icon: DocumentTextIcon,
      completed: !!campaignTitle && !!pressReleaseContent 
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <Heading>Neue PR-Kampagne erstellen</Heading>
        <Text className="mt-1">Erstellen Sie eine neue Pressemitteilung für Ihre Kunden.</Text>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center ${
                  step.completed ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  <div className={`rounded-full p-2 ${
                    step.completed ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    {step.completed ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="ml-2 font-medium text-sm">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-16 ${
                    step.completed ? 'bg-indigo-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
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
        {/* Schritt 1: Kunde auswählen (NEU - ERSTE POSITION) */}
        <div>
          <h3 className="text-base font-semibold mb-4 flex items-center">
            <span className="bg-indigo-100 text-indigo-700 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3">
              1
            </span>
            Für welchen Kunden ist diese Kampagne?
          </h3>
          
          <CustomerSelector
            value={selectedCustomerId}
            onChange={(customerId, customerName) => {
              setSelectedCustomerId(customerId);
              setSelectedCustomerName(customerName);
              setValidationErrors({ ...validationErrors, customer: '' });
            }}
            required={true}
            description="Die Kampagne wird diesem Kunden zugeordnet. Alle Medien werden automatisch für diesen Kunden gefiltert."
            error={validationErrors.customer}
            showStats={true}
            showQuickAdd={true}
          />

          {/* Customer Quick Actions */}
          {selectedCustomerId && (
            <div className="mt-4 flex gap-2">
              <Link href={`/dashboard/mediathek?uploadFor=${selectedCustomerId}`}>
                <Button plain className="text-sm">
                  📎 Medien hochladen
                </Button>
              </Link>
              <Link href={`/dashboard/crm/${selectedCustomerId}`}>
                <Button plain className="text-sm">
                  👤 Kunde anzeigen
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Schritt 2: Verteiler auswählen (NUR WENN KUNDE AUSGEWÄHLT) */}
        <div className={!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''}>
          <h3 className="text-base font-semibold mb-4 flex items-center">
            <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 ${
              selectedCustomerId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </span>
            An wen soll die Kampagne gesendet werden?
          </h3>
          
          <Field>
            <Label>Verteiler auswählen *</Label>
            <Text className="mb-2 text-sm">Wählen Sie die Empfänger für Ihre Pressemitteilung.</Text>
            {loading ? (
              <div className="h-10 w-full bg-zinc-100 rounded-md animate-pulse" />
            ) : (
              <Select 
                value={selectedListId} 
                onChange={(e) => {
                  setSelectedListId(e.target.value);
                  setValidationErrors({ ...validationErrors, list: '' });
                }}
              >
                <option value="">Verteiler wählen...</option>
                {availableLists.map(list => (
                  <option key={list.id} value={list.id!}>
                    {list.name} ({list.contactCount} Kontakte)
                  </option>
                ))}
              </Select>
            )}
            {validationErrors.list && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.list}</p>
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
        </div>

        {/* Schritt 3: Pressemitteilung (NUR WENN KUNDE & LISTE AUSGEWÄHLT) */}
        <div className={!selectedCustomerId || !selectedListId ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-t pt-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
              <div>
                <h3 className="text-base font-semibold flex items-center">
                  <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 ${
                    selectedCustomerId && selectedListId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    3
                  </span>
                  Pressemitteilung verfassen
                </h3>
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
                onClick={() => setShowAiModal(true)}
                disabled={!selectedCustomerId || !selectedListId}
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
                    onClick={() => setShowAiModal(true)}
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
                <Label>Titel / Betreffzeile *</Label>
                <Input 
                  value={campaignTitle}
                  onChange={(e) => {
                    setCampaignTitle(e.target.value);
                    setValidationErrors({ ...validationErrors, title: '' });
                  }}
                  placeholder="Innovative Partnerschaft revolutioniert die Branche..."
                  className={validationErrors.title ? 'border-red-300' : ''}
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
                {lastGeneration?.structured && campaignTitle === lastGeneration.structured.headline && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Von KI generierte Headline
                  </div>
                )}
              </Field>
              
              <Field>
                <Label>Inhalt *</Label>
                <RichTextEditor 
                  content={pressReleaseContent}
                  onChange={(content) => {
                    setPressReleaseContent(content);
                    setValidationErrors({ ...validationErrors, content: '' });
                  }}
                />
                {validationErrors.content && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
                )}
                {lastGeneration && pressReleaseContent === lastGeneration.content && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Von KI generierte strukturierte Pressemitteilung
                  </div>
                )}
              </Field>
            </div>
          </div>
        </div>
        
        {/* Schritt 4: Versand planen (Placeholder) */}
        <div className={!selectedCustomerId || !selectedListId || !campaignTitle || !pressReleaseContent ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-t pt-8">
            <h3 className="text-base font-semibold text-zinc-400">Schritt 4: Versand planen (zukünftiges Feature)</h3>
            <Text className="text-zinc-400">Hier wirst du den Versandzeitpunkt festlegen.</Text>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end gap-4">
        <Link href="/dashboard/pr">
          <Button plain>Abbrechen</Button>
        </Link>
        <Button 
          color="indigo" 
          disabled={!validateForm() || isSaving}
          onClick={handleSaveDraft}
        >
          {isSaving ? 'Speichern...' : 'Als Entwurf speichern'}
        </Button>
      </div>

      {/* Neues strukturiertes KI-Modal mit Customer Context */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
          // TODO: Pass customer context to AI
          // customerContext={{
          //   companyName: selectedCustomerName,
          //   companyId: selectedCustomerId
          // }}
        />
      )}
    </div>
  );
}