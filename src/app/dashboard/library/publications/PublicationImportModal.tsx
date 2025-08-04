// src/app/dashboard/library/publications/PublicationImportModal.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label, FieldGroup, Description } from '@/components/ui/fieldset';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { publicationService } from '@/lib/firebase/library-service';
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { Publication, PublicationType, PUBLICATION_TYPE_LABELS } from '@/types/library';
import type { CompanyEnhanced } from "@/types/crm-enhanced";
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  InformationCircleIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${
            type === 'error' ? 'text-red-400' : 
            type === 'success' ? 'text-green-400' : 
            type === 'warning' ? 'text-yellow-400' :
            'text-blue-400'
          }`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

interface PublicationImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

// Mapping-Definitionen für automatische Erkennung
const FIELD_MAPPINGS = {
  title: ['titel', 'title', 'name', 'publikation', 'publication', 'medium', 'medienname'],
  subtitle: ['untertitel', 'subtitle', 'claim', 'slogan'],
  publisherName: ['verlag', 'publisher', 'herausgeber', 'medienhaus', 'company'],
  type: ['typ', 'type', 'art', 'kategorie', 'category'],
  format: ['format', 'kanal', 'channel'],
  websiteUrl: ['website', 'url', 'webseite', 'homepage', 'link'],
  languages: ['sprache', 'sprachen', 'language', 'languages'],
  countries: ['land', 'länder', 'country', 'countries', 'markt', 'märkte'],
  circulation: ['auflage', 'circulation', 'reichweite', 'print auflage'],
  uniqueVisitors: ['unique visitors', 'besucher', 'monthly visitors', 'online reichweite'],
  focusAreas: ['themen', 'topics', 'schwerpunkte', 'focus', 'ressorts', 'bereiche'],
  frequency: ['frequenz', 'frequency', 'erscheinung', 'rhythm', 'periodizität'],
  targetAudience: ['zielgruppe', 'target', 'audience', 'leserschaft'],
  industry: ['branche', 'industry', 'sektor', 'sector']
};

// Template für CSV-Download
const CSV_TEMPLATE = `Titel,Verlag,Typ,Format,Website,Sprachen,Länder,Auflage,Online Besucher,Themenschwerpunkte,Frequenz,Zielgruppe
Beispiel Magazin,Beispiel Verlag GmbH,magazine,print,https://example.com,"de,en","DE,AT,CH",50000,,"Wirtschaft,Politik",monthly,Führungskräfte
Online Portal,Digital Media AG,website,online,https://portal.com,de,DE,,250000,"Technologie,Innovation",continuous,IT-Professionals`;

type Step = 'upload' | 'mapping' | 'import';

