// src/app/dashboard/library/media-kits/MediaKitModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { mediaKitService, publicationService, advertisementService } from "@/lib/firebase/library-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import type { MediaKit, Publication, Advertisement } from "@/types/library";
import type { CompanyEnhanced } from "@/types/crm-enhanced";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
import { 
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CogIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/20/solid";

interface MediaKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaKit?: MediaKit;
  onSuccess: () => void;
}

// Labels für Publikationstypen und Werbemitteltypen
const publicationTypeLabels: Record<string, string> = {
  'magazine': 'Magazin',
  'newspaper': 'Zeitung',
  'website': 'Website',
  'blog': 'Blog',
  'newsletter': 'Newsletter',
  'podcast': 'Podcast',
  'tv': 'TV',
  'radio': 'Radio',
  'trade_journal': 'Fachzeitschrift',
  'press_agency': 'Nachrichtenagentur',
  'social_media': 'Social Media'
};

const advertisementTypeLabels: Record<string, string> = {
  'display_banner': 'Display Banner',
  'native_ad': 'Native Advertising',
  'video_ad': 'Video-Werbung',
  'print_ad': 'Print-Anzeige',
  'audio_spot': 'Audio-Spot',
  'newsletter_ad': 'Newsletter-Werbung',
  'social_media_ad': 'Social Media Ad',
  'advertorial': 'Advertorial',
  'event_sponsoring': 'Event-Sponsoring',
  'content_partnership': 'Content-Partnerschaft',
  'custom': 'Individuell'
};

