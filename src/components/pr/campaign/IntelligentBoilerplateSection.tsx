// src/components/pr/campaign/IntelligentBoilerplateSection.tsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate } from '@/types/crm';
import clsx from 'clsx';

// Types
export interface BoilerplateSection {
  id: string;
  boilerplateId: string;
  boilerplate?: Boilerplate;
  position: 'header' | 'footer' | 'custom';
  order: number;
  isLocked: boolean;
  isCollapsed: boolean;
  customTitle?: string;
}

interface IntelligentBoilerplateSectionProps {
  userId: string;
  clientId?: string;
  clientName?: string;
  onContentChange: (sections: BoilerplateSection[]) => void;
  initialSections?: BoilerplateSection[];
}

export default function IntelligentBoilerplateSection({
  userId,
  clientId,
  clientName,
  onContentChange,
  initialSections = []
}: IntelligentBoilerplateSectionProps) {
  const [sections, setSections] = useState<BoilerplateSection[]>(initialSections);
  const [availableBoilerplates, setAvailableBoilerplates] = useState<Boilerplate[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<'header' | 'footer' | 'custom'>('footer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoilerplates();
  }, [clientId]);

  const loadBoilerplates = async () => {
    setLoading(true);
    try {
      const data = await boilerplatesService.getForCampaignEditor(userId, clientId);
      const allBoilerplates = [
        ...Object.values(data.global).flat(),
        ...Object.values(data.client).flat()
      ];
      setAvailableBoilerplates(allBoilerplates);
      
      // Load full boilerplate data for existing sections
      const sectionsWithData = await Promise.all(
        sections.map(async (section) => {
          if (!section.boilerplate && section.boilerplateId) {
            const bp = await boilerplatesService.getById(section.boilerplateId);
            return { ...section, boilerplate: bp || undefined };
          }
          return section;
        })
      );
      setSections(sectionsWithData);
    } catch (error) {
      console.error('Fehler beim Laden der Boilerplates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoilerplate = (boilerplate: Boilerplate, position: 'header' | 'footer' | 'custom') => {
    const newSection: BoilerplateSection = {
      id: `section-${Date.now()}`,
      boilerplateId: boilerplate.id!,
      boilerplate: boilerplate,
      position: position,
      order: sections.filter(s => s.position === position).length,
      isLocked: false,
      isCollapsed: false
    };
    
    const updatedSections = [...sections, newSection].sort((a, b) => {
      // Sort by position first, then by order
      const positionOrder = { header: 0, custom: 1, footer: 2 };
      if (a.position !== b.position) {
        return positionOrder[a.position] - positionOrder[b.position];
      }
      return a.order - b.order;
    });
    
    setSections(updatedSections);
    onContentChange(updatedSections);
    setShowSelector(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  const handleToggleCollapse = (sectionId: string) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s
    );
    setSections(updatedSections);
  };

  const handleToggleLock = (sectionId: string) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, isLocked: !s.isLocked } : s
    );
    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  const renderBoilerplateContent = (section: BoilerplateSection) => {
    if (!section.boilerplate) return null;
    
    return (
      <div className={clsx(
        "transition-all duration-200",
        section.isCollapsed && "max-h-0 overflow-hidden",
        !section.isCollapsed && "max-h-none"
      )}>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: section.boilerplate.content }}
          />
        </div>
      </div>
    );
  };

  const getPositionLabel = (position: 'header' | 'footer' | 'custom') => {
    switch (position) {
      case 'header': return 'Kopfbereich';
      case 'footer': return 'Fußbereich';
      case 'custom': return 'Hauptinhalt';
    }
  };

  const getPositionIcon = (position: 'header' | 'footer' | 'custom') => {
    switch (position) {
      case 'header': return '🔝';
      case 'footer': return '🔚';
      case 'custom': return '📄';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
          Textbausteine
        </h3>
        <Button
          plain
          onClick={() => setShowSelector(true)}
          className="text-sm"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Baustein hinzufügen
        </Button>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Keine Textbausteine hinzugefügt</p>
          <p className="text-sm text-gray-500 mt-1">
            Füge wiederverwendbare Textblöcke wie Unternehmensbeschreibungen oder Kontaktinfos hinzu
          </p>
          <Button
            onClick={() => setShowSelector(true)}
            className="mt-4"
          >
            Ersten Baustein hinzufügen
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="boilerplate-sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
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
                        className={clsx(
                          "bg-white border rounded-lg transition-all",
                          snapshot.isDragging && "shadow-lg ring-2 ring-indigo-500",
                          section.isLocked && "opacity-75"
                        )}
                      >
                        {/* Section Header */}
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className={clsx(
                                "cursor-move",
                                section.isLocked && "cursor-not-allowed opacity-50"
                              )}
                            >
                              <ArrowsUpDownIcon className="h-5 w-5 text-gray-400" />
                            </div>

                            {/* Expand/Collapse */}
                            <button
                              onClick={() => handleToggleCollapse(section.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {section.isCollapsed ? 
                                <ChevronRightIcon className="h-5 w-5" /> : 
                                <ChevronDownIcon className="h-5 w-5" />
                              }
                            </button>

                            {/* Title & Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getPositionIcon(section.position)}</span>
                                <h4 className="font-medium text-gray-900">
                                  {section.customTitle || section.boilerplate?.name}
                                </h4>
                                <Badge color="zinc" className="text-xs">
                                  {getPositionLabel(section.position)}
                                </Badge>
                                {section.boilerplate?.isGlobal ? (
                                  <Badge color="blue" className="text-xs">Global</Badge>
                                ) : (
                                  <Badge color="orange" className="text-xs">{clientName}</Badge>
                                )}
                              </div>
                              {section.boilerplate?.description && !section.isCollapsed && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {section.boilerplate.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleLock(section.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                              title={section.isLocked ? "Entsperren" : "Sperren"}
                            >
                              {section.isLocked ? 
                                <LockClosedIcon className="h-4 w-4" /> : 
                                <LockOpenIcon className="h-4 w-4" />
                              }
                            </button>
                            <button
                              onClick={() => handleRemoveSection(section.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                              title="Entfernen"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        {renderBoilerplateContent(section)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Quick Add Buttons */}
      {sections.length > 0 && (
        <div className="flex gap-2 justify-center pt-2">
          <Button
            plain
            onClick={() => {
              setSelectedPosition('header');
              setShowSelector(true);
            }}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Kopfbereich
          </Button>
          <Button
            plain
            onClick={() => {
              setSelectedPosition('custom');
              setShowSelector(true);
            }}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Hauptinhalt
          </Button>
          <Button
            plain
            onClick={() => {
              setSelectedPosition('footer');
              setShowSelector(true);
            }}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Fußbereich
          </Button>
        </div>
      )}

      {/* Boilerplate Selector Modal */}
      {showSelector && (
        <BoilerplateSelectorModal
          availableBoilerplates={availableBoilerplates}
          selectedPosition={selectedPosition}
          onSelect={handleAddBoilerplate}
          onClose={() => setShowSelector(false)}
          existingSectionIds={sections.map(s => s.boilerplateId)}
        />
      )}
    </div>
  );
}

// Boilerplate Selector Modal Component
function BoilerplateSelectorModal({
  availableBoilerplates,
  selectedPosition,
  onSelect,
  onClose,
  existingSectionIds
}: {
  availableBoilerplates: Boilerplate[];
  selectedPosition: 'header' | 'footer' | 'custom';
  onSelect: (boilerplate: Boilerplate, position: 'header' | 'footer' | 'custom') => void;
  onClose: () => void;
  existingSectionIds: string[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState(selectedPosition);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Alle Kategorien' },
    { id: 'company', label: 'Unternehmensbeschreibung' },
    { id: 'contact', label: 'Kontaktinformationen' },
    { id: 'legal', label: 'Rechtliche Hinweise' },
    { id: 'product', label: 'Produktbeschreibung' },
    { id: 'custom', label: 'Sonstige' }
  ];

  const filteredBoilerplates = availableBoilerplates.filter(bp => {
    const matchesSearch = searchTerm === '' || 
      bp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || bp.category === selectedCategory;
    
    // Filter out already added boilerplates
    const notAlreadyAdded = !existingSectionIds.includes(bp.id!);
    
    return matchesSearch && matchesCategory && notAlreadyAdded;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Textbaustein hinzufügen</h3>
          
          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Position Selector */}
            <div className="flex gap-2">
              {(['header', 'custom', 'footer'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    position === pos 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {pos === 'header' && '🔝 Kopfbereich'}
                  {pos === 'custom' && '📄 Hauptinhalt'}
                  {pos === 'footer' && '🔚 Fußbereich'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Boilerplate List */}
        <div className="overflow-y-auto max-h-[50vh] p-6">
          {filteredBoilerplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Keine passenden Textbausteine gefunden</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredBoilerplates.map(boilerplate => (
                <div
                  key={boilerplate.id}
                  className="border rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                  onClick={() => onSelect(boilerplate, position)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{boilerplate.name}</h4>
                      {boilerplate.description && (
                        <p className="text-sm text-gray-600 mt-1">{boilerplate.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge color="zinc" className="text-xs">{boilerplate.category}</Badge>
                        {boilerplate.isGlobal ? (
                          <Badge color="blue" className="text-xs">Global</Badge>
                        ) : (
                          <Badge color="orange" className="text-xs">{boilerplate.clientName}</Badge>
                        )}
                      </div>
                    </div>
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t flex justify-end">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}