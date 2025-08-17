// src/components/pr/campaign/SimpleBoilerplateLoader.tsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate } from '@/types/crm-enhanced';
import Link from 'next/link';

// Types für Boilerplate Sections - erweitert für Kompatibilität
export interface BoilerplateSection {
  id: string;
  type: 'boilerplate' | 'lead' | 'main' | 'quote'; // Kompatibilität mit altem System
  boilerplateId?: string;
  boilerplate?: Boilerplate;
  content?: string; // Für nicht-boilerplate Sections
  metadata?: any; // Für quote metadata
  order: number;
  isLocked: boolean;
  isCollapsed: boolean;
  customTitle?: string;
}

interface SimpleBoilerplateLoaderProps {
  organizationId: string;
  clientId?: string;
  clientName?: string;
  onSectionsChange: (sections: BoilerplateSection[]) => void;
  initialSections?: BoilerplateSection[];
}

export default function SimpleBoilerplateLoader({
  organizationId,
  clientId,
  clientName,
  onSectionsChange,
  initialSections = []
}: SimpleBoilerplateLoaderProps) {
  // Filtere nur Boilerplate-Sections aus initialSections
  const [sections, setSections] = useState<BoilerplateSection[]>(
    initialSections.filter(s => s.type === 'boilerplate')
  );
  const [availableBoilerplates, setAvailableBoilerplates] = useState<Boilerplate[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoilerplates();
  }, [clientId]);

  const loadBoilerplates = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading boilerplates for clientId:', clientId, 'organizationId:', organizationId);
      const data = await boilerplatesService.getForCampaignEditor(organizationId, clientId || undefined);
      console.log('📦 Boilerplate data received:', data);
      
      // Sammle alle verfügbaren Boilerplates (global + client-spezifisch)
      let filteredBoilerplates: Boilerplate[] = [];
      
      // Globale Boilerplates
      filteredBoilerplates = [...Object.values(data.global).flat()];
      console.log('🌍 Global boilerplates:', filteredBoilerplates.length);
      
      // Client-spezifische Boilerplates
      if (clientId && data.client) {
        const clientBoilerplates = Object.values(data.client).flat()
          .filter(bp => bp.clientId === clientId);
        console.log('👤 Client boilerplates found:', clientBoilerplates.length);
        filteredBoilerplates = [...filteredBoilerplates, ...clientBoilerplates];
      }
      
      console.log('📋 Total available boilerplates:', filteredBoilerplates.length);
      setAvailableBoilerplates(filteredBoilerplates);
      
      // Lade vollständige Boilerplate-Daten für existierende Sections
      const sectionsWithData = await Promise.all(
        sections.map(async (section) => {
          if (!section.boilerplate && section.boilerplateId) {
            try {
              const bp = await boilerplatesService.getById(section.boilerplateId);
              return { ...section, boilerplate: bp || undefined };
            } catch (error) {
              return section;
            }
          }
          return section;
        })
      );
      
      setSections(sectionsWithData);
      onSectionsChange(sectionsWithData);
    } catch (error) {
      console.error('Fehler beim Laden der Textbausteine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoilerplate = (boilerplate: Boilerplate) => {
    const newSection: BoilerplateSection = {
      id: `section-${Date.now()}`,
      type: 'boilerplate',
      boilerplateId: boilerplate.id!,
      boilerplate: boilerplate,
      order: sections.length,
      isLocked: false,
      isCollapsed: false
    };
    
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    onSectionsChange(updatedSections);
    setShowSelector(false);
  };

  const handleRemoveSection = (id: string) => {
    const updatedSections = sections
      .filter(s => s.id !== id)
      .map((s, index) => ({ ...s, order: index }));
    setSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const handleToggleLock = (id: string) => {
    const updatedSections = sections.map(s => 
      s.id === id ? { ...s, isLocked: !s.isLocked } : s
    );
    setSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const handleToggleCollapse = (id: string) => {
    const updatedSections = sections.map(s => 
      s.id === id ? { ...s, isCollapsed: !s.isCollapsed } : s
    );
    setSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'unternehmen': return '🏢';
      case 'kontakt': return '📧';
      case 'rechtliches': return '⚖️';
      case 'produkt': return '📦';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header mit Add Button und Link */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Textbausteine</h3>
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard/pr-tools/boilerplates"
            target="_blank"
            className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Verwalten
          </Link>
          <Button
            type="button"
            onClick={() => setShowSelector(!showSelector)}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white text-sm px-3 py-1.5"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Textbaustein
          </Button>
        </div>
      </div>

      {/* Boilerplate Selector */}
      {showSelector && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              Textbaustein auswählen
              {clientName && (
                <span className="ml-2 text-xs text-gray-500">
                  (Global + {clientName})
                </span>
              )}
            </h4>
            <button
              onClick={() => setShowSelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto mb-2"></div>
              Lade Textbausteine...
            </div>
          ) : availableBoilerplates.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {availableBoilerplates.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => handleAddBoilerplate(bp)}
                  className="text-left p-3 rounded-lg border border-gray-200 hover:border-[#005fab] hover:bg-[#005fab]/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{getCategoryIcon(bp.category)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{bp.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {bp.clientId ? (
                          <Badge color="blue" className="text-xs">Kunde</Badge>
                        ) : (
                          <Badge color="zinc" className="text-xs">Global</Badge>
                        )}
                        {bp.category && (
                          <span className="ml-2 capitalize">{bp.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Keine Textbausteine verfügbar</p>
              {!clientId && (
                <p className="text-xs mt-2">Wählen Sie einen Kunden aus, um kundenspezifische Bausteine zu sehen</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sections List mit Drag & Drop */}
      {sections.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="boilerplate-sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {sections.map((section, index) => (
                  <Draggable 
                    key={section.id} 
                    draggableId={section.id} 
                    index={index}
                    isDragDisabled={section.isLocked}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`
                          bg-white border rounded-lg p-3
                          ${snapshot.isDragging ? 'shadow-lg border-[#005fab]' : 'border-gray-200'}
                          ${section.isLocked ? 'opacity-75' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          {!section.isLocked && (
                            <div 
                              {...provided.dragHandleProps}
                              className="mt-1 cursor-move text-gray-400 hover:text-gray-600"
                            >
                              <ArrowsUpDownIcon className="h-4 w-4" />
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <button
                                onClick={() => handleToggleCollapse(section.id)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {section.isCollapsed ? (
                                  <ChevronRightIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>
                              <span className="font-medium text-sm text-gray-900">
                                {section.boilerplate?.title || 'Textbaustein'}
                              </span>
                              {section.boilerplate?.clientId ? (
                                <Badge color="blue" className="text-xs">Kunde</Badge>
                              ) : (
                                <Badge color="zinc" className="text-xs">Global</Badge>
                              )}
                            </div>
                            
                            {!section.isCollapsed && section.boilerplate && (
                              <div 
                                className="ml-6 prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: section.boilerplate.content }}
                              />
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleLock(section.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title={section.isLocked ? 'Entsperren' : 'Sperren'}
                            >
                              {section.isLocked ? (
                                <LockClosedIcon className="h-4 w-4" />
                              ) : (
                                <LockOpenIcon className="h-4 w-4" />
                              )}
                            </button>
                            {!section.isLocked && (
                              <button
                                onClick={() => handleRemoveSection(section.id)}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Entfernen"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-12"
          onClick={() => setShowSelector(true)}
        >
          <div className="flex flex-col items-center justify-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 group-hover:text-[#005fab] mb-3" />
            <p className="text-gray-600 group-hover:text-[#005fab] font-medium">Textbausteine hinzufügen</p>
            <p className="text-sm text-gray-500 mt-1">Klicken zum Auswählen</p>
          </div>
        </div>
      )}
    </div>
  );
}