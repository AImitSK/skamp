// src/app/dashboard/library/publications/PublicationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { publicationService } from "@/lib/firebase/library-service";
import type { Publication, PublicationType, PublicationFormat, PublicationFrequency } from "@/types/library";
import type { BaseEntity } from "@/types/international";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { 
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/20/solid";

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication?: Publication;
  onSuccess: () => void;
}

const publicationTypes = [
  { value: 'newspaper', label: 'Zeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'website', label: 'Website' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'other', label: 'Sonstiges' }
];

const frequencies = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'irregular', label: 'Unregelmäßig' }
];

const circulationTypes = [
  { value: 'distributed', label: 'Verbreitete Auflage' },
  { value: 'sold', label: 'Verkaufte Auflage' },
  { value: 'printed', label: 'Gedruckte Auflage' },
  { value: 'subscribers', label: 'Abonnenten' },
  { value: 'audited_ivw', label: 'IVW geprüft' }
];

// Mock-Daten für ISO-Validatoren (da diese noch nicht implementiert sind)
const getAvailableCountries = (lang: string) => [
  { code: 'DE', name: 'Deutschland', isEu: true },
  { code: 'AT', name: 'Österreich', isEu: true },
  { code: 'CH', name: 'Schweiz', isEu: false },
  { code: 'US', name: 'USA', isEu: false },
  { code: 'GB', name: 'Großbritannien', isEu: false },
  { code: 'FR', name: 'Frankreich', isEu: true },
];

const getAvailableLanguages = () => [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'Englisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'it', name: 'Italienisch' },
];

