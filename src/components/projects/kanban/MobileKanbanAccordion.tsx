// src/components/projects/kanban/MobileKanbanAccordion.tsx - Mobile Accordion für Plan 10/9
'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Project, PipelineStage } from '@/types/project';
import { getStageColor, getStageConfig } from './kanban-constants';
import { ProjectCard } from './ProjectCard';

// ========================================
// INTERFACES
// ========================================

export interface AccordionSection {
  stage: PipelineStage;
  title: string;
  count: number;
  projects: Project[];
}

export interface MobileKanbanAccordionProps {
  sections: AccordionSection[];
  onProjectMove: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectSelect?: (projectId: string) => void;
  loading: boolean;
}

// ========================================
// MOBILE KANBAN ACCORDION KOMPONENTE
// ========================================

export const MobileKanbanAccordion: React.FC<MobileKanbanAccordionProps> = ({
  sections,
  onProjectMove,
  onProjectSelect,
  loading
}) => {
  // Expanded Sections State
  const [expandedSections, setExpandedSections] = useState<Set<PipelineStage>>(
    new Set(['ideas_planning', 'creation', 'internal_approval']) // Default expanded
  );

  // Toggle Section
  const toggleSection = (stage: PipelineStage) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedSections(newExpanded);
  };

  // Expand All / Collapse All
  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.stage)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Simple Drag & Drop für Mobile (ohne React-DnD)
  const useMobileDragAndDrop = (project: Project) => {
    return {
      isDragging: false,
      drag: (ref: any) => ref // No-op für Mobile
    };
  };

  return (
    <div className="mobile-kanban-accordion p-4 space-y-4">
      {/* Expand/Collapse Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Projekt-Stages</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Alle zuklappen
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
          >
            Alle öffnen
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.stage);
        const stageColors = getStageColor(section.stage);
        const stageConfig = getStageConfig(section.stage);

        return (
          <div
            key={section.stage}
            className={`accordion-section border-2 rounded-lg ${stageColors.border} ${stageColors.bg}`}
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.stage)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left ${stageColors.header} rounded-t-lg hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDownIcon className={`h-4 w-4 ${stageColors.text}`} />
                  ) : (
                    <ChevronRightIcon className={`h-4 w-4 ${stageColors.text}`} />
                  )}
                  <h3 className={`font-semibold ${stageColors.text}`}>
                    {section.title}
                  </h3>
                </div>
                
                {/* Project Count Badge */}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${stageColors.count}`}>
                  {section.count}
                </span>
              </div>

              {/* Stage Progress Indicator */}
              {section.projects.length > 0 && (
                <div className="flex items-center space-x-2">
                  {/* Progress Dots */}
                  <div className="flex space-x-1">
                    {section.projects.slice(0, 3).map((project, index) => {
                      const projectPriority = (project as any).priority;
                      const dotColor = 
                        projectPriority === 'urgent' ? 'bg-red-400' :
                        projectPriority === 'high' ? 'bg-orange-400' :
                        projectPriority === 'medium' ? 'bg-yellow-400' :
                        'bg-blue-400';
                      
                      return (
                        <div
                          key={project.id || index}
                          className={`h-2 w-2 rounded-full ${dotColor}`}
                          title={project.title}
                        />
                      );
                    })}
                    {section.projects.length > 3 && (
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                    )}
                  </div>
                </div>
              )}
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className={`section-content px-4 pb-4`}>
                {loading && section.projects.length === 0 ? (
                  // Loading State
                  <div className="space-y-3 mt-3">
                    {[1, 2].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-white bg-opacity-50 rounded-lg h-20"></div>
                      </div>
                    ))}
                  </div>
                ) : section.projects.length === 0 ? (
                  // Empty State
                  <div className={`text-center py-6 ${stageColors.text} opacity-60`}>
                    <div className="text-lg mb-1">📋</div>
                    <p className="text-sm">Keine Projekte in {section.title}</p>
                    <p className="text-xs mt-1">
                      Projekte hierhin verschieben oder neue erstellen
                    </p>
                  </div>
                ) : (
                  // Projects List
                  <div className="space-y-3 mt-3">
                    {section.projects.map(project => (
                      <div key={project.id} className="relative">
                        <ProjectCard
                          project={project}
                          onSelect={onProjectSelect}
                          useDraggableProject={useMobileDragAndDrop}
                        />
                        
                        {/* Mobile Move Actions */}
                        <div className="mt-2 flex space-x-2 overflow-x-auto pb-2">
                          {getValidMoveTargets(section.stage).map(targetStage => (
                            <button
                              key={targetStage}
                              onClick={() => onProjectMove(project.id!, targetStage)}
                              className={`
                                flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full border-2
                                ${getStageColor(targetStage).border} ${getStageColor(targetStage).bg} ${getStageColor(targetStage).text}
                                hover:opacity-80 transition-opacity
                              `}
                            >
                              → {getStageConfig(targetStage).shortName}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section Footer */}
                {section.projects.length > 0 && (
                  <div className={`mt-4 pt-3 border-t ${stageColors.border} text-xs ${stageColors.text} opacity-75`}>
                    <div className="text-center">
                      <span>
                        {section.projects.length === 1 ? '1 Projekt' : `${section.projects.length} Projekte`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Mobile Swipe Hint */}
      <div className="text-center py-4 text-xs text-gray-500">
        💡 Tipp: Tippe auf Stage-Namen um sie zu öffnen/schließen
      </div>
    </div>
  );
};

// ========================================
// HELPER FUNCTIONS
// ========================================

const getValidMoveTargets = (currentStage: PipelineStage): PipelineStage[] => {
  const validTransitions: Record<PipelineStage, PipelineStage[]> = {
    'ideas_planning': ['creation'],
    'creation': ['ideas_planning', 'internal_approval'],
    'internal_approval': ['creation', 'customer_approval'],
    'customer_approval': ['internal_approval', 'distribution'],
    'distribution': ['customer_approval', 'monitoring'],
    'monitoring': ['distribution', 'completed'],
    'completed': ['monitoring']
  };

  return validTransitions[currentStage] || [];
};

export default MobileKanbanAccordion;