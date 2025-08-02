// src/components/setup/MediaSetupWizard.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { listsService } from "@/lib/firebase/lists-service";
import { STANDARD_PRESS_TAGS, STANDARD_BEATS } from "@/types/crm";
// Wichtig: Importiere sowohl die Konstante als auch den Typ
import { LIST_TEMPLATES, ListTemplate } from "@/types/lists";
import { CheckCircleIcon, NewspaperIcon, UsersIcon, TagIcon, QueueListIcon } from "@heroicons/react/20/solid";

interface MediaSetupWizardProps {
  onClose: () => void;
  onComplete: () => void;
  userId: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

export default function MediaSetupWizard({ onClose, onComplete, userId }: MediaSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    STANDARD_PRESS_TAGS.slice(0, 4).map(tag => tag.name) // Erste 4 Tags vorausgewählt
  );
  const [selectedBeats, setSelectedBeats] = useState<string[]>(
    ['Technologie', 'Wirtschaft', 'Startups'] // Standard-Beats vorausgewählt
  );
  const [selectedLists, setSelectedLists] = useState<string[]>(
    ['Tech-Presse', 'Wirtschaftsjournalisten'] // Standard-Listen vorausgewählt
  );
  const [createSampleCompany, setCreateSampleCompany] = useState(true);
  const [createSampleContact, setCreateSampleContact] = useState(true);

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: SetupStep[] = [
    {
      id: 'overview',
      title: 'Willkommen zum Presse-Setup',
      description: 'Richte dein CRM für Pressearbeit ein',
      completed: false
    },
    {
      id: 'tags',
      title: 'Presse-Tags erstellen',
      description: 'Erstelle Tags zur Kategorisierung von Pressekontakten',
      completed: false
    },
    {
      id: 'sample-data',
      title: 'Beispiel-Daten erstellen',
      description: 'Erstelle Beispiel-Verlag und -Journalist zum Testen',
      completed: false,
      optional: true
    },
    {
      id: 'lists',
      title: 'Presse-Listen erstellen',
      description: 'Erstelle intelligente Verteilerlisten für deine PR-Kampagnen',
      completed: false
    },
    {
      id: 'complete',
      title: 'Setup abgeschlossen',
      description: 'Dein Presse-Setup ist bereit!',
      completed: false
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const executeSetup = async () => {
    setLoading(true);
    
    try {
      const createdTagIds = new Map<string, string>();
      
      // Schritt 1: Tags erstellen
      for (const tagData of STANDARD_PRESS_TAGS) {
        if (selectedTags.includes(tagData.name)) {
          const tagId = await tagsService.create({
            ...tagData,
            userId
          });
          createdTagIds.set(tagData.name, tagId);
        }
      }
      
      setCompletedSteps(prev => new Set(Array.from(prev).concat(['tags'])));

      // Schritt 2: Beispiel-Daten erstellen (optional)
      let sampleCompanyId: string | undefined;
      let sampleContactId: string | undefined;

      if (createSampleCompany) {
        sampleCompanyId = await companiesService.create({
          name: "Beispiel Verlag GmbH",
          type: "publisher",
          industry: "Medien",
          website: "https://beispiel-verlag.de",
          address: {
            street: "Pressestraße 123",
            city: "Berlin",
            zip: "10115",
            country: "Deutschland"
          },
          mediaInfo: {
            mediaType: "mixed",
            circulation: 50000,
            reach: 200000,
            focusAreas: ["Technologie", "Wirtschaft", "Startups"],
            publicationFrequency: "daily"
          },
          tagIds: [createdTagIds.get('Presse')].filter(Boolean) as string[],
          userId
        });

        if (createSampleContact && sampleCompanyId) {
          sampleContactId = await contactsService.create({
            firstName: "Max",
            lastName: "Mustermann",
            email: "m.mustermann@beispiel-verlag.de",
            phone: "+49 30 12345678",
            position: "Tech-Redakteur",
            companyId: sampleCompanyId,
            mediaInfo: {
              beat: "Technologie",
              expertise: ["KI", "Startups", "Fintech"],
              preferredContactTime: "09:00-12:00 Uhr",
              socialHandles: {
                twitter: "@maxtech",
                linkedin: "max-mustermann-tech"
              }
            },
            tagIds: [
              createdTagIds.get('Presse'),
              createdTagIds.get('Journalist')
            ].filter(Boolean) as string[],
            userId
          });
        }
      }

      setCompletedSteps(prev => new Set(Array.from(prev).concat(['sample-data'])));

      // Schritt 3: Listen erstellen
      for (const listTemplate of LIST_TEMPLATES) {
        if (selectedLists.includes(listTemplate.name)) {
          // Filter mit echten Tag-IDs befüllen
          const filters = { ...listTemplate.filters };
          if (filters.tagIds) {
            // KORREKTUR: Typ für 'tagName' hinzugefügt
            filters.tagIds = filters.tagIds.map((tagName: string) => {
              // Wenn es schon eine ID ist, beibehalten, sonst auflösen
              return createdTagIds.get(tagName) || tagName;
            }).filter(Boolean);
          }

          await listsService.create({
            name: listTemplate.name,
            description: listTemplate.description,
            type: 'dynamic',
            category: listTemplate.category,
            color: listTemplate.color,
            filters,
            userId
          });
        }
      }

      setCompletedSteps(prev => new Set(Array.from(prev).concat(['lists'])));

      // Setup abgeschlossen
      setCompletedSteps(prev => new Set(Array.from(prev).concat(['complete'])));
      setCurrentStep(steps.length - 1);

    } catch (error) {
      console.error("Fehler beim Setup:", error);
      alert("Fehler beim Setup. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'overview':
        return (
          <div className="text-center py-8">
            <NewspaperIcon className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Presse-Setup für SKAMP</h3>
            <p className="text-gray-600 mb-6">
              Dieser Assistent hilft dir dabei, dein CRM für professionelle Pressearbeit einzurichten.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="border rounded-lg p-4">
                <TagIcon className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-medium">Presse-Tags</h4>
                <p className="text-sm text-gray-600">Kategorisiere Journalisten und Medien</p>
              </div>
              <div className="border rounded-lg p-4">
                <UsersIcon className="h-8 w-8 text-purple-600 mb-2" />
                <h4 className="font-medium">Beispiel-Daten</h4>
                <p className="text-sm text-gray-600">Verlag und Journalist zum Testen</p>
              </div>
              <div className="border rounded-lg p-4 md:col-span-2">
                <QueueListIcon className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-medium">Intelligente Listen</h4>
                <p className="text-sm text-gray-600">Automatische Verteiler für PR-Kampagnen</p>
              </div>
            </div>
          </div>
        );

      case 'tags':
        return (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Welche Presse-Tags möchtest du erstellen?</h3>
            <p className="text-gray-600 mb-6">
              Tags helfen dir dabei, Journalisten und Medien zu kategorisieren. Du kannst später weitere hinzufügen.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STANDARD_PRESS_TAGS.map(tag => (
                <label key={tag.name} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={selectedTags.includes(tag.name)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedTags([...selectedTags, tag.name]);
                      } else {
                        // KORREKTUR: Typ für 't' hinzugefügt
                        setSelectedTags(selectedTags.filter((t: string) => t !== tag.name));
                      }
                    }}
                  />
                  <Badge color={tag.color as any} className="text-xs">
                    {tag.name}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        );

      case 'sample-data':
        return (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Beispiel-Daten erstellen?</h3>
            <p className="text-gray-600 mb-6">
              Wir können Beispiel-Daten erstellen, damit du das System sofort testen kannst.
            </p>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={createSampleCompany}
                  onChange={setCreateSampleCompany}
                />
                <div>
                  <div className="font-medium">Beispiel-Verlag erstellen</div>
                  <div className="text-sm text-gray-600">&ldquo;Beispiel Verlag GmbH&rdquo; mit Medien-Informationen</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={createSampleContact}
                  onChange={setCreateSampleContact}
                />
                <div>
                  <div className="font-medium">Beispiel-Journalist erstellen</div>
                  <div className="text-sm text-gray-600">&ldquo;Max Mustermann&rdquo; als Tech-Redakteur</div>
                </div>
              </label>
            </div>
          </div>
        );

      case 'lists':
        return (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Welche Presse-Listen sollen erstellt werden?</h3>
            <p className="text-gray-600 mb-6">
              Diese Listen werden automatisch mit passenden Kontakten befüllt, basierend auf deren Tags und Eigenschaften.
            </p>
            <div className="space-y-3">
              {/* KORREKTUR: Typ für 't' und 'template' hinzugefügt */}
              {LIST_TEMPLATES.filter((t: ListTemplate) => t.category === 'press').map((template: ListTemplate) => (
                <label key={template.name} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={selectedLists.includes(template.name)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedLists([...selectedLists, template.name]);
                      } else {
                        // KORREKTUR: Typ für 'l' hinzugefügt
                        setSelectedLists(selectedLists.filter((l: string) => l !== template.name));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{template.name}</div>
                      <Badge color={template.color as any} className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">{template.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Setup erfolgreich abgeschlossen!</h3>
            <p className="text-gray-600 mb-6">
              Dein CRM ist jetzt für professionelle Pressearbeit konfiguriert.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-green-800 mb-2">Was wurde erstellt:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ {selectedTags.length} Presse-Tags</li>
                {createSampleCompany && <li>✓ Beispiel-Verlag</li>}
                {createSampleContact && <li>✓ Beispiel-Journalist</li>}
                <li>✓ {selectedLists.length} intelligente Listen</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Du findest alle erstellten Elemente in den entsprechenden Bereichen deines CRM.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4">
        Presse-Setup - Schritt {currentStep + 1} von {steps.length}
      </DialogTitle>

      <DialogBody className="px-6 pb-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Fortschritt</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
      </DialogBody>

      <DialogActions className="px-6 py-4 flex justify-between">
        <Button 
          plain 
          onClick={currentStep === 0 ? onClose : handlePrev}
          disabled={loading}
        >
          {currentStep === 0 ? 'Abbrechen' : 'Zurück'}
        </Button>
        
        <div className="flex gap-2">
          {currentStep === steps.length - 1 ? (
            <Button color="indigo" onClick={onComplete}>
              Setup abschließen
            </Button>
          ) : currentStep === steps.length - 2 ? (
            <Button 
              color="indigo" 
              onClick={executeSetup}
              disabled={loading}
            >
              {loading ? 'Erstelle...' : 'Setup ausführen'}
            </Button>
          ) : (
            <Button color="indigo" onClick={handleNext}>
              Weiter
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}