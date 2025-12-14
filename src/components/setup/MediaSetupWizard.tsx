// src/components/setup/MediaSetupWizard.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  organizationId: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

export default function MediaSetupWizard({ onClose, onComplete, userId, organizationId }: MediaSetupWizardProps) {
  const t = useTranslations('setup.mediaWizard');
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
      title: t('steps.overview.title'),
      description: t('steps.overview.description'),
      completed: false
    },
    {
      id: 'tags',
      title: t('steps.tags.title'),
      description: t('steps.tags.description'),
      completed: false
    },
    {
      id: 'sample-data',
      title: t('steps.sampleData.title'),
      description: t('steps.sampleData.description'),
      completed: false,
      optional: true
    },
    {
      id: 'lists',
      title: t('steps.lists.title'),
      description: t('steps.lists.description'),
      completed: false
    },
    {
      id: 'complete',
      title: t('steps.complete.title'),
      description: t('steps.complete.description'),
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
            <h3 className="text-lg font-semibold mb-2">{t('overview.heading')}</h3>
            <p className="text-gray-600 mb-6">
              {t('overview.intro')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="border rounded-lg p-4">
                <TagIcon className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-medium">{t('overview.features.tags.title')}</h4>
                <p className="text-sm text-gray-600">{t('overview.features.tags.description')}</p>
              </div>
              <div className="border rounded-lg p-4">
                <UsersIcon className="h-8 w-8 text-purple-600 mb-2" />
                <h4 className="font-medium">{t('overview.features.sampleData.title')}</h4>
                <p className="text-sm text-gray-600">{t('overview.features.sampleData.description')}</p>
              </div>
              <div className="border rounded-lg p-4 md:col-span-2">
                <QueueListIcon className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-medium">{t('overview.features.lists.title')}</h4>
                <p className="text-sm text-gray-600">{t('overview.features.lists.description')}</p>
              </div>
            </div>
          </div>
        );

      case 'tags':
        return (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">{t('tagsStep.heading')}</h3>
            <p className="text-gray-600 mb-6">
              {t('tagsStep.description')}
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
            <h3 className="text-lg font-semibold mb-4">{t('sampleDataStep.heading')}</h3>
            <p className="text-gray-600 mb-6">
              {t('sampleDataStep.description')}
            </p>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={createSampleCompany}
                  onChange={setCreateSampleCompany}
                />
                <div>
                  <div className="font-medium">{t('sampleDataStep.options.company.title')}</div>
                  <div className="text-sm text-gray-600">{t('sampleDataStep.options.company.description')}</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={createSampleContact}
                  onChange={setCreateSampleContact}
                />
                <div>
                  <div className="font-medium">{t('sampleDataStep.options.contact.title')}</div>
                  <div className="text-sm text-gray-600">{t('sampleDataStep.options.contact.description')}</div>
                </div>
              </label>
            </div>
          </div>
        );

      case 'lists':
        return (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">{t('listsStep.heading')}</h3>
            <p className="text-gray-600 mb-6">
              {t('listsStep.description')}
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
            <h3 className="text-lg font-semibold mb-2">{t('completeStep.heading')}</h3>
            <p className="text-gray-600 mb-6">
              {t('completeStep.success')}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-green-800 mb-2">{t('completeStep.summary.title')}</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ {t('completeStep.summary.tags', { count: selectedTags.length })}</li>
                {createSampleCompany && <li>✓ {t('completeStep.summary.samplePublisher')}</li>}
                {createSampleContact && <li>✓ {t('completeStep.summary.sampleJournalist')}</li>}
                <li>✓ {t('completeStep.summary.lists', { count: selectedLists.length })}</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              {t('completeStep.location')}
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
        {t('dialogTitle', { current: currentStep + 1, total: steps.length })}
      </DialogTitle>

      <DialogBody className="px-6 pb-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>{t('progress')}</span>
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
          {currentStep === 0 ? t('actions.cancel') : t('actions.back')}
        </Button>

        <div className="flex gap-2">
          {currentStep === steps.length - 1 ? (
            <Button color="indigo" onClick={onComplete}>
              {t('actions.finish')}
            </Button>
          ) : currentStep === steps.length - 2 ? (
            <Button
              color="indigo"
              onClick={executeSetup}
              disabled={loading}
            >
              {loading ? t('actions.creating') : t('actions.execute')}
            </Button>
          ) : (
            <Button color="indigo" onClick={handleNext}>
              {t('actions.next')}
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}