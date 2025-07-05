// src/components/pr/CampaignBoilerplateSelector.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Checkbox } from "@/components/checkbox";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { Boilerplate } from "@/types/crm";
import { 
  DocumentTextIcon, 
  PlusIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  StarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ArrowsUpDownIcon
} from "@heroicons/react/20/solid";
import { Input } from "@/components/input";

interface CampaignBoilerplateSelectorProps {
  userId: string;
  clientId?: string;
  clientName?: string;
  selectedBoilerplateIds: string[];
  onBoilerplatesChange: (boilerplateIds: string[]) => void;
  onInsertToEditor?: (content: string, position: 'top' | 'bottom' | 'cursor') => void;
}

// Kategorie-Labels
const CATEGORY_LABELS: Record<string, string> = {
  company: 'Unternehmensbeschreibung',
  contact: 'Kontaktinformationen', 
  legal: 'Rechtliche Hinweise',
  product: 'Produktbeschreibung',
  custom: 'Sonstige'
};

// Preview Modal
function BoilerplatePreviewModal({ 
  boilerplate, 
  onClose,
  onSelect,
  isSelected 
}: { 
  boilerplate: Boilerplate | null;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  if (!boilerplate) return null;

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="flex items-center justify-between">
        <span>{boilerplate.name}</span>
        <Badge color={boilerplate.isGlobal ? 'blue' : 'orange'}>
          {boilerplate.isGlobal ? 'Global' : boilerplate.clientName || 'Kundenspezifisch'}
        </Badge>
      </DialogTitle>
      <DialogBody>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Kategorie</label>
            <p className="mt-1">{CATEGORY_LABELS[boilerplate.category]}</p>
          </div>
          
          {boilerplate.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Beschreibung</label>
              <p className="mt-1 text-gray-600">{boilerplate.description}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-700">Inhalt</label>
            <div 
              className="mt-2 prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 border"
              dangerouslySetInnerHTML={{ __html: boilerplate.content }}
            />
          </div>
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>Schließen</Button>
        <Button onClick={onSelect}>
          {isSelected ? (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Ausgewählt
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4 mr-2" />
              Auswählen
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CampaignBoilerplateSelector({ 
  userId, 
  clientId,
  clientName,
  selectedBoilerplateIds, 
  onBoilerplatesChange,
  onInsertToEditor 
}: CampaignBoilerplateSelectorProps) {
  const [structuredBoilerplates, setStructuredBoilerplates] = useState<{
    global: Record<string, Boilerplate[]>;
    client: Record<string, Boilerplate[]>;
    favorites: Boilerplate[];
  }>({ global: {}, client: {}, favorites: [] });
  
  const [selectedBoilerplates, setSelectedBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewBoilerplate, setPreviewBoilerplate] = useState<Boilerplate | null>(null);
  const [activeTab, setActiveTab] = useState<'favorites' | 'global' | 'client'>('favorites');

  useEffect(() => {
    loadBoilerplates();
  }, [clientId]);

  useEffect(() => {
    // Lade die ausgewählten Boilerplates
    if (selectedBoilerplateIds.length > 0) {
      loadSelectedBoilerplates();
    } else {
      setSelectedBoilerplates([]);
    }
  }, [selectedBoilerplateIds]);

  const loadBoilerplates = async () => {
    setLoading(true);
    try {
      const data = await boilerplatesService.getForCampaignEditor(userId, clientId);
      setStructuredBoilerplates(data);
      
      // Expandiere Kategorien mit bereits ausgewählten Boilerplates
      const newExpanded = new Set<string>();
      
      // Check global categories
      Object.entries(data.global).forEach(([category, bps]) => {
        if (bps.some(bp => selectedBoilerplateIds.includes(bp.id!))) {
          newExpanded.add(`global-${category}`);
        }
      });
      
      // Check client categories
      Object.entries(data.client).forEach(([category, bps]) => {
        if (bps.some(bp => selectedBoilerplateIds.includes(bp.id!))) {
          newExpanded.add(`client-${category}`);
        }
      });
      
      setExpandedCategories(newExpanded);
    } catch (error) {
      console.error('Fehler beim Laden der Boilerplates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedBoilerplates = async () => {
    try {
      const selected = await boilerplatesService.getByIds(selectedBoilerplateIds);
      setSelectedBoilerplates(selected);
    } catch (error) {
      console.error('Fehler beim Laden der ausgewählten Boilerplates:', error);
    }
  };

  // Gefilterte Boilerplates basierend auf Suche
  const filteredBoilerplates = useMemo(() => {
    if (!searchTerm) return structuredBoilerplates;
    
    const term = searchTerm.toLowerCase();
    const filterGroup = (group: Record<string, Boilerplate[]>) => {
      const filtered: Record<string, Boilerplate[]> = {};
      
      Object.entries(group).forEach(([category, bps]) => {
        const filteredBps = bps.filter(bp =>
          bp.name.toLowerCase().includes(term) ||
          bp.content.toLowerCase().includes(term) ||
          bp.description?.toLowerCase().includes(term)
        );
        
        if (filteredBps.length > 0) {
          filtered[category] = filteredBps;
        }
      });
      
      return filtered;
    };
    
    return {
      global: filterGroup(structuredBoilerplates.global),
      client: filterGroup(structuredBoilerplates.client),
      favorites: structuredBoilerplates.favorites.filter(bp =>
        bp.name.toLowerCase().includes(term) ||
        bp.content.toLowerCase().includes(term) ||
        bp.description?.toLowerCase().includes(term)
      )
    };
  }, [structuredBoilerplates, searchTerm]);

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleBoilerplate = (boilerplate: Boilerplate) => {
    const newIds = selectedBoilerplateIds.includes(boilerplate.id!)
      ? selectedBoilerplateIds.filter(id => id !== boilerplate.id)
      : [...selectedBoilerplateIds, boilerplate.id!];
    
    onBoilerplatesChange(newIds);
    
    // Track usage wenn hinzugefügt
    if (!selectedBoilerplateIds.includes(boilerplate.id!)) {
      boilerplatesService.incrementUsage(boilerplate.id!);
    }
  };

  const handleInsertSelected = async () => {
    if (selectedBoilerplates.length === 0) return;
    
    // Kombiniere alle ausgewählten Boilerplates
    const contents: string[] = [];
    
    // Sortiere nach Position
    const byPosition = {
      top: [] as Boilerplate[],
      bottom: [] as Boilerplate[],
      signature: [] as Boilerplate[],
      custom: [] as Boilerplate[]
    };
    
    selectedBoilerplates.forEach(bp => {
      const pos = bp.defaultPosition || 'custom';
      byPosition[pos].push(bp);
    });
    
    // Füge in der richtigen Reihenfolge zusammen
    [...byPosition.top, ...byPosition.custom, ...byPosition.signature, ...byPosition.bottom]
      .forEach(bp => {
        contents.push(bp.content);
      });
    
    const combinedContent = contents.join('\n\n<p>---</p>\n\n');
    
    if (onInsertToEditor) {
      onInsertToEditor(combinedContent, 'cursor');
    }
    
    // Track usage für alle
    await boilerplatesService.incrementUsageMultiple(selectedBoilerplateIds);
    
    setShowModal(false);
  };

  const handleRemoveBoilerplate = (id: string) => {
    onBoilerplatesChange(selectedBoilerplateIds.filter(bpId => bpId !== id));
  };

  const handleReorderBoilerplates = (fromIndex: number, toIndex: number) => {
    const newSelected = [...selectedBoilerplates];
    const [removed] = newSelected.splice(fromIndex, 1);
    newSelected.splice(toIndex, 0, removed);
    
    // Update IDs in neuer Reihenfolge
    const newIds = newSelected.map(bp => bp.id!);
    onBoilerplatesChange(newIds);
  };

  // Render helper für Boilerplate-Gruppe
  const renderBoilerplateGroup = (
    boilerplates: Boilerplate[],
    categoryKey: string,
    categoryLabel: string,
    isClient: boolean = false
  ) => {
    const isExpanded = expandedCategories.has(categoryKey);
    
    return (
      <div key={categoryKey} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCategory(categoryKey)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            <span className="font-medium">{categoryLabel}</span>
            <Badge color="zinc" className="text-xs">{boilerplates.length}</Badge>
          </div>
        </button>
        
        {isExpanded && (
          <div className="divide-y">
            {boilerplates.map(bp => (
              <div key={bp.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                <Checkbox
                  checked={selectedBoilerplateIds.includes(bp.id!)}
                  onChange={() => handleToggleBoilerplate(bp)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {bp.name}
                        {bp.isFavorite && <StarIcon className="h-4 w-4 text-yellow-500" />}
                      </div>
                      {bp.description && (
                        <p className="text-sm text-gray-500 mt-1">{bp.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {bp.isGlobal ? (
                            <>
                              <GlobeAltIcon className="h-3 w-3" />
                              Global
                            </>
                          ) : (
                            <>
                              <BuildingOfficeIcon className="h-3 w-3" />
                              {bp.clientName}
                            </>
                          )}
                        </span>
                        {(bp.usageCount || 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {bp.usageCount}x verwendet
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      plain
                      onClick={() => setPreviewBoilerplate(bp)}
                      className="text-sm"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Ausgewählte Boilerplates Übersicht */}
      {selectedBoilerplates.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-900">
              {selectedBoilerplates.length} Textbaustein{selectedBoilerplates.length !== 1 && 'e'} ausgewählt
            </h4>
            <Button
              plain
              onClick={() => setShowModal(true)}
              className="text-sm text-blue-700 hover:text-blue-600"
            >
              Bearbeiten
            </Button>
          </div>
          <div className="space-y-2">
            {selectedBoilerplates.map((bp, index) => (
              <div key={bp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{index + 1}.</span>
                  <span className="text-sm font-medium">{bp.name}</span>
                  <Badge color={bp.isGlobal ? 'blue' : 'orange'} className="text-xs">
                    {bp.isGlobal ? 'Global' : bp.clientName}
                  </Badge>
                </div>
                <button
                  onClick={() => handleRemoveBoilerplate(bp.id!)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Button zum Öffnen des Modals */}
      {!showModal && (
        <Button
          plain
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <DocumentTextIcon className="h-4 w-4" />
          Textbausteine auswählen
          {selectedBoilerplates.length > 0 && (
            <Badge color="blue">{selectedBoilerplates.length}</Badge>
          )}
        </Button>
      )}

      {/* Auswahl Modal */}
      {showModal && (
        <Dialog open={showModal} onClose={() => setShowModal(false)} size="4xl">
          <DialogTitle>Textbausteine auswählen</DialogTitle>
          <DialogBody>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
                <p className="mt-4">Lade Textbausteine...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Suche */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Textbausteine suchen..."
                    className="pl-9"
                  />
                </div>

                {/* Tabs */}
                <div className="border-b">
                  <nav className="-mb-px flex space-x-6">
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'favorites'
                          ? 'border-[#005fab] text-[#005fab]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <StarIcon className="h-4 w-4 inline mr-1" />
                      Favoriten ({filteredBoilerplates.favorites.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('global')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'global'
                          ? 'border-[#005fab] text-[#005fab]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <GlobeAltIcon className="h-4 w-4 inline mr-1" />
                      Globale
                    </button>
                    {clientId && Object.keys(filteredBoilerplates.client).length > 0 && (
                      <button
                        onClick={() => setActiveTab('client')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'client'
                            ? 'border-[#005fab] text-[#005fab]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                        {clientName || 'Kundenspezifisch'}
                      </button>
                    )}
                  </nav>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {activeTab === 'favorites' && (
                    filteredBoilerplates.favorites.length > 0 ? (
                      <div className="space-y-2">
                        {filteredBoilerplates.favorites.map(bp => (
                          <div key={bp.id} className="p-3 border rounded-lg hover:bg-gray-50 flex items-start gap-3">
                            <Checkbox
                              checked={selectedBoilerplateIds.includes(bp.id!)}
                              onChange={() => handleToggleBoilerplate(bp)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {bp.name}
                                    <StarIcon className="h-4 w-4 text-yellow-500" />
                                  </div>
                                  {bp.description && (
                                    <p className="text-sm text-gray-500 mt-1">{bp.description}</p>
                                  )}
                                </div>
                                <Button
                                  plain
                                  onClick={() => setPreviewBoilerplate(bp)}
                                  className="text-sm"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>Keine Favoriten vorhanden</p>
                      </div>
                    )
                  )}

                  {activeTab === 'global' && (
                    Object.entries(filteredBoilerplates.global).length > 0 ? (
                      Object.entries(filteredBoilerplates.global).map(([category, bps]) =>
                        renderBoilerplateGroup(bps, `global-${category}`, CATEGORY_LABELS[category] || category)
                      )
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <GlobeAltIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>Keine globalen Textbausteine gefunden</p>
                      </div>
                    )
                  )}

                  {activeTab === 'client' && (
                    Object.entries(filteredBoilerplates.client).length > 0 ? (
                      Object.entries(filteredBoilerplates.client).map(([category, bps]) =>
                        renderBoilerplateGroup(bps, `client-${category}`, CATEGORY_LABELS[category] || category, true)
                      )
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BuildingOfficeIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>Keine kundenspezifischen Textbausteine gefunden</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogActions>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                {selectedBoilerplateIds.length} ausgewählt
              </div>
              <div className="flex gap-3">
                <Button plain onClick={() => setShowModal(false)}>
                  Abbrechen
                </Button>
                {onInsertToEditor && (
                  <Button 
                    onClick={handleInsertSelected}
                    disabled={selectedBoilerplateIds.length === 0}
                  >
                    In Editor einfügen
                  </Button>
                )}
                <Button 
                  onClick={() => setShowModal(false)}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white"
                >
                  Fertig
                </Button>
              </div>
            </div>
          </DialogActions>
        </Dialog>
      )}

      {/* Preview Modal */}
      {previewBoilerplate && (
        <BoilerplatePreviewModal
          boilerplate={previewBoilerplate}
          onClose={() => setPreviewBoilerplate(null)}
          onSelect={() => {
            handleToggleBoilerplate(previewBoilerplate);
            setPreviewBoilerplate(null);
          }}
          isSelected={selectedBoilerplateIds.includes(previewBoilerplate.id!)}
        />
      )}
    </div>
  );
}