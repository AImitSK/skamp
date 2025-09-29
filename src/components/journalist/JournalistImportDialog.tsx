// src/components/journalist/JournalistImportDialog.tsx
"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BuildingOfficeIcon,
  UserIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { JournalistDatabaseEntry } from "@/types/journalist-database";
import { MultiEntityImportConfig, CompanyImportStrategy, PublicationImportStrategy } from "@/types/journalist-database";
import { journalistDatabaseService } from "@/lib/firebase/journalist-database-service";

type ImportStep = 'preview' | 'relations' | 'confirm';

interface JournalistImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  journalist: JournalistDatabaseEntry | null;
  organizationId: string;
  onSuccess: () => void;
}

interface ConflictCheck {
  hasCompanyConflict: boolean;
  hasPublicationConflicts: string[];
  companyMatches: any[];
  publicationMatches: any[];
}

export function JournalistImportDialog({
  isOpen,
  onClose,
  journalist,
  organizationId,
  onSuccess
}: JournalistImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('preview');
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictCheck | null>(null);

  // Import Configuration
  const [companyStrategy, setCompanyStrategy] = useState<CompanyImportStrategy>('create_new');
  const [publicationStrategy, setPublicationStrategy] = useState<PublicationImportStrategy>('import_all');
  const [selectedPublicationIds, setSelectedPublicationIds] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const handleClose = useCallback(() => {
    setCurrentStep('preview');
    setCompanyStrategy('create_new');
    setPublicationStrategy('import_all');
    setSelectedPublicationIds([]);
    setSelectedCompanyId('');
    setConflicts(null);
    onClose();
  }, [onClose]);

  // Step Navigation
  const handleNext = async () => {
    if (currentStep === 'preview') {
      // Führe Conflict-Check durch
      setLoading(true);
      try {
        // TODO: Implementiere Conflict-Check
        const conflictCheck: ConflictCheck = {
          hasCompanyConflict: false,
          hasPublicationConflicts: [],
          companyMatches: [],
          publicationMatches: []
        };
        setConflicts(conflictCheck);
        setCurrentStep('relations');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'relations') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'relations') {
      setCurrentStep('preview');
    } else if (currentStep === 'confirm') {
      setCurrentStep('relations');
    }
  };

  const handleImport = async () => {
    if (!journalist) return;

    setLoading(true);
    try {
      const config: MultiEntityImportConfig = {
        companyStrategy,
        publicationStrategy,
        selectedPublicationIds: publicationStrategy === 'import_selected' ? selectedPublicationIds : undefined,
        selectedCompanyId: companyStrategy === 'use_existing' ? selectedCompanyId : undefined,
        fieldMapping: {} // TODO: Implement field mapping
      };

      const result = await journalistDatabaseService.importWithRelations(
        journalist.id!,
        organizationId,
        config
      );

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        alert(`Import fehlgeschlagen: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      alert('Import fehlgeschlagen: Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  if (!journalist) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="max-w-4xl">
      <DialogTitle>
        Journalist zu CRM hinzufügen
      </DialogTitle>

      <DialogBody>
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            {(['preview', 'relations', 'confirm'] as ImportStep[]).map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = ['preview', 'relations', 'confirm'].indexOf(currentStep) > index;

              return (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckIcon className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Vorschau</span>
            <span>Relations</span>
            <span>Bestätigen</span>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'preview' && (
          <PreviewStep journalist={journalist} />
        )}

        {currentStep === 'relations' && (
          <RelationsStep
            journalist={journalist}
            conflicts={conflicts}
            companyStrategy={companyStrategy}
            setCompanyStrategy={setCompanyStrategy}
            publicationStrategy={publicationStrategy}
            setPublicationStrategy={setPublicationStrategy}
            selectedPublicationIds={selectedPublicationIds}
            setSelectedPublicationIds={setSelectedPublicationIds}
          />
        )}

        {currentStep === 'confirm' && (
          <ConfirmStep
            journalist={journalist}
            companyStrategy={companyStrategy}
            publicationStrategy={publicationStrategy}
            selectedPublicationIds={selectedPublicationIds}
          />
        )}
      </DialogBody>

      <DialogActions>
        <Button
          variant="ghost"
          onClick={currentStep === 'preview' ? handleClose : handleBack}
        >
          {currentStep === 'preview' ? 'Abbrechen' : 'Zurück'}
        </Button>

        {currentStep === 'confirm' ? (
          <Button
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? 'Importiere...' : 'Import starten'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Prüfe...' : 'Weiter'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Preview Step Component
function PreviewStep({ journalist }: { journalist: JournalistDatabaseEntry }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heading level={3}>Import-Vorschau</Heading>
        <Text className="text-gray-600 mt-1">
          Diese Daten werden in Ihr CRM importiert
        </Text>
      </div>

      {/* Contact Preview */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center mb-3">
          <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
          <Text className="font-medium">Kontakt</Text>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text className="font-medium">{journalist.personalData.name.first} {journalist.personalData.name.last}</Text>
            <Text className="text-gray-600">{journalist.personalData.contact.email}</Text>
            {journalist.personalData.contact.phone && (
              <Text className="text-gray-600">{journalist.personalData.contact.phone}</Text>
            )}
          </div>
          <div>
            <Text className="font-medium">Position</Text>
            <Text className="text-gray-600">
              {journalist.professionalData.employment.position || 'Nicht angegeben'}
            </Text>
          </div>
        </div>
      </div>

      {/* Company Preview */}
      {journalist.professionalData.employment.company && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <BuildingOfficeIcon className="w-5 h-5 text-green-600 mr-2" />
            <Text className="font-medium">Unternehmen</Text>
          </div>
          <div className="text-sm">
            <Text className="font-medium">{journalist.professionalData.employment.company.name}</Text>
            <Text className="text-gray-600">{journalist.professionalData.employment.company.type}</Text>
            {journalist.professionalData.employment.company.website && (
              <Text className="text-gray-600">{journalist.professionalData.employment.company.website}</Text>
            )}
          </div>
        </div>
      )}

      {/* Publications Preview */}
      {journalist.professionalData.publicationAssignments?.length > 0 && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <DocumentTextIcon className="w-5 h-5 text-purple-600 mr-2" />
            <Text className="font-medium">
              Publikationen ({journalist.professionalData.publicationAssignments.length})
            </Text>
          </div>
          <div className="space-y-2">
            {journalist.professionalData.publicationAssignments.slice(0, 3).map((assignment, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div>
                  <Text className="font-medium">{assignment.publication.title}</Text>
                  <Text className="text-gray-600">{assignment.publication.type}</Text>
                </div>
                <Badge variant="outline">{assignment.role}</Badge>
              </div>
            ))}
            {journalist.professionalData.publicationAssignments.length > 3 && (
              <Text className="text-sm text-gray-500">
                +{journalist.professionalData.publicationAssignments.length - 3} weitere
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Relations Step Component
function RelationsStep({
  journalist,
  conflicts,
  companyStrategy,
  setCompanyStrategy,
  publicationStrategy,
  setPublicationStrategy,
  selectedPublicationIds,
  setSelectedPublicationIds
}: {
  journalist: JournalistDatabaseEntry;
  conflicts: ConflictCheck | null;
  companyStrategy: CompanyImportStrategy;
  setCompanyStrategy: (strategy: CompanyImportStrategy) => void;
  publicationStrategy: PublicationImportStrategy;
  setPublicationStrategy: (strategy: PublicationImportStrategy) => void;
  selectedPublicationIds: string[];
  setSelectedPublicationIds: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heading level={3}>Import-Strategie</Heading>
        <Text className="text-gray-600 mt-1">
          Wählen Sie, wie mit Relations verfahren werden soll
        </Text>
      </div>

      {/* Company Strategy */}
      <div className="border rounded-lg p-4">
        <Text className="font-medium mb-3">Unternehmen-Strategie</Text>
        {conflicts?.hasCompanyConflict && (
          <div className="mb-3 p-3 bg-yellow-50 rounded-md flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
            <Text className="text-yellow-800 text-sm">
              Ähnliche Unternehmen bereits vorhanden
            </Text>
          </div>
        )}

        <RadioGroup value={companyStrategy} onChange={setCompanyStrategy}>
          <Radio value="create_new">
            Neue Firma anlegen: {journalist.professionalData.employment.company?.name}
          </Radio>
          <Radio value="use_existing">
            Mit bestehender Firma verknüpfen
          </Radio>
          <Radio value="merge">
            Firmendaten zusammenführen
          </Radio>
        </RadioGroup>
      </div>

      {/* Publication Strategy */}
      <div className="border rounded-lg p-4">
        <Text className="font-medium mb-3">Publikations-Strategie</Text>

        <RadioGroup value={publicationStrategy} onChange={setPublicationStrategy}>
          <Radio value="import_all">
            Alle {journalist.professionalData.publicationAssignments?.length || 0} Publikationen importieren
          </Radio>
          <Radio value="import_selected">
            Ausgewählte Publikationen importieren
          </Radio>
          <Radio value="skip">
            Publikationen überspringen
          </Radio>
        </RadioGroup>

        {/* Selected Publications */}
        {publicationStrategy === 'import_selected' && (
          <div className="mt-4 space-y-2">
            {journalist.professionalData.publicationAssignments?.map((assignment, index) => (
              <label key={index} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedPublicationIds.includes(assignment.publication.globalPublicationId || '')}
                  onChange={(checked) => {
                    const id = assignment.publication.globalPublicationId || '';
                    if (checked) {
                      setSelectedPublicationIds([...selectedPublicationIds, id]);
                    } else {
                      setSelectedPublicationIds(selectedPublicationIds.filter(pid => pid !== id));
                    }
                  }}
                />
                <Text className="text-sm">{assignment.publication.title}</Text>
                <Badge variant="outline" className="text-xs">{assignment.role}</Badge>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirm Step Component
function ConfirmStep({
  journalist,
  companyStrategy,
  publicationStrategy,
  selectedPublicationIds
}: {
  journalist: JournalistDatabaseEntry;
  companyStrategy: CompanyImportStrategy;
  publicationStrategy: PublicationImportStrategy;
  selectedPublicationIds: string[];
}) {
  const getCompanyStrategyLabel = (strategy: CompanyImportStrategy) => {
    switch (strategy) {
      case 'create_new': return 'Neue Firma anlegen';
      case 'use_existing': return 'Mit bestehender verknüpfen';
      case 'merge': return 'Zusammenführen';
    }
  };

  const getPublicationStrategyLabel = (strategy: PublicationImportStrategy) => {
    switch (strategy) {
      case 'import_all': return 'Alle importieren';
      case 'import_selected': return `${selectedPublicationIds.length} ausgewählte importieren`;
      case 'skip': return 'Überspringen';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heading level={3}>Import bestätigen</Heading>
        <Text className="text-gray-600 mt-1">
          Überprüfen Sie die Import-Konfiguration
        </Text>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Text className="font-medium">Kontakt</Text>
          <Text className="text-green-600">✓ {journalist.personalData.name.first} {journalist.personalData.name.last}</Text>
        </div>

        <div className="flex items-center justify-between">
          <Text className="font-medium">Unternehmen</Text>
          <Text className="text-green-600">✓ {getCompanyStrategyLabel(companyStrategy)}</Text>
        </div>

        <div className="flex items-center justify-between">
          <Text className="font-medium">Publikationen</Text>
          <Text className="text-green-600">✓ {getPublicationStrategyLabel(publicationStrategy)}</Text>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 flex items-start">
        <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
        <div>
          <Text className="text-blue-800 font-medium">Import-Hinweis</Text>
          <Text className="text-blue-700 text-sm mt-1">
            Der Import erfolgt atomisch. Bei Fehlern werden keine Änderungen vorgenommen.
          </Text>
        </div>
      </div>
    </div>
  );
}