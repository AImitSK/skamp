// src/components/projects/ProjectSelector.tsx - Projekt-Auswahl-Komponente
"use client";

import { useState, useEffect } from 'react';
import { Text } from "@/components/ui/text";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LinkIcon } from "@heroicons/react/24/outline";
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, project: Project) => void;
  organizationId: string;
  clientId?: string; // ✅ Plan 2/9: Client-Filter Support
}

export const ProjectSelector = ({
  selectedProjectId,
  onProjectSelect,
  organizationId,
  clientId
}: ProjectSelectorProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSelectedId, setCurrentSelectedId] = useState(selectedProjectId);

  // Sync internal state with prop
  useEffect(() => {
    setCurrentSelectedId(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    loadActiveProjects();
  }, [organizationId, clientId]);

  const loadActiveProjects = async () => {
    try {
      setLoading(true);
      
      let projects: Project[] = [];
      
      if (clientId) {
        // ✅ Plan 2/9: Lade Projekte für spezifischen Kunden
        projects = await projectService.getProjectsByClient(organizationId, clientId);
      } else {
        // ✅ Plan 2/9: Lade alle aktiven Projekte
        projects = await projectService.getActiveProjects(organizationId);
      }
      
      setProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-gray-500" />
        <Text className="font-medium">Projekt-Verknüpfung (optional)</Text>
      </div>
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <select
          value={currentSelectedId || ''}
          onChange={(e) => {
            const value = e.target.value;
            setCurrentSelectedId(value);

            if (value) {
              const project = projects.find(p => p.id === value);
              if (project) {
                onProjectSelect(value, project);
              }
            } else {
              // Kein Projekt ausgewählt - mit leerem Projekt aufrufen
              onProjectSelect('', {} as Project);
            }
          }}
          className="block w-full rounded-lg border border-zinc-950/10 bg-white py-2 px-3 text-base/6 text-zinc-950 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Kein Projekt zuordnen</option>
          {projects.map(project => (
            <option key={project.id} value={project.id!}>
              {project.title} {project.customer?.name && `(${project.customer.name})`}
            </option>
          ))}
        </select>
      )}
      
      {currentSelectedId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <LinkIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">✅ Projekt-Integration aktiviert</p>
              <p className="mt-1">
                Diese Kampagne wird dem ausgewählten Projekt zugeordnet und automatisch 
                in der Pipeline-Phase &ldquo;Erstellung&rdquo; verwaltet.
              </p>
              <p className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <strong>Interne PDFs aktiviert:</strong> Bei Speicherung werden automatisch 
                interne PDF-Versionen im Projekt-Ordner generiert.
              </p>
              {projects.find(p => p.id === selectedProjectId)?.customer?.name && (
                <p className="mt-1 text-blue-600">
                  Kunde: {projects.find(p => p.id === selectedProjectId)?.customer?.name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!loading && projects.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          {clientId ? 'Keine aktiven Projekte für diesen Kunden gefunden.' : 'Keine aktiven Projekte gefunden.'}
        </div>
      )}
    </div>
  );
};