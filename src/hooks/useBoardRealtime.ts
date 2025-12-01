// src/hooks/useBoardRealtime.ts - Real-time Board Hook für Plan 10/9
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { Project, PipelineStage } from '@/types/project';
import { BoardData, ActiveUser, ProjectUpdate } from '@/lib/kanban/kanban-board-service';

// ========================================
// BOARD REALTIME HOOK
// ========================================

export const useBoardRealtime = (organizationId: string) => {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hilfsfunktion: Gruppiere Projekte nach Stages
  const groupProjectsByStage = useCallback((projects: Project[]): Record<PipelineStage, Project[]> => {
    const stages: PipelineStage[] = [
      'ideas_planning',
      'creation',
      'approval',
      'distribution',
      'monitoring',
      'completed'
    ];

    return stages.reduce((acc, stage) => {
      acc[stage] = projects.filter(project => project.currentStage === stage);
      return acc;
    }, {} as Record<PipelineStage, Project[]>);
  }, []);

  // Real-time Projects Listener
  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      setError('Organization ID ist erforderlich');
      return;
    }

    const projectsQuery = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        try {
          const projects: Project[] = [];
          
          snapshot.forEach(doc => {
            const data = doc.data();
            projects.push({ 
              id: doc.id, 
              ...data,
              // Sicherstellen, dass Timestamps korrekt konvertiert werden
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now()
            } as Project);
          });
          
          // Gruppiere nach Stages
          const projectsByStage = groupProjectsByStage(projects);
          
          setBoardData(prev => ({
            ...prev,
            projectsByStage,
            totalProjects: projects.length,
            activeUsers: prev?.activeUsers || [],
            recentUpdates: prev?.recentUpdates || []
          }));
          
          setError(null);
          setLoading(false);
        } catch (err: any) {
          console.error('Board projects real-time error:', err);
          setError(`Fehler beim Laden der Projekte: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Board projects real-time error:', err);
        setError(`Real-time Verbindungsfehler: ${err.message}`);
        setLoading(false);
      }
    );

    return unsubscribeProjects;
  }, [organizationId, groupProjectsByStage]);

  // Active Users Listener
  useEffect(() => {
    if (!organizationId) return;

    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
    
    const activeUsersQuery = query(
      collection(db, 'user_presence'),
      where('organizationId', '==', organizationId),
      where('lastSeen', '>', fiveMinutesAgo)
    );

    const unsubscribeActiveUsers = onSnapshot(
      activeUsersQuery, 
      (snapshot) => {
        try {
          const activeUsers: ActiveUser[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            activeUsers.push({
              id: doc.id,
              name: data.name || data.displayName || 'Unknown User',
              avatar: data.avatar,
              currentProject: data.currentProject,
              lastSeen: data.lastSeen || Timestamp.now()
            });
          });
          
          setBoardData(prev => ({
            ...prev,
            activeUsers,
            projectsByStage: prev?.projectsByStage || {} as Record<PipelineStage, Project[]>,
            totalProjects: prev?.totalProjects || 0,
            recentUpdates: prev?.recentUpdates || []
          }));
        } catch (err: any) {
          console.error('Active users real-time error:', err);
        }
      },
      (err) => {
        console.error('Active users real-time error:', err);
      }
    );

    return unsubscribeActiveUsers;
  }, [organizationId]);

  // Recent Updates Listener
  useEffect(() => {
    if (!organizationId) return;

    const recentUpdatesQuery = query(
      collection(db, 'project_updates'),
      where('organizationId', '==', organizationId),
      orderBy('timestamp', 'desc'),
      // limit(20) // Entfernt da limit ein separater Import wäre
    );

    const unsubscribeUpdates = onSnapshot(
      recentUpdatesQuery,
      (snapshot) => {
        try {
          const recentUpdates: ProjectUpdate[] = [];
          let count = 0;
          
          // Manuelles Limit auf 20
          snapshot.forEach(doc => {
            if (count < 20) {
              const data = doc.data();
              recentUpdates.push({
                id: doc.id,
                projectId: data.projectId,
                projectTitle: data.projectTitle,
                action: data.action,
                fromStage: data.fromStage,
                toStage: data.toStage,
                userId: data.userId,
                userName: data.userName || 'Unknown User',
                timestamp: data.timestamp || Timestamp.now()
              });
              count++;
            }
          });
          
          setBoardData(prev => ({
            ...prev,
            recentUpdates,
            projectsByStage: prev?.projectsByStage || {} as Record<PipelineStage, Project[]>,
            totalProjects: prev?.totalProjects || 0,
            activeUsers: prev?.activeUsers || []
          }));
        } catch (err: any) {
          console.error('Recent updates real-time error:', err);
        }
      },
      (err) => {
        console.error('Recent updates real-time error:', err);
      }
    );

    return unsubscribeUpdates;
  }, [organizationId]);

  // Refresh-Funktion
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    // Real-time Listener werden automatisch wieder getriggert
  }, []);

  // Filter-Update-Funktion
  const updateProjectsWithFilters = useCallback((filteredProjectsByStage: Record<PipelineStage, Project[]>) => {
    setBoardData(prev => ({
      ...prev,
      projectsByStage: filteredProjectsByStage,
      totalProjects: Object.values(filteredProjectsByStage).flat().length,
      activeUsers: prev?.activeUsers || [],
      recentUpdates: prev?.recentUpdates || []
    }));
  }, []);

  return { 
    boardData, 
    loading, 
    error, 
    refresh,
    updateProjectsWithFilters
  };
};