export function MediaKitModal({ isOpen, onClose, mediaKit, onSuccess }: MediaKitModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'settings'>('basic');
  
  // Listen
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  
  // Formular-State
  const [formData, setFormData] = useState({
    name: '',
    companyId: '',
    version: `${new Date().getFullYear()}.1`,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  
  // Ausgewählte Publikationen und Werbemittel
  const [selectedPublications, setSelectedPublications] = useState<Set<string>>(new Set());
  const [selectedAdvertisements, setSelectedAdvertisements] = useState<Set<string>>(new Set());
  
  // Such-Filter
  const [publicationSearch, setPublicationSearch] = useState('');
  const [advertisementSearch, setAdvertisementSearch] = useState('');
  
  // Einstellungen
  const [settings, setSettings] = useState({
    showPricing: true,
    showDemographics: true,
    showExamples: true
  });

  useEffect(() => {
    if (user && isOpen) {
      loadData();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (mediaKit) {
      // Lade bestehende Media Kit Daten
      setFormData({
        name: mediaKit.name,
        companyId: mediaKit.companyId,
        version: mediaKit.version,
        validFrom: mediaKit.validFrom ? new Date(mediaKit.validFrom).toISOString().split('T')[0] : '',
        validUntil: mediaKit.validUntil ? new Date(mediaKit.validUntil).toISOString().split('T')[0] : ''
      });
      
      // Setze ausgewählte Publikationen
      const pubIds = new Set(mediaKit.publications.filter(p => p.included).map(p => p.publicationId));
      setSelectedPublications(pubIds);
      
      // Setze ausgewählte Werbemittel
      const adIds = new Set(mediaKit.advertisements.filter(a => a.included).map(a => a.advertisementId));
      setSelectedAdvertisements(adIds);
      
      // Setze Einstellungen
      setSettings(mediaKit.settings);
    }
  }, [mediaKit]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      
      // Lade alle Daten parallel
      const [companiesData, publicationsData, advertisementsData] = await Promise.all([
        companiesEnhancedService.getAll(user.uid),
        publicationService.getAll(user.uid),
        advertisementService.getAll(user.uid)
      ]);
      
      setCompanies(companiesData);
      setPublications(publicationsData);
      setAdvertisements(advertisementsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter Publikationen basierend auf Firma und Suche
  const filteredPublications = publications.filter(pub => {
    if (formData.companyId && pub.publisherId !== formData.companyId) {
      return false;
    }
    if (publicationSearch && !pub.title.toLowerCase().includes(publicationSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Filter Werbemittel basierend auf ausgewählten Publikationen und Suche
  const filteredAdvertisements = advertisements.filter(ad => {
    // Nur Werbemittel anzeigen, die zu ausgewählten Publikationen gehören
    if (selectedPublications.size > 0) {
      const hasMatchingPublication = ad.publicationIds.some(pubId => selectedPublications.has(pubId));
      if (!hasMatchingPublication) {
        return false;
      }
    }
    if (advertisementSearch && !ad.name.toLowerCase().includes(advertisementSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.companyId) return;

    setLoading(true);
    try {
      const selectedCompany = companies.find(c => c.id === formData.companyId);
      
      const mediaKitData: any = {
        name: formData.name,
        companyId: formData.companyId,
        companyName: selectedCompany?.name || selectedCompany?.officialName || '',
        version: formData.version,
        validFrom: new Date(formData.validFrom),
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        
        publications: Array.from(selectedPublications).map(pubId => ({
          publicationId: pubId,
          included: true
        })),
        
        advertisements: Array.from(selectedAdvertisements).map(adId => ({
          advertisementId: adId,
          included: true
        })),
        
        documents: [{
          type: 'full',
          language: 'de',
          format: 'pdf'
        }],
        
        settings: settings
      };

      if (mediaKit?.id) {
        await mediaKitService.update(mediaKit.id, mediaKitData, {
          organizationId: user.uid,
          userId: user.uid
        });
      } else {
        await mediaKitService.create(mediaKitData, {
          organizationId: user.uid,
          userId: user.uid
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving media kit:", error);
      alert("Fehler beim Speichern des Media Kits");
    } finally {
      setLoading(false);
    }
  };

  const togglePublication = (pubId: string) => {
    const newSelected = new Set(selectedPublications);
    if (newSelected.has(pubId)) {
      newSelected.delete(pubId);
      
      // Entferne auch alle Werbemittel dieser Publikation
      const pubAds = advertisements.filter(ad => ad.publicationIds.includes(pubId));
      pubAds.forEach(ad => {
        if (ad.id) selectedAdvertisements.delete(ad.id);
      });
    } else {
      newSelected.add(pubId);
    }
    setSelectedPublications(newSelected);
  };

  const toggleAdvertisement = (adId: string) => {
    const newSelected = new Set(selectedAdvertisements);
    if (newSelected.has(adId)) {
      newSelected.delete(adId);
    } else {
      newSelected.add(adId);
    }
    setSelectedAdvertisements(newSelected);
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, companyId });
    
    // Reset selections wenn Firma geändert wird
    setSelectedPublications(new Set());
    setSelectedAdvertisements(new Set());
  };

  if (loadingData) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
              <p className="mt-4 text-gray-500">Lade Daten...</p>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {mediaKit ? 'Media Kit bearbeiten' : 'Neues Media Kit'}
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
              <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
              Grunddaten
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`${
                activeTab === 'content' 
                  ? 'border-[#005fab] text-[#005fab]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              <DocumentTextIcon className="inline h-4 w-4 mr-1" />
              Inhalte
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings' 
                  ? 'border-[#005fab] text-[#005fab]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              <CogIcon className="inline h-4 w-4 mr-1" />
              Einstellungen
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Grunddaten Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name des Media Kits *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="z.B. Media Kit 2024, Preisliste Q4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verlag/Medienhaus *
                </label>
                <Select
                  value={formData.companyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                >
                  <option value="">-- Firma auswählen --</option>
                  {companies
                    .sort((a, b) => {
                      const nameA = a.name || a.officialName || '';
                      const nameB = b.name || b.officialName || '';
                      return nameA.localeCompare(nameB);
                    })
                    .map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || company.officialName}
                        {company.tradingName && company.tradingName !== company.name && 
                          ` (${company.tradingName})`
                        }
                      </option>
                    ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <Input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="2024.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gültig ab *
                  </label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gültig bis
                  </label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800">
                      Media Kits fassen Publikationen und deren Werbemittel zu einem digitalen Verkaufsprospekt zusammen. 
                      Nach der Erstellung können Sie PDFs generieren und mit Kunden teilen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inhalte Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {!formData.companyId ? (
                <div className="text-center py-12">
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    Bitte wählen Sie zuerst ein Medienhaus aus.
                  </p>
                </div>
              ) : (
                <>
                  {/* Publikationen */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Publikationen ({selectedPublications.size} ausgewählt)
                    </h4>
                    
                    {/* Suche */}
                    <div className="relative mb-3">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="search"
                        value={publicationSearch}
                        onChange={(e) => setPublicationSearch(e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#005fab]"
                        placeholder="Publikationen durchsuchen..."
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {filteredPublications.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">
                          Keine Publikationen für dieses Medienhaus gefunden.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredPublications.map((pub) => (
                            <label
                              key={pub.id}
                              className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                            >
                              <div className="flex items-center">
                                <Checkbox
                                  checked={selectedPublications.has(pub.id!)}
                                  onChange={() => togglePublication(pub.id!)}
                                  className="mr-3"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {pub.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {publicationTypeLabels[pub.type] || pub.type} • {pub.languages?.join(', ')}
                                  </p>
                                </div>
                              </div>
                              {pub.verified && (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Werbemittel */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Werbemittel ({selectedAdvertisements.size} ausgewählt)
                    </h4>
                    
                    {selectedPublications.size === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          Wählen Sie zuerst Publikationen aus, um deren Werbemittel anzuzeigen.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Suche */}
                        <div className="relative mb-3">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="search"
                            value={advertisementSearch}
                            onChange={(e) => setAdvertisementSearch(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#005fab]"
                            placeholder="Werbemittel durchsuchen..."
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          {filteredAdvertisements.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 text-center">
                              Keine Werbemittel für die ausgewählten Publikationen gefunden.
                            </p>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {filteredAdvertisements.map((ad) => {
                                // Finde zugehörige Publikation(en)
                                const relatedPubs = publications.filter(pub => 
                                  ad.publicationIds.includes(pub.id!) && selectedPublications.has(pub.id!)
                                );
                                
                                return (
                                  <label
                                    key={ad.id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <div className="flex items-center">
                                      <Checkbox
                                        checked={selectedAdvertisements.has(ad.id!)}
                                        onChange={() => toggleAdvertisement(ad.id!)}
                                        className="mr-3"
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {ad.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {advertisementTypeLabels[ad.type] || ad.type} • 
                                          {ad.pricing.listPrice.amount} {ad.pricing.listPrice.currency}
                                        </p>
                                        {relatedPubs.length > 0 && (
                                          <p className="text-xs text-gray-400 mt-1">
                                            in: {relatedPubs.map(p => p.title).join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {ad.status === 'active' && (
                                      <Badge color="green">Aktiv</Badge>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Einstellungen Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Anzeigeoptionen
              </h4>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.showPricing}
                    onChange={(checked) => setSettings({ ...settings, showPricing: checked })}
                  />
                  <span className="text-sm text-gray-700">Preise anzeigen</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.showDemographics}
                    onChange={(checked) => setSettings({ ...settings, showDemographics: checked })}
                  />
                  <span className="text-sm text-gray-700">Demografische Daten anzeigen</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.showExamples}
                    onChange={(checked) => setSettings({ ...settings, showExamples: checked })}
                  />
                  <span className="text-sm text-gray-700">Beispiele anzeigen</span>
                </label>
              </div>

              <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Geplante Features:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Custom Branding (Logo, Farben)</li>
                  <li>• Mehrsprachige Media Kits</li>
                  <li>• Verschiedene Templates</li>
                  <li>• Passwortschutz für PDFs</li>
                  <li>• Analytics & Tracking</li>
                </ul>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name || !formData.companyId}
            >
              {loading ? 'Speichern...' : mediaKit ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}