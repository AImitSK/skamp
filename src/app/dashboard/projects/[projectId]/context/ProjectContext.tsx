'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/types/project';

/**
 * ProjectContext Value Interface
 *
 * Zentralisiert Project-State für alle Child-Komponenten
 * Vermeidet Props-Drilling für organizationId, projectId, activeTab
 */
interface ProjectContextValue {
  // Project Data
  project: Project | null;
  setProject: (project: Project | null) => void;

  // IDs (read-only für Child-Komponenten)
  projectId: string;
  organizationId: string;

  // Tab Navigation
  activeTab: 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';
  setActiveTab: (tab: ProjectContextValue['activeTab']) => void;

  // Loading States
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Reload Function
  reloadProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

/**
 * ProjectProvider Props
 */
interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
  onReload?: () => Promise<void>;
}

/**
 * ProjectProvider Component
 *
 * Wrapped um alle Child-Komponenten in page.tsx
 * Stellt project, organizationId, projectId, activeTab global bereit
 */
export function ProjectProvider({
  children,
  projectId,
  organizationId,
  initialProject = null,
  onReload,
}: ProjectProviderProps) {
  const [project, setProject] = useState<Project | null>(initialProject);
  const [activeTab, setActiveTab] = useState<ProjectContextValue['activeTab']>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadProject = async () => {
    if (onReload) {
      await onReload();
    }
  };

  const value: ProjectContextValue = {
    project,
    setProject,
    projectId,
    organizationId,
    activeTab,
    setActiveTab,
    loading,
    setLoading,
    error,
    setError,
    reloadProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * useProject Custom Hook
 *
 * Nutzen in Child-Komponenten:
 * const { project, organizationId, projectId, activeTab } = useProject();
 *
 * @throws Error wenn außerhalb von ProjectProvider verwendet
 */
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
