// src/app/dashboard/library/publications/PublicationImportModal.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Field, Label, FieldGroup, Description } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import Papa from 'papaparse';
import { publicationService } from '@/lib/firebase/library-service';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { Publication, PublicationType, PublicationFormat, PublicationFrequency } from '@/types/library';
import type { CompanyEnhanced } from '@/types/crm-enhanced';
import { CountryCode, LanguageCode } from '@/types/international';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  InformationCircleIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

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
    warning: 'bg-amber-50 text-amber-700'
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
            type === 'warning' ? 'text-amber-400' :
            'text-blue-400'
          }`} />
        </div>
        <div className="ml-3 flex-1">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ progress }: { progress: ImportProgress }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const statusText = {
    parsing: 'Datei wird gelesen...',
    validating: 'Daten werden validiert...',
    importing: `Importiere ${progress.current} von ${progress.total}...`,
    done: 'Import abgeschlossen!'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{statusText[progress.status]}</span>
        <span className="text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={clsx(
            "h-full transition-all duration-300",
            progress.status === 'done' ? 'bg-green-500' : 'bg-[#005fab]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Types
interface ImportProgress {
  current: number;
  total: number;
  status: 'parsing' | 'validating' | 'importing' | 'done';
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

interface Props {
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function PublicationImportModal({ onClose, onImportSuccess }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<CompanyEnhanced[]>([]);
  const [loadingPublishers, setLoadingPublishers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample CSV Template mit realistischen Daten
  const sampleCSV = `Titel*;Untertitel;Verlag;Typ*;Format;Status;Website;Geografischer Fokus;Sprachen*;Länder*;Themenschwerpunkte;Frequenz;Zielgruppe;Altersgruppe;Geschlecht;Print Auflage;Print Auflagentyp;Print Preis;Print Währung;Online UV/Monat;Online PV/Monat;Online Session Dauer (Sek);Online Bounce Rate (%);ISSN;Verifiziert;Interne Notizen
