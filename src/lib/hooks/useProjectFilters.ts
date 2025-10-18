import { useState, useMemo, useCallback } from 'react';
import { Project } from '@/types/project';

export interface ProjectFilters {
  showActive: boolean;
  showArchived: boolean;
}

export function useProjectFilters(projects: Project[], searchTerm: string = '') {
  const [showActive, setShowActive] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Gefilterte Projekte basierend auf Status-Filter und Suchbegriff
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Status-Filter
    if (showActive && showArchived) {
      filtered = projects;
    } else if (showActive) {
      filtered = projects.filter(p => p.status !== 'archived');
    } else if (showArchived) {
      filtered = projects.filter(p => p.status === 'archived');
    } else {
      return [];
    }

    // Such-Filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.customer?.name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [projects, showActive, showArchived, searchTerm]);

  // Toggle-Funktionen mit useCallback
  const toggleActive = useCallback((value: boolean) => {
    setShowActive(value);
  }, []);

  const toggleArchived = useCallback((value: boolean) => {
    setShowArchived(value);
  }, []);

  // Filter-State zurücksetzen
  const resetFilters = useCallback(() => {
    setShowActive(true);
    setShowArchived(false);
  }, []);

  return {
    // States
    showActive,
    showArchived,

    // Gefilterte Daten
    filteredProjects,

    // Actions
    toggleActive,
    toggleArchived,
    resetFilters,
  };
}