export function PublicationModal({ isOpen, onClose, publication, onSuccess }: PublicationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'metrics' | 'identifiers'>('basic');
  
  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    publisherId: string;
    publisherName: string;
    type: PublicationType;
    format: PublicationFormat;
    languages: string[];
    geographicTargets: string[];
    focusAreas: string[];
    verified: boolean;
    status: 'active' | 'inactive' | 'discontinued' | 'planned';
    metrics: {
      frequency: PublicationFrequency;
    };
    geographicScope: 'local' | 'regional' | 'national' | 'international' | 'global';
  }>({
    title: '',
    publisherId: '',
    publisherName: '',
    type: 'website',
    format: 'online',
    languages: [],
    geographicTargets: [],
    focusAreas: [],
    verified: false,
    status: 'active',
    metrics: {
      frequency: 'daily'
    },
    geographicScope: 'national'
  });
  
  // Zusätzliche Felder die nicht in PublicationFormData sind
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  // Metriken State
  const [metrics, setMetrics] = useState({
    frequency: '',
    print: {
      circulation: '',
      circulationType: 'distributed' as 'distributed' | 'sold' | 'printed' | 'subscribers' | 'audited_ivw'
    },
    online: {
      monthlyUniqueVisitors: '',
      monthlyPageViews: '',
      avgSessionDuration: '',
      bounceRate: ''
    }
  });

  // Identifikatoren State
  const [identifiers, setIdentifiers] = useState<Array<{ 
    type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER'; 
    value: string 
  }>>([
    { type: 'ISSN', value: '' }
  ]);

  // Focus Areas als Array von Strings
  const [focusAreasInput, setFocusAreasInput] = useState('');

  useEffect(() => {
    if (publication) {
      // Lade bestehende Publikation
      setFormData({
        title: publication.title,
        publisherId: publication.publisherId || '',
        publisherName: publication.publisherName || '',
        type: publication.type,
        format: publication.format || 'online',
        languages: publication.languages || [],
        geographicTargets: publication.geographicTargets || [],
        focusAreas: publication.focusAreas || [],
        verified: publication.verified || false,
        status: publication.status,
        metrics: publication.metrics,
        geographicScope: publication.geographicScope
      });
      
      // Zusätzliche Felder
      setWebsite(''); // Publication hat kein website Feld
      setNotes(''); // Publication hat kein notes Feld

      // Metriken
      if (publication.metrics) {
        setMetrics({
          frequency: publication.metrics.frequency || '',
          print: {
            circulation: publication.metrics.print?.circulation?.toString() || '',
            circulationType: publication.metrics.print?.circulationType || 'distributed'
          },
          online: {
            monthlyUniqueVisitors: publication.metrics.online?.monthlyUniqueVisitors?.toString() || '',
            monthlyPageViews: publication.metrics.online?.monthlyPageViews?.toString() || '',
            avgSessionDuration: publication.metrics.online?.avgSessionDuration?.toString() || '',
            bounceRate: publication.metrics.online?.bounceRate?.toString() || ''
          }
        });
      }

      // Identifikatoren
      if (publication.identifiers) {
        setIdentifiers(publication.identifiers.map(id => ({
          type: id.type,
          value: id.value
        })));
      }

      // Focus Areas
      setFocusAreasInput(publication.focusAreas?.join(', ') || '');
    }
  }, [publication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Bereite Daten vor - ohne organizationId, da es über Context kommt
      const publicationData: Omit<Publication, keyof BaseEntity | 'organizationId'> = {
        ...formData,
        focusAreas: focusAreasInput.split(',').map(s => s.trim()).filter(Boolean),
        metrics: {
          ...formData.metrics,
          frequency: (metrics.frequency || 'daily') as PublicationFrequency,
          print: metrics.print.circulation ? {
            circulation: parseInt(metrics.print.circulation),
            circulationType: metrics.print.circulationType
          } : undefined,
          online: metrics.online.monthlyUniqueVisitors ? {
            monthlyUniqueVisitors: parseInt(metrics.online.monthlyUniqueVisitors),
            monthlyPageViews: metrics.online.monthlyPageViews ? parseInt(metrics.online.monthlyPageViews) : undefined,
            avgSessionDuration: metrics.online.avgSessionDuration ? parseFloat(metrics.online.avgSessionDuration) : undefined,
            bounceRate: metrics.online.bounceRate ? parseFloat(metrics.online.bounceRate) : undefined
          } : undefined
        },
        identifiers: identifiers.filter(id => id.value).map(id => ({
          type: id.type,
          value: id.value
        }))
      };

      if (publication?.id) {
        // Update - übergebe nur die geänderten Felder
        await publicationService.update(publication.id, publicationData as any, {
          organizationId: user.uid,
          userId: user.uid
        });
      } else {
        // Create - BaseService fügt organizationId automatisch hinzu
        await publicationService.create(publicationData as any, {
          organizationId: user.uid,
          userId: user.uid
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving publication:", error);
      alert("Fehler beim Speichern der Publikation");
    } finally {
      setLoading(false);
    }
  };

  const addIdentifier = () => {
    setIdentifiers([...identifiers, { type: 'URL', value: '' }]);
  };

  const removeIdentifier = (index: number) => {
    setIdentifiers(identifiers.filter((_, i) => i !== index));
  };

  const countries = getAvailableCountries('de');
  const languages = getAvailableLanguages();

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
      <div className="p-6"> 

      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {publication ? 'Publikation bearbeiten' : 'Neue Publikation'}
        </h3>
        
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`${
              activeTab === 'basic' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Grunddaten
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`${
              activeTab === 'metrics' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Metriken
          </button>
          <button
            onClick={() => setActiveTab('identifiers')}
            className={`${
              activeTab === 'identifiers' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Identifikatoren
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grunddaten Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel der Publikation *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verlag
                </label>
                <Input
                  type="text"
                  value={formData.publisherName}
                  onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                  placeholder="Name des Verlags"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ *
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  {publicationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <Select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as 'print' | 'online' | 'both' })}
                >
                  <option value="print">Print</option>
                  <option value="online">Digital</option>
                  <option value="both">Print & Digital</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sprachen
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {languages.map(lang => (
                  <label key={lang.code} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            languages: [...formData.languages, lang.code] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            languages: formData.languages.filter(l => l !== lang.code) 
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geografische Zielgebiete
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {countries.map(country => (
                  <label key={country.code} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.geographicTargets.includes(country.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            geographicTargets: [...formData.geographicTargets, country.code] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            geographicTargets: formData.geographicTargets.filter(c => c !== country.code) 
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {country.name} {country.isEu && <span className="text-gray-500">(EU)</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Themenbereiche (kommagetrennt)
              </label>
              <Input
                type="text"
                value={focusAreasInput}
                onChange={(e) => setFocusAreasInput(e.target.value)}
                placeholder="Wirtschaft, Technologie, Politik..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="verified"
                checked={formData.verified}
                onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                className="h-4 w-4 text-[#005fab] focus:ring-[#005fab] border-gray-300 rounded"
              />
              <label htmlFor="verified" className="ml-2 block text-sm text-gray-900">
                Publikation ist verifiziert
              </label>
            </div>
          </div>
        )}

        {/* Metriken Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Erscheinungsfrequenz
              </label>
              <Select
                value={metrics.frequency}
                onChange={(e) => setMetrics({ ...metrics, frequency: e.target.value })}
              >
                <option value="">Bitte wählen...</option>
                {frequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Print Metriken */}
            {(formData.format === 'print' || formData.format === 'both') && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Print-Metriken</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auflage
                    </label>
                    <Input
                      type="number"
                      value={metrics.print.circulation}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        print: { ...metrics.print, circulation: e.target.value }
                      })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auflagentyp
                    </label>
                    <Select
                      value={metrics.print.circulationType}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        print: { ...metrics.print, circulationType: e.target.value as any }
                      })}
                    >
                      {circulationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Online Metriken */}
            {(formData.format === 'online' || formData.format === 'both') && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Online-Metriken</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monatliche Unique Visitors
                    </label>
                    <Input
                      type="number"
                      value={metrics.online.monthlyUniqueVisitors}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        online: { ...metrics.online, monthlyUniqueVisitors: e.target.value }
                      })}
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monatliche Page Views
                    </label>
                    <Input
                      type="number"
                      value={metrics.online.monthlyPageViews}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        online: { ...metrics.online, monthlyPageViews: e.target.value }
                      })}
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ø Sitzungsdauer (Minuten)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metrics.online.avgSessionDuration}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        online: { ...metrics.online, avgSessionDuration: e.target.value }
                      })}
                      placeholder="3.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bounce Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metrics.online.bounceRate}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        online: { ...metrics.online, bounceRate: e.target.value }
                      })}
                      placeholder="45.5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Identifikatoren Tab */}
        {activeTab === 'identifiers' && (
          <div className="space-y-4">
            {identifiers.map((identifier, index) => (
              <div key={index} className="flex gap-2">
                <Select
                  value={identifier.type}
                  onChange={(e) => {
                    const updated = [...identifiers];
                    updated[index] = { ...updated[index], type: e.target.value as any };
                    setIdentifiers(updated);
                  }}
                  className="w-1/3"
                >
                  <option value="ISSN">ISSN</option>
                  <option value="ISBN">ISBN</option>
                  <option value="DOI">DOI</option>
                  <option value="URL">URL</option>
                  <option value="DOMAIN">Domain</option>
                  <option value="SOCIAL_HANDLE">Social Handle</option>
                  <option value="OTHER">Sonstiges</option>
                </Select>
                <Input
                  type="text"
                  value={identifier.value}
                  onChange={(e) => {
                    const updated = [...identifiers];
                    updated[index].value = e.target.value;
                    setIdentifiers(updated);
                  }}
                  placeholder="Wert eingeben..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  plain
                  onClick={() => removeIdentifier(index)}
                  disabled={identifiers.length === 1}
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
              </div>
            ))}
            <Button type="button" plain onClick={addIdentifier}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Identifikator hinzufügen
            </Button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Speichern...' : publication ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </div>
      </form>
          </div>
    </Dialog>
  );
}