Der Spiegel;Deutschlands führendes Nachrichtenmagazin;Spiegel-Verlag;magazine;both;active;https://www.spiegel.de;national;de;"DE,AT,CH";"Politik,Wirtschaft,Gesellschaft";weekly;Bildungsbürger;30-59;all;850000;audited_ivw;8.50;EUR;25000000;150000000;420;35;0038-7452;ja;Premium-Publikation mit hoher Reichweite
Süddeutsche Zeitung;Meinungsstarke überregionale Tageszeitung;Süddeutscher Verlag;newspaper;both;active;https://www.sueddeutsche.de;national;de;"DE,AT,CH";"Politik,Kultur,Sport";daily;Bildungselite;35-64;all;320000;audited_ivw;3.20;EUR;18000000;95000000;380;42;0174-4917;ja;Sehr hohe journalistische Qualität
Heise Online;IT-Nachrichten und Hintergründe;;website;online;active;https://www.heise.de;international;"de,en";"DE,AT,CH,US,GB";"IT,Technologie,Digitalisierung";continuous;IT-Professionals;25-49;predominantly_male;;;;;;12000000;65000000;320;28;2196-4327;ja;Führende IT-Publikation im DACH-Raum - Verlag wird später zugeordnet`;

  // Lade Publisher beim Mount
  useEffect(() => {
    loadPublishers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPublishers = async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      setLoadingPublishers(true);
      const allCompanies = await companiesEnhancedService.getAll(currentOrganization.id);

      const publisherCompanies = allCompanies.filter(company =>
        ['publisher', 'media_house', 'partner'].includes(company.type)
      );

      // Falls keine Publisher, zeige alle Firmen
      if (publisherCompanies.length === 0 && allCompanies.length > 0) {
        setPublishers(allCompanies);
      } else {
        setPublishers(publisherCompanies);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Verlage:', err);
    } finally {
      setLoadingPublishers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setImportResult(null);
      setImportProgress(null);

      // Preview erste 5 Zeilen
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        delimiter: ';',
        complete: (results) => {
          setPreviewData(results.data);
        }
      });
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${sampleCSV}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'publikationen-import-vorlage.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Parse Komma-getrennte Arrays
  const parseArray = (value: string): string[] => {
    if (!value) return [];
    return value.split(',').map(v => v.trim()).filter(Boolean);
  };

  // Helper: Parse Number
  const parseNumber = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const num = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? undefined : num;
  };

  // Helper: Parse Boolean
  const parseBoolean = (value: string): boolean => {
    return value?.toLowerCase() === 'ja' || value?.toLowerCase() === 'true';
  };

  const parsePublicationRow = (row: any, allPublishers: CompanyEnhanced[]): Partial<Publication> => {
    // Finde Publisher nach Name (optional)
    const publisherName = row["Verlag"];
    const matchedPublisher = publisherName ?
      allPublishers.find(p => p.name.toLowerCase() === publisherName.toLowerCase()) :
      undefined;

    const pub: Partial<Publication> = {
      // Grunddaten
      title: row["Titel*"] || row["Titel"],
      subtitle: row["Untertitel"],
      ...(matchedPublisher?.id && { publisherId: matchedPublisher.id }),
      ...(publisherName && { publisherName: publisherName }),

      // Klassifizierung
      type: mapPublicationType(row["Typ*"] || row["Typ"]),
      format: mapPublicationFormat(row["Format"]) || 'print',
      status: mapPublicationStatus(row["Status"]) || 'active',
      geographicScope: mapGeographicScope(row["Geografischer Fokus"]) || 'national',

      // Website
      websiteUrl: row["Website"],

      // International
      languages: parseArray(row["Sprachen*"] || row["Sprachen"]) as LanguageCode[] || ['de'],
      geographicTargets: parseArray(row["Länder*"] || row["Länder"]) as CountryCode[] || ['DE'],

      // Content
      focusAreas: parseArray(row["Themenschwerpunkte"]) || [],

      // Metriken
      metrics: {
        frequency: mapPublicationFrequency(row["Frequenz"]) || 'monthly',
        targetAudience: row["Zielgruppe"],
        targetAgeGroup: row["Altersgruppe"],
        targetGender: mapTargetGender(row["Geschlecht"])
      },

      // Verifizierung
      verified: parseBoolean(row["Verifiziert"]),

      // Notizen
      internalNotes: row["Interne Notizen"]
    };

    // Print Metriken
    const printCirculation = parseNumber(row["Print Auflage"]);
    const printPrice = parseNumber(row["Print Preis"]);
    if (printCirculation !== undefined || printPrice !== undefined) {
      pub.metrics!.print = {
        ...(printCirculation !== undefined && { circulation: printCirculation }),
        circulationType: mapCirculationType(row["Print Auflagentyp"]) || 'printed',
        pricePerIssue: printPrice ? {
          amount: printPrice,
          currency: (row["Print Währung"] || 'EUR') as any
        } : undefined
      } as any;
    }

    // Online Metriken
    const onlineUV = parseNumber(row["Online UV/Monat"]);
    const onlinePV = parseNumber(row["Online PV/Monat"]);
    const sessionDuration = parseNumber(row["Online Session Dauer (Sek)"]);
    const bounceRate = parseNumber(row["Online Bounce Rate (%)"]);

    if (onlineUV || onlinePV || sessionDuration || bounceRate) {
      pub.metrics!.online = {
        monthlyUniqueVisitors: onlineUV,
        monthlyPageViews: onlinePV,
        avgSessionDuration: sessionDuration,
        bounceRate: bounceRate
      };
    }

    // Identifiers
    const issn = row["ISSN"];
    if (issn) {
      pub.identifiers = [{
        type: 'ISSN',
        value: issn
      }];
    }

    return pub;
  };

  // Mapping Functions
  const mapPublicationType = (type: string): PublicationType => {
    const typeMap: Record<string, PublicationType> = {
      'magazin': 'magazine',
      'magazine': 'magazine',
      'zeitschrift': 'magazine',
      'zeitung': 'newspaper',
      'newspaper': 'newspaper',
      'tageszeitung': 'newspaper',
      'website': 'website',
      'blog': 'blog',
      'podcast': 'podcast',
      'tv': 'tv',
      'radio': 'radio',
      'newsletter': 'newsletter',
      'fachzeitschrift': 'trade_journal',
      'nachrichtenagentur': 'press_agency',
      'social media': 'social_media'
    };
    return typeMap[type?.toLowerCase()] || 'magazine';
  };

  const mapPublicationFormat = (format: string): PublicationFormat | undefined => {
    if (!format) return undefined;
    const formatMap: Record<string, PublicationFormat> = {
      'print': 'print',
      'online': 'online',
      'both': 'both',
      'beides': 'both',
      'broadcast': 'broadcast'
    };
    return formatMap[format.toLowerCase()];
  };

  const mapPublicationStatus = (status: string): Publication['status'] | undefined => {
    if (!status) return undefined;
    const statusMap: Record<string, Publication['status']> = {
      'active': 'active',
      'aktiv': 'active',
      'inactive': 'inactive',
      'inaktiv': 'inactive',
      'discontinued': 'discontinued',
      'eingestellt': 'discontinued',
      'planned': 'planned',
      'geplant': 'planned'
    };
    return statusMap[status.toLowerCase()];
  };

  const mapGeographicScope = (scope: string): Publication['geographicScope'] | undefined => {
    if (!scope) return undefined;
    const scopeMap: Record<string, Publication['geographicScope']> = {
      'local': 'local',
      'lokal': 'local',
      'regional': 'regional',
      'national': 'national',
      'international': 'international',
      'global': 'global'
    };
    return scopeMap[scope.toLowerCase()];
  };

  const mapPublicationFrequency = (freq: string): PublicationFrequency | undefined => {
    if (!freq) return undefined;
    const freqMap: Record<string, PublicationFrequency> = {
      'continuous': 'continuous',
      'durchgehend': 'continuous',
      '24/7': 'continuous',
      'multiple_daily': 'multiple_daily',
      'mehrmals täglich': 'multiple_daily',
      'daily': 'daily',
      'täglich': 'daily',
      'weekly': 'weekly',
      'wöchentlich': 'weekly',
      'biweekly': 'biweekly',
      '14-tägig': 'biweekly',
      'monthly': 'monthly',
      'monatlich': 'monthly',
      'bimonthly': 'bimonthly',
      'zweimonatlich': 'bimonthly',
      'quarterly': 'quarterly',
      'vierteljährlich': 'quarterly',
      'biannual': 'biannual',
      'halbjährlich': 'biannual',
      'annual': 'annual',
      'jährlich': 'annual',
      'irregular': 'irregular',
      'unregelmäßig': 'irregular'
    };
    return freqMap[freq.toLowerCase()];
  };

  const mapTargetGender = (gender: string): 'all' | 'predominantly_male' | 'predominantly_female' | undefined => {
    if (!gender) return undefined;
    const genderMap: Record<string, any> = {
      'all': 'all',
      'alle': 'all',
      'predominantly_male': 'predominantly_male',
      'männlich': 'predominantly_male',
      'predominantly_female': 'predominantly_female',
      'weiblich': 'predominantly_female'
    };
    return genderMap[gender.toLowerCase()];
  };

  const mapCirculationType = (type: string): 'printed' | 'sold' | 'distributed' | 'subscribers' | 'audited_ivw' | undefined => {
    if (!type) return undefined;
    const typeMap: Record<string, any> = {
      'printed': 'printed',
      'gedruckt': 'printed',
      'sold': 'sold',
      'verkauft': 'sold',
      'distributed': 'distributed',
      'verteilt': 'distributed',
      'subscribers': 'subscribers',
      'abonnenten': 'subscribers',
      'audited_ivw': 'audited_ivw',
      'ivw': 'audited_ivw'
    };
    return typeMap[type.toLowerCase()];
  };

  const handleImport = async () => {
    if (!file || !user) {
      setError('Bitte wählen Sie eine Datei aus.');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportResult(null);

    setImportProgress({
      current: 0,
      total: 0,
      status: 'parsing'
    });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      complete: async (results) => {
        try {
          const totalRows = results.data.length;
          setImportProgress({
            current: 0,
            total: totalRows,
            status: 'validating'
          });

          const publications: Partial<Publication>[] = [];
          const parseErrors: { row: number; error: string }[] = [];

          results.data.forEach((row: any, index: number) => {
            try {
              if (!row["Titel*"] && !row["Titel"]) {
                parseErrors.push({
                  row: index + 2,
                  error: 'Titel fehlt'
                });
                return;
              }

              if (!row["Typ*"] && !row["Typ"]) {
                parseErrors.push({
                  row: index + 2,
                  error: 'Typ fehlt'
                });
                return;
              }

              const publication = parsePublicationRow(row, publishers);
              publications.push(publication);
            } catch (err) {
              parseErrors.push({
                row: index + 2,
                error: err instanceof Error ? err.message : 'Parsing-Fehler'
              });
            }
          });

          if (publications.length === 0 && parseErrors.length > 0) {
            setError(`Import fehlgeschlagen. ${parseErrors.length} Fehler gefunden.`);
            setImportResult({
              created: 0,
              updated: 0,
              skipped: 0,
              errors: parseErrors
            });
            return;
          }

          setImportProgress({
            current: 0,
            total: publications.length,
            status: 'importing'
          });

          const result = await publicationService.import(
            publications,
            {
              organizationId: currentOrganization!.id,
              userId: user.uid
            },
            {
              duplicateCheck: true,
              updateExisting: duplicateHandling === 'update'
            }
          );

          result.errors = [...parseErrors, ...result.errors];

          setImportResult(result);
          setImportProgress({
            current: publications.length,
            total: publications.length,
            status: 'done'
          });

          if (result.created > 0 || result.updated > 0) {
            // Invalidate queries to refresh the table
            queryClient.invalidateQueries({ queryKey: ['publications', currentOrganization!.id] });
            onImportSuccess();
          }
        } catch (err) {
          setError("Ein Fehler ist aufgetreten. Bitte überprüfen Sie das Dateiformat.");
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setError(`Fehler beim Lesen der Datei: ${error.message}`);
        setIsImporting(false);
      }
    });
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <DialogTitle className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Publikationen importieren</span>
          <Badge color="blue" className="shrink-0">{file ? '1 Datei ausgewählt' : 'Keine Datei'}</Badge>
        </div>
      </DialogTitle>

      <DialogBody className="p-6">
        {!importResult ? (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <Text className="text-sm font-medium text-blue-800">
                    Publikationen-Import
                  </Text>
                  <Text className="mt-1 text-sm text-blue-700">
                    Laden Sie eine CSV-Datei hoch, um Publikationen zu importieren.
                    Die Datei sollte UTF-8 kodiert sein und Semikolon (;) als Trennzeichen verwenden (Excel-Standard für Deutschland).
                  </Text>
                  <div className="mt-2">
                    <button
                      onClick={downloadTemplate}
                      className="text-sm font-medium text-blue-800 hover:text-blue-900"
                    >
                      <DocumentArrowDownIcon className="inline h-4 w-4 mr-1" />
                      Vorlage herunterladen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info über Verlagszuordnung */}
            <Alert
              type="info"
              title="Verlagszuordnung (optional)"
              message="Sie können Publikationen ohne Verlag importieren und diesen später zuordnen. Optional: Geben Sie in der CSV-Spalte 'Verlag' den Namen an - wenn der Verlag im CRM existiert, wird er automatisch verknüpft."
            />

            {/* Duplikate-Behandlung */}
            <FieldGroup>
              <Field>
                <Label>Duplikate-Behandlung</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="skip"
                      checked={duplicateHandling === 'skip'}
                      onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                      className="h-4 w-4 text-[#005fab] focus:ring-[#005fab]"
                    />
                    <span className="ml-2 text-sm">Duplikate überspringen</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="update"
                      checked={duplicateHandling === 'update'}
                      onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                      className="h-4 w-4 text-[#005fab] focus:ring-[#005fab]"
                    />
                    <span className="ml-2 text-sm">Bestehende Einträge aktualisieren</span>
                  </label>
                </div>
              </Field>
            </FieldGroup>

            {/* File Upload */}
            <div>
              <h3 className="block text-sm font-medium text-gray-700 mb-2">
                CSV-Datei auswählen
              </h3>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                    <Text className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Klicken Sie hier</span> oder ziehen Sie eine Datei hierher
                    </Text>
                    <Text className="text-xs text-gray-500">CSV-Datei (max. 10MB)</Text>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isImporting}
                  />
                </label>
              </div>
              {file && (
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Ausgewählte Datei: <span className="font-medium">{file.name}</span></span>
                  <Button plain onClick={resetImport}>
                    Zurücksetzen
                  </Button>
                </div>
              )}
            </div>

            {/* Preview */}
            {previewData.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Vorschau (erste 5 Zeilen)</h3>
                <div className="mt-2 overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                          ...
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).slice(0, 5).map((value: any, i) => (
                            <td key={i} className="px-3 py-2 text-sm text-gray-900">
                              {value || '—'}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center text-sm text-gray-400">
                            ...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Progress */}
            {importProgress && (
              <ProgressBar progress={importProgress} />
            )}

            {/* Error */}
            {error && (
              <Alert type="error" message={error} />
            )}
          </div>
        ) : (
          // Import Results
          <div className="space-y-6">
            <div className="text-center py-8">
              {importResult.errors.length === 0 ? (
                <>
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Import erfolgreich!</h3>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold">Import mit Warnungen abgeschlossen</h3>
                </>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                <div className="text-sm text-green-600">Neu erstellt</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                <div className="text-sm text-blue-600">Aktualisiert</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">{importResult.skipped}</div>
                <div className="text-sm text-gray-600">Übersprungen</div>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <Text className="font-medium text-red-800">
                    {importResult.errors.length} Fehler gefunden
                  </Text>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <Text key={index} className="text-sm text-red-700">
                      Zeile {error.row}: {error.error}
                    </Text>
                  ))}
                  {importResult.errors.length > 10 && (
                    <Text className="text-sm text-red-700 font-medium">
                      ... und {importResult.errors.length - 10} weitere Fehler
                    </Text>
                  )}
                </div>
              </div>
            )}


            <div className="flex justify-center gap-4">
              <Button plain onClick={resetImport}>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Neuen Import starten
              </Button>
            </div>
          </div>
        )}
      </DialogBody>

      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          {importResult ? 'Schließen' : 'Abbrechen'}
        </Button>
        {!importResult && (
          <Button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {isImporting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Importiere...
              </>
            ) : (
              'Import starten'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
