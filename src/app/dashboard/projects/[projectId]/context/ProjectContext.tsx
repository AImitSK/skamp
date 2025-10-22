'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
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
  initialActiveTab?: ProjectContextValue['activeTab'];
  onTabChange?: (tab: ProjectContextValue['activeTab']) => void;
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
  initialActiveTab = 'overview',
  onTabChange,
  onReload,
}: ProjectProviderProps) {
  const [project, setProject] = useState<Project | null>(initialProject);
  const [activeTab, setActiveTabInternal] = useState<ProjectContextValue['activeTab']>(initialActiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrapper für setActiveTab - nutzt onTabChange callback wenn verfügbar
  const setActiveTab = useCallback((tab: ProjectContextValue['activeTab']) => {
    setActiveTabInternal(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  const reloadProject = useCallback(async () => {
    if (onReload) {
      await onReload();
    }
  }, [onReload]);

  const value: ProjectContextValue = useMemo(() => ({
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
  }), [project, projectId, organizationId, activeTab, loading, error, reloadProject]);

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