export default function PublicationImportModal({ onClose, onImportSuccess }: PublicationImportModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  
  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>('');
  const [publishers, setPublishers] = useState<CompanyEnhanced[]>([]);
  const [loadingPublishers, setLoadingPublishers] = useState(false);

  
  // Step 2: Mapping
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [autoMappingApplied, setAutoMappingApplied] = useState(false);
  
  // Step 3: Import
  const [isImporting, setIsImporting] = useState(false);
  const [importOptions, setImportOptions] = useState({
    updateExisting: false,
    skipInvalid: true,
    defaultLanguage: 'de',
    defaultCountry: 'DE'
  });
  const [importResults, setImportResults] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  
  const [error, setError] = useState('');

  // Lade Verlage beim Mount
  useEffect(() => {
    loadPublishers();
  }, [user]);

  // Lade Verlage
  const loadPublishers = async () => {
    if (!user) return;
    
    try {
      setLoadingPublishers(true);
      
      const allCompanies = await companiesEnhancedService.getAll(currentOrganization?.id || '');
      
      const publisherCompanies = allCompanies.filter(company => 
        ['publisher', 'media_house', 'partner'].includes(company.type)
      );
      
      // Temporär: Falls keine Publisher gefunden, zeige alle Firmen
      if (publisherCompanies.length === 0 && allCompanies.length > 0) {
        setPublishers(allCompanies);
      } else {
        setPublishers(publisherCompanies);
      }
    } catch (error) {
    } finally {
      setLoadingPublishers(false);
    }
  };

  // Datei-Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setImportResults(null);
    }
  };

  // Template Download
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'publikationen_import_vorlage.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Automatisches Mapping
  const applyAutoMapping = () => {
    const newMappings: Record<string, string> = {};
    
    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim();
      
      // Durchsuche alle Feld-Mappings
      Object.entries(FIELD_MAPPINGS).forEach(([field, variants]) => {
        if (variants.some(variant => headerLower.includes(variant))) {
          newMappings[field] = header;
        }
      });
    });
    
    setFieldMappings(newMappings);
    setAutoMappingApplied(true);
  };

  // Parse Datei für Vorschau
  const parseFileForPreview = async () => {
    if (!file) return;
    
    setError('');
    
    if (file.name.endsWith('.csv')) {
      // CSV Parsing
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5, // Nur erste 5 Zeilen für Vorschau
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setPreviewData(results.data);
            setCurrentStep('mapping');
          }
        },
        error: (err) => {
          setError(`CSV-Parsing-Fehler: ${err.message}`);
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Excel Parsing
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (jsonData.length > 0) {
            const headers = jsonData[0].map(h => String(h || ''));
            setHeaders(headers);
            
            // Konvertiere zu Objekt-Format für Vorschau
            const preview = jsonData.slice(1, 6).map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
            setPreviewData(preview);
            setCurrentStep('mapping');
          }
        } catch (err) {
          setError(`Excel-Parsing-Fehler: ${err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Schritt 1 -> 2
  const handleNextToMapping = () => {
    if (!file || !selectedPublisherId) {
      setError('Bitte wählen Sie eine Datei und einen Verlag aus.');
      return;
    }
    parseFileForPreview();
  };

  // Schritt 2 -> 3
  const handleNextToImport = () => {
    if (!fieldMappings.title) {
      setError('Bitte mappen Sie mindestens das Feld "Titel".');
      return;
    }
    setCurrentStep('import');
  };

  // Import durchführen
  const handleImport = async () => {
    if (!file || !user || !selectedPublisherId) return;
    
    setIsImporting(true);
    setError('');
    
    const parsePromise = new Promise<any[]>((resolve, reject) => {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: reject
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
    
    try {
      const data = await parsePromise;
      const selectedPublisher = publishers.find(p => p.id === selectedPublisherId);
      
      // Konvertiere Daten basierend auf Mapping
      const publications = data.map(row => {
        const pub: Partial<Publication> = {
          publisherId: selectedPublisherId,
          publisherName: selectedPublisher?.name,
          status: 'active',
          organizationId: currentOrganization?.id || ''
        };
        
        // Mappe Felder
        Object.entries(fieldMappings).forEach(([field, sourceColumn]) => {
          const value = row[sourceColumn];
          if (!value) return;
          
          switch (field) {
            case 'title':
              pub.title = String(value).trim();
              break;
            case 'subtitle':
              pub.subtitle = String(value).trim();
              break;
            case 'type':
              // Versuche Typ zu erkennen
              const typeStr = String(value).toLowerCase();
              pub.type = Object.keys(PUBLICATION_TYPE_LABELS).find(key => 
                typeStr.includes(key) || PUBLICATION_TYPE_LABELS[key as PublicationType].toLowerCase().includes(typeStr)
              ) as PublicationType || 'magazine';
              break;
            case 'format':
              const formatStr = String(value).toLowerCase();
              if (formatStr.includes('online') || formatStr.includes('digital')) {
                pub.format = 'online';
              } else if (formatStr.includes('print')) {
                pub.format = 'print';
              } else if (formatStr.includes('both') || formatStr.includes('beides')) {
                pub.format = 'both';
              } else if (formatStr.includes('broadcast') || formatStr.includes('tv') || formatStr.includes('radio')) {
                pub.format = 'broadcast';
              } else {
                pub.format = 'print'; // Default
              }
              break;
            case 'websiteUrl':
              pub.websiteUrl = String(value).trim();
              break;
            case 'languages':
              // Sprachen können komma-getrennt sein
              pub.languages = String(value).split(/[,;]/).map(l => l.trim()).filter(Boolean) as any[];
              break;
            case 'countries':
              // Länder können komma-getrennt sein
              pub.geographicTargets = String(value).split(/[,;]/).map(c => c.trim().toUpperCase()).filter(Boolean) as any[];
              break;
            case 'circulation':
              const circ = parseInt(String(value).replace(/\D/g, ''));
              if (!isNaN(circ)) {
                pub.metrics = {
                  ...pub.metrics,
                  frequency: 'monthly', // Default
                  print: {
                    circulation: circ,
                    circulationType: 'printed'
                  }
                };
              }
              break;
            case 'uniqueVisitors':
              const visitors = parseInt(String(value).replace(/\D/g, ''));
              if (!isNaN(visitors)) {
                pub.metrics = {
                  ...pub.metrics,
                  frequency: pub.metrics?.frequency || 'monthly',
                  online: {
                    monthlyUniqueVisitors: visitors
                  }
                };
              }
              break;
            case 'focusAreas':
              pub.focusAreas = String(value).split(/[,;]/).map(f => f.trim()).filter(Boolean);
              break;
            case 'targetAudience':
              if (pub.metrics) {
                pub.metrics.targetAudience = String(value).trim();
              } else {
                pub.metrics = {
                  frequency: 'monthly',
                  targetAudience: String(value).trim()
                };
              }
              break;
          }
        });
        
        // Setze Defaults
        if (!pub.languages || pub.languages.length === 0) {
          pub.languages = [importOptions.defaultLanguage] as any[];
        }
        if (!pub.geographicTargets || pub.geographicTargets.length === 0) {
          pub.geographicTargets = [importOptions.defaultCountry] as any[];
        }
        if (!pub.focusAreas) {
          pub.focusAreas = [];
        }
        if (!pub.geographicScope) {
          pub.geographicScope = 'national';
        }
        if (!pub.metrics) {
          pub.metrics = { frequency: 'monthly' };
        }
        
        return pub;
      });
      
      // Import durchführen
      const results = await publicationService.import(
        publications,
        { organizationId: currentOrganization?.id || '', userId: user?.uid || '' },
        {
          duplicateCheck: true,
          updateExisting: importOptions.updateExisting,
          defaultPublisherId: selectedPublisherId
        }
      );
      
      setImportResults(results);
      
      if (results.created > 0 || results.updated > 0) {
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError('Fehler beim Import. Bitte überprüfen Sie das Dateiformat.');
    } finally {
      setIsImporting(false);
    }
  };

  // Schritt-Navigation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'upload':
        return file && selectedPublisherId;
      case 'mapping':
        return fieldMappings.title;
      case 'import':
        return true;
      default:
        return false;
    }
  }, [currentStep, file, selectedPublisherId, fieldMappings]);

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4 text-lg font-semibold">
        Publikationen importieren
      </DialogTitle>
      
      <DialogBody className="p-6">
        {/* Fortschritts-Anzeige */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {['upload', 'mapping', 'import'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  ${currentStep === step ? 'bg-primary text-white' : 
                    ['upload', 'mapping', 'import'].indexOf(currentStep) > index ? 
                    'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {['upload', 'mapping', 'import'].indexOf(currentStep) > index ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div className={`
                    h-1 w-24 mx-2
                    ${['upload', 'mapping', 'import'].indexOf(currentStep) > index ? 
                      'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <Text className="text-sm text-gray-600">Datei-Upload</Text>
            <Text className="text-sm text-gray-600">Spalten zuordnen</Text>
            <Text className="text-sm text-gray-600">Import</Text>
          </div>
        </div>

        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Text className="text-sm text-gray-600">
                  Laden Sie eine CSV- oder Excel-Datei mit Ihren Publikationsdaten hoch.
                </Text>
                <Button
                  plain
                  onClick={downloadTemplate}
                  className="text-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Vorlage herunterladen
                </Button>
              </div>
              
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                    <Text className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Klicken Sie hier</span> oder ziehen Sie eine Datei hierher
                    </Text>
                    <Text className="text-xs text-gray-500">CSV oder Excel-Datei (max. 10MB)</Text>
                  </div>
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              
              {file && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <Text className="text-sm text-green-800">
                      Ausgewählte Datei: <span className="font-medium">{file.name}</span>
                    </Text>
                  </div>
                </div>
              )}
            </div>

            <FieldGroup>
              <Field>
                <Label>Verlag auswählen *</Label>
                {loadingPublishers ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ) : publishers.length === 0 ? (
                  <div>
                    <Alert 
                      type="warning" 
                      message="Keine Verlage oder Medienhäuser gefunden. Bitte legen Sie zuerst eine Firma vom Typ 'Verlag', 'Medienhaus' oder 'Partner' im CRM an."
                    />
                    <Button
                      type="button"
                      plain
                      onClick={() => window.location.href = '/dashboard/contacts/crm?tab=companies'}
                      className="mt-2 text-sm"
                    >
                      Zum CRM →
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedPublisherId}
                    onChange={(e) => setSelectedPublisherId(e.target.value)}
                  >
                    <option value="">-- Bitte wählen --</option>
                    {publishers.map(publisher => (
                      <option key={publisher.id} value={publisher.id}>
                        {publisher.name}
                      </option>
                    ))}
                  </Select>
                )}
                <Description>
                  Alle importierten Publikationen werden diesem Verlag zugeordnet.
                </Description>
              </Field>
            </FieldGroup>

            <Alert
              type="info"
              title="Unterstützte Formate"
              message="CSV (komma- oder semikolon-getrennt) und Excel-Dateien (.xlsx, .xls). Die erste Zeile muss die Spaltenüberschriften enthalten."
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {currentStep === 'mapping' && (
          <div className="space-y-6">
            {!autoMappingApplied && (
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">
                  Ordnen Sie die Spalten Ihrer Datei den Publikationsfeldern zu.
                </Text>
                <Button
                  plain
                  onClick={applyAutoMapping}
                  className="text-sm"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Automatisch zuordnen
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[
                { field: 'title', label: 'Titel *', required: true },
                { field: 'subtitle', label: 'Untertitel' },
                { field: 'type', label: 'Typ' },
                { field: 'format', label: 'Format' },
                { field: 'websiteUrl', label: 'Website' },
                { field: 'languages', label: 'Sprachen' },
                { field: 'countries', label: 'Länder' },
                { field: 'circulation', label: 'Auflage (Print)' },
                { field: 'uniqueVisitors', label: 'Online-Besucher' },
                { field: 'focusAreas', label: 'Themenschwerpunkte' },
                { field: 'frequency', label: 'Frequenz' },
                { field: 'targetAudience', label: 'Zielgruppe' }
              ].map(({ field, label, required }) => (
                <Field key={field}>
                  <Label>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Select
                    value={fieldMappings[field] || ''}
                    onChange={(e) => setFieldMappings({
                      ...fieldMappings,
                      [field]: e.target.value
                    })}
                  >
                    <option value="">-- Nicht zugeordnet --</option>
                    {headers.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>

            {/* Vorschau */}
            {previewData.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Datenvorschau (erste 5 Zeilen)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.entries(fieldMappings).filter(([_, source]) => source).map(([field, source]) => (
                          <th key={field} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.entries(fieldMappings).filter(([_, source]) => source).map(([field, source]) => (
                            <td key={field} className="px-3 py-2 text-sm text-gray-900">
                              {row[source] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Import */}
        {currentStep === 'import' && !importResults && (
          <div className="space-y-6">
            <Text className="text-sm text-gray-600">
              Überprüfen Sie die Import-Einstellungen und starten Sie den Import.
            </Text>

            <FieldGroup>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={importOptions.updateExisting}
                    onChange={(checked) => setImportOptions({
                      ...importOptions,
                      updateExisting: checked
                    })}
                  />
                  <span className="text-sm">Existierende Publikationen aktualisieren</span>
                </label>

                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={importOptions.skipInvalid}
                    onChange={(checked) => setImportOptions({
                      ...importOptions,
                      skipInvalid: checked
                    })}
                  />
                  <span className="text-sm">Ungültige Einträge überspringen</span>
                </label>
              </div>

              <Field>
                <Label>Standard-Sprache</Label>
                <Select
                  value={importOptions.defaultLanguage}
                  onChange={(e) => setImportOptions({
                    ...importOptions,
                    defaultLanguage: e.target.value
                  })}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">Englisch</option>
                  <option value="fr">Französisch</option>
                  <option value="it">Italienisch</option>
                </Select>
                <Description>Wird verwendet, wenn keine Sprache angegeben ist.</Description>
              </Field>

              <Field>
                <Label>Standard-Land</Label>
                <Select
                  value={importOptions.defaultCountry}
                  onChange={(e) => setImportOptions({
                    ...importOptions,
                    defaultCountry: e.target.value
                  })}
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="US">USA</option>
                  <option value="GB">Großbritannien</option>
                </Select>
                <Description>Wird verwendet, wenn kein Land angegeben ist.</Description>
              </Field>
            </FieldGroup>

            <Alert
              type="info"
              title="Import-Prozess"
              message="Der Import kann je nach Datenmenge einige Sekunden dauern. Duplikate werden automatisch erkannt."
            />
          </div>
        )}

        {/* Import-Ergebnisse */}
        {importResults && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import abgeschlossen!</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Text className="text-2xl font-bold text-green-600">{importResults.created}</Text>
                <Text className="text-sm text-green-800">Erstellt</Text>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Text className="text-2xl font-bold text-blue-600">{importResults.updated}</Text>
                <Text className="text-sm text-blue-800">Aktualisiert</Text>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <Text className="text-2xl font-bold text-yellow-600">{importResults.skipped}</Text>
                <Text className="text-sm text-yellow-800">Übersprungen</Text>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="mt-4">
                <Alert
                  type="warning"
                  title={`${importResults.errors.length} Fehler beim Import`}
                  message="Folgende Zeilen konnten nicht importiert werden:"
                />
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-600 space-y-1">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>
                        Zeile {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert type="error" message={error} />
        )}
      </DialogBody>
      
      <DialogActions className="px-6 py-4">
        {currentStep === 'upload' && (
          <>
            <Button plain onClick={onClose}>Abbrechen</Button>
            <Button 
              onClick={handleNextToMapping}
              disabled={!canProceed}
              className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Weiter
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
        
        {currentStep === 'mapping' && (
          <>
            <Button plain onClick={() => setCurrentStep('upload')}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <Button 
              onClick={handleNextToImport}
              disabled={!canProceed}
              className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Weiter
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
        
        {currentStep === 'import' && !importResults && (
          <>
            <Button plain onClick={() => setCurrentStep('mapping')} disabled={isImporting}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting}
              className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {isImporting ? 'Importiere...' : 'Import starten'}
            </Button>
          </>
        )}
        
        {importResults && (
          <Button 
            onClick={onClose}
            className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Fertig
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}