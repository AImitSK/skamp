// src/components/pr/campaign/IntelligentBoilerplateSection.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
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
  LockOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  NewspaperIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  StarIcon
} from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate } from '@/types/crm-enhanced';
import clsx from 'clsx';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Input } from '@/components/input';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';

// Vereinfachte Types ohne position
export interface BoilerplateSection {
  id: string;
  type: 'boilerplate' | 'lead' | 'main' | 'quote';
  boilerplateId?: string;
  boilerplate?: Boilerplate;
  content?: string;
  metadata?: {
    person?: string;
    role?: string;
    company?: string;
  };
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
  onStructuredContentFromAI?: (callback: (structured: {
    leadParagraph: string;
    bodyParagraphs: string[];
    quote?: {
      text: string;
      person: string;
      role: string;
      company: string;
    };
  }) => void) => void;
}

// Inline Editor Component
function InlineEditor({
  type,
  onSave,
  onCancel,
  initialContent = '',
  initialMetadata
}: {
  type: 'lead' | 'main' | 'quote';
  onSave: (content: string, metadata?: any) => void;
  onCancel: () => void;
  initialContent?: string;
  initialMetadata?: any;
}) {
  const [content, setContent] = useState(initialContent);
  const [metadata, setMetadata] = useState(initialMetadata || {
    person: '',
    role: '',
    company: ''
  });

  const getPlaceholder = () => {
    switch (type) {
      case 'lead':
        return 'Schreibe hier deinen Lead-Absatz. Beantworte die 5 W-Fragen (Wer, Was, Wann, Wo, Warum) in 40-50 Wörtern...';
      case 'main':
        return 'Schreibe hier den Haupttext deiner Pressemitteilung. Füge Details, Hintergründe und weitere Informationen hinzu...';
      case 'quote':
        return 'Gib hier das Zitat ein...';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'lead': return 'Lead-Absatz erstellen';
      case 'main': return 'Haupttext erstellen';
      case 'quote': return 'Zitat hinzufügen';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'lead': return <NewspaperIcon className="h-5 w-5" />;
      case 'main': return <DocumentDuplicateIcon className="h-5 w-5" />;
      case 'quote': return <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {getIcon()}
        <h4 className="font-semibold text-gray-900">{getTitle()}</h4>
      </div>

      {type === 'quote' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zitat</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
              <input
                type="text"
                value={metadata.person}
                onChange={(e) => setMetadata({...metadata, person: e.target.value})}
                placeholder="Max Mustermann"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={metadata.role}
                onChange={(e) => setMetadata({...metadata, role: e.target.value})}
                placeholder="CEO"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unternehmen</label>
              <input
                type="text"
                value={metadata.company}
                onChange={(e) => setMetadata({...metadata, company: e.target.value})}
                placeholder="Beispiel GmbH"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
          <RichTextEditor
            content={content}
            onChange={setContent}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" plain onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          type="button"
          onClick={() => onSave(content, type === 'quote' ? metadata : undefined)}
          disabled={!content.trim()}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

export default function IntelligentBoilerplateSection({
  userId,
  clientId,
  clientName,
  onContentChange,
  initialSections = [],
  onStructuredContentFromAI
}: IntelligentBoilerplateSectionProps) {
  const [sections, setSections] = useState<BoilerplateSection[]>(initialSections);
  const [availableBoilerplates, setAvailableBoilerplates] = useState<Boilerplate[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState<{ type: 'lead' | 'main' | 'quote'; editId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showElementDropdown, setShowElementDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Schließe Dropdown bei Klick außerhalb
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowElementDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadBoilerplates();
  }, [clientId]);

  const loadBoilerplates = async () => {
    setLoading(true);
    try {
      const data = await boilerplatesService.getForCampaignEditor(userId, clientId);
      
      // Filtere Boilerplates basierend auf clientId
      let filteredBoilerplates: Boilerplate[] = [];
      
      // Füge alle globalen Boilerplates hinzu
      filteredBoilerplates = [...Object.values(data.global).flat()];
      
      // Füge nur die client-spezifischen Boilerplates hinzu, die zum aktuellen clientId passen
      if (clientId && data.client) {
        const clientBoilerplates = Object.values(data.client).flat()
          .filter(bp => bp.clientId === clientId);
        filteredBoilerplates = [...filteredBoilerplates, ...clientBoilerplates];
      }
      
      setAvailableBoilerplates(filteredBoilerplates);
      
      // Load full boilerplate data for existing sections
      const sectionsWithData = await Promise.all(
        sections.map(async (section) => {
          if (section.type === 'boilerplate' && !section.boilerplate && section.boilerplateId) {
            try {
              const bp = await boilerplatesService.getById(section.boilerplateId);
              return { ...section, boilerplate: bp || undefined };
            } catch (error) {
              console.error(`Failed to load boilerplate ${section.boilerplateId}:`, error);
              return section;
            }
          }
          return section;
        })
      );
      
      // Update sections only if there are changes
      const hasChanges = sectionsWithData.some((newSection, index) => 
        newSection.boilerplate && !sections[index].boilerplate
      );
      
      if (hasChanges) {
        setSections(sectionsWithData);
        onContentChange(sectionsWithData);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Boilerplates:', error);
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
    onContentChange(updatedSections);
    setShowSelector(false);
  };

  const handleAddStructuredElement = (type: 'lead' | 'main' | 'quote', content: string, metadata?: any) => {
    const editId = showInlineEditor?.editId;
    
    if (editId) {
      // Edit existing element
      const updatedSections = sections.map(section => {
        if (section.id === editId) {
          return {
            ...section,
            content: type === 'lead' ? `<p><strong>${content}</strong></p>` : content,
            metadata: type === 'quote' ? metadata : section.metadata
          };
        }
        return section;
      });
      
      setSections(updatedSections);
      onContentChange(updatedSections);
    } else {
      // Add new element
      const newSection: BoilerplateSection = {
        id: `section-${Date.now()}`,
        type: type,
        content: type === 'lead' ? `<p><strong>${content}</strong></p>` : content,
        metadata: metadata,
        order: sections.length,
        isLocked: false,
        isCollapsed: false,
        customTitle: type === 'lead' ? 'Lead-Absatz' : type === 'main' ? 'Haupttext' : 'Zitat'
      };
      
      const updatedSections = [...sections, newSection];
      setSections(updatedSections);
      onContentChange(updatedSections);
    }
    
    setShowInlineEditor(null);
  };

  const handleRemoveSection = (sectionId: string) => {
    const updatedSections = sections
      .filter(s => s.id !== sectionId)
      .map((section, index) => ({ ...section, order: index }));
    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  const handleEditStructuredElement = (sectionId: string) => {
    const section = sections.find((s: BoilerplateSection) => s.id === sectionId);
    if (section && ['lead', 'main', 'quote'].includes(section.type)) {
      setShowInlineEditor({ 
        type: section.type as 'lead' | 'main' | 'quote',
        editId: sectionId 
      });
    }
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

    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  // Funktion zum Hinzufügen strukturierter Elemente aus KI-Response
  const addStructuredElementsFromAI = (structured: {
    leadParagraph: string;
    bodyParagraphs: string[];
    quote?: {
      text: string;
      person: string;
      role: string;
      company: string;
    };
  }) => {
    const newSections: BoilerplateSection[] = [];
    let order = sections.length;
    
    // Lead
    if (structured.leadParagraph) {
      newSections.push({
        id: `ai-lead-${Date.now()}`,
        type: 'lead',
        content: `<p><strong>${structured.leadParagraph}</strong></p>`,
        order: order++,
        isLocked: false,
        isCollapsed: false,
        customTitle: 'Lead-Absatz (KI-generiert)'
      });
    }
    
    // Haupttext
    if (structured.bodyParagraphs && structured.bodyParagraphs.length > 0) {
      const mainContent = structured.bodyParagraphs
        .map(p => `<p>${p}</p>`)
        .join('\n\n');
      
      newSections.push({
        id: `ai-main-${Date.now() + 1}`,
        type: 'main',
        content: mainContent,
        order: order++,
        isLocked: false,
        isCollapsed: false,
        customTitle: 'Haupttext (KI-generiert)'
      });
    }
    
    // Zitat
    if (structured.quote && structured.quote.text) {
      newSections.push({
        id: `ai-quote-${Date.now() + 2}`,
        type: 'quote',
        content: structured.quote.text,
        metadata: {
          person: structured.quote.person,
          role: structured.quote.role,
          company: structured.quote.company
        },
        order: order++,
        isLocked: false,
        isCollapsed: false,
        customTitle: 'Zitat (KI-generiert)'
      });
    }
    
    const updatedSections = [...sections, ...newSections];
    setSections(updatedSections);
    onContentChange(updatedSections);
  };

  // Expose function for parent components
  useEffect(() => {
    if (onStructuredContentFromAI) {
      onStructuredContentFromAI(addStructuredElementsFromAI);
    }
  }, [onStructuredContentFromAI, sections]);

  const renderStructuredContent = (section: BoilerplateSection) => {
    if (!section.content) return null;
    
    if (section.type === 'quote' && section.metadata) {
      return (
        <div className={clsx(
          "transition-all duration-200",
          section.isCollapsed && "max-h-0 overflow-hidden",
          !section.isCollapsed && "max-h-none"
        )}>
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <blockquote className="italic text-gray-800">
              "{section.content}"
            </blockquote>
            <p className="text-sm text-gray-600 mt-2">
              — {section.metadata.person}
              {section.metadata.role && `, ${section.metadata.role}`}
              {section.metadata.company && ` bei ${section.metadata.company}`}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className={clsx(
        "transition-all duration-200",
        section.isCollapsed && "max-h-0 overflow-hidden",
        !section.isCollapsed && "max-h-none"
      )}>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      </div>
    );
  };

  const renderBoilerplateContent = (section: BoilerplateSection) => {
    if (section.type !== 'boilerplate' || !section.boilerplate) return null;
    
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

  const getTypeIcon = (type: BoilerplateSection['type']) => {
    switch (type) {
      case 'lead': return '📰';
      case 'main': return '📄';
      case 'quote': return '💬';
      case 'boilerplate': return '🔧';
    }
  };

  const getTypeBadgeColor = (type: BoilerplateSection['type']) => {
    switch (type) {
      case 'lead': return 'yellow';
      case 'main': return 'zinc';
      case 'quote': return 'blue';
      case 'boilerplate': return 'purple';
    }
  };

  const getTypeLabel = (type: BoilerplateSection['type']) => {
    switch (type) {
      case 'lead': return 'Lead';
      case 'main': return 'Haupttext';
      case 'quote': return 'Zitat';
      case 'boilerplate': return 'Baustein';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
          Textbausteine & Elemente
        </h3>
        <div className="flex gap-2">
          {/* Dropdown für strukturierte Elemente */}
          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              plain
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setShowElementDropdown(!showElementDropdown);
              }}
              className="text-sm whitespace-nowrap"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Element erstellen
              <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${showElementDropdown ? 'rotate-180' : ''}`} />
            </Button>
            {showElementDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInlineEditor({ type: 'lead' });
                    setShowElementDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <NewspaperIcon className="h-4 w-4 inline mr-2" />
                  Lead-Absatz
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInlineEditor({ type: 'main' });
                    setShowElementDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 inline mr-2" />
                  Haupttext
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInlineEditor({ type: 'quote' });
                    setShowElementDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4 inline mr-2" />
                  Zitat
                </button>
              </div>
            )}
          </div>

          <Button
            type="button"
            plain
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setShowSelector(true);
            }}
            className="text-sm whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Baustein hinzufügen
          </Button>
        </div>
      </div>

      {/* Inline Editor */}
      {showInlineEditor && (
        <InlineEditor
          type={showInlineEditor.type}
          onSave={(content, metadata) => handleAddStructuredElement(showInlineEditor.type, content, metadata)}
          onCancel={() => setShowInlineEditor(null)}
          initialContent={
            showInlineEditor.editId 
              ? sections.find(s => s.id === showInlineEditor.editId)?.content?.replace(/<\/?p>|<\/?strong>/g, '') || ''
              : ''
          }
          initialMetadata={
            showInlineEditor.editId 
              ? sections.find(s => s.id === showInlineEditor.editId)?.metadata
              : undefined
          }
        />
      )}

      {/* Sections List */}
      {sections.length === 0 && !showInlineEditor ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Keine Textbausteine oder Elemente hinzugefügt</p>
          <p className="text-sm text-gray-500 mt-1">
            Erstelle strukturierte Elemente oder füge wiederverwendbare Textbausteine hinzu
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button
              type="button"
              onClick={() => setShowInlineEditor({ type: 'lead' })}
              className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap"
            >
              Lead erstellen
            </Button>
            <Button
              type="button"
              onClick={() => setShowSelector(true)}
              className="whitespace-nowrap"
            >
              Baustein hinzufügen
            </Button>
          </div>
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
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleToggleCollapse(section.id);
                              }}
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
                                <span className="text-lg">{getTypeIcon(section.type)}</span>
                                <h4 className="font-medium text-gray-900">
                                  {section.customTitle || section.boilerplate?.name || 
                                   (section.type === 'lead' ? 'Lead-Absatz' : 
                                    section.type === 'main' ? 'Haupttext' : 
                                    section.type === 'quote' ? 'Zitat' : 'Element')}
                                </h4>
                                <Badge color={getTypeBadgeColor(section.type)} className="text-xs whitespace-nowrap">
                                  {getTypeLabel(section.type)}
                                </Badge>
                                {section.type === 'boilerplate' && section.boilerplate?.isGlobal ? (
                                  <Badge color="blue" className="text-xs whitespace-nowrap">Global</Badge>
                                ) : section.type === 'boilerplate' && clientName ? (
                                  <Badge color="orange" className="text-xs whitespace-nowrap">{clientName}</Badge>
                                ) : null}
                              </div>
                              {section.type === 'boilerplate' && section.boilerplate?.description && !section.isCollapsed && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {section.boilerplate.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {/* Edit Button für strukturierte Elemente */}
                            {['lead', 'main', 'quote'].includes(section.type) && (
                              <button
                                type="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleEditStructuredElement(section.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                title="Bearbeiten"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleToggleLock(section.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                              title={section.isLocked ? "Entsperren" : "Sperren"}
                            >
                              {section.isLocked ? 
                                <LockClosedIcon className="h-4 w-4" /> : 
                                <LockOpenIcon className="h-4 w-4" />
                              }
                            </button>
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleRemoveSection(section.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                              title="Entfernen"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        {section.type === 'boilerplate' ? renderBoilerplateContent(section) : renderStructuredContent(section)}
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

      {/* Boilerplate Selector Modal */}
      {showSelector && (
        <BoilerplateSelectorModal
          availableBoilerplates={availableBoilerplates}
          onSelect={handleAddBoilerplate}
          onClose={() => setShowSelector(false)}
          existingSectionIds={sections.filter(s => s.type === 'boilerplate').map(s => s.boilerplateId!)}
        />
      )}
    </div>
  );
}

// Vereinfachter Boilerplate Selector Modal
function BoilerplateSelectorModal({
  availableBoilerplates,
  onSelect,
  onClose,
  existingSectionIds
}: {
  availableBoilerplates: Boilerplate[];
  onSelect: (boilerplate: Boilerplate) => void;
  onClose: () => void;
  existingSectionIds: string[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
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
    
    const notAlreadyAdded = !existingSectionIds.includes(bp.id!);
    
    return matchesSearch && matchesCategory && notAlreadyAdded;
  });

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <DialogTitle className="px-6 py-4">Textbaustein hinzufügen</DialogTitle>
      <DialogBody className="px-6 pb-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Textbausteine suchen..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Boilerplate List */}
        <div className="max-h-96 overflow-y-auto">
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
                  onClick={() => onSelect(boilerplate)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{boilerplate.name}</h4>
                        {boilerplate.isFavorite && (
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
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
                        {(boilerplate as any).language && (
                          <Badge color="purple" className="text-xs">
                            {(boilerplate as any).language.toUpperCase()}
                          </Badge>
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
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          Abbrechen
        </Button>
      </DialogActions>
    </Dialog>
  );
}