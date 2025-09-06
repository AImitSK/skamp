'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  PencilSquareIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId, currentOrganization?.id]);

  const loadProject = async () => {
    if (!projectId || !currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);
      const projectData = await projectService.getById(projectId, {
        organizationId: currentOrganization.id
      });
      
      if (projectData) {
        setProject(projectData);
      } else {
        setError('Projekt nicht gefunden');
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Projekts:', error);
      setError('Projekt konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'on_hold': return 'yellow';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'zinc';
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'on_hold': return 'Pausiert';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  const getCurrentStageLabel = (stage: string) => {
    switch (stage) {
      case 'ideas_planning': return 'Ideen & Planung';
      case 'creation': return 'Erstellung';
      case 'internal_approval': return 'Interne Freigabe';
      case 'customer_approval': return 'Kundenfreigabe';
      case 'distribution': return 'Verteilung';
      case 'monitoring': return 'Monitoring';
      case 'completed': return 'Abgeschlossen';
      default: return stage;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Projekt wird geladen...</Text>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <DocumentTextIcon className="h-12 w-12 mx-auto" />
        </div>
        <Heading>{error || 'Projekt nicht gefunden'}</Heading>
        <div className="mt-6">
          <Link href="/dashboard/projects">
            <Button>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Zurück zur Projektübersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/projects">
              <Button plain className="p-2">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <Heading>{project.title}</Heading>
              <Text className="mt-1">{project.description || 'Keine Beschreibung verfügbar'}</Text>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge color={getProjectStatusColor(project.status)}>
              {getProjectStatusLabel(project.status)}
            </Badge>
            <Button>
              <PencilSquareIcon className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
            <Subheading>Projektdetails</Subheading>
          </div>
          
          <div className="space-y-4">
            <div>
              <Text className="text-sm font-medium text-gray-600">Aktuelle Phase</Text>
              <Text className="mt-1">{getCurrentStageLabel(project.currentStage)}</Text>
            </div>
            
            {project.customer && (
              <div>
                <Text className="text-sm font-medium text-gray-600">Kunde</Text>
                <div className="flex items-center mt-1">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <Text>{project.customer.name}</Text>
                </div>
              </div>
            )}
            
            <div>
              <Text className="text-sm font-medium text-gray-600">Erstellt am</Text>
              <div className="flex items-center mt-1">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-1" />
                <Text>{formatDate(project.createdAt)}</Text>
              </div>
            </div>

            {project.dueDate && (
              <div>
                <Text className="text-sm font-medium text-gray-600">Fälligkeitsdatum</Text>
                <div className="flex items-center mt-1">
                  <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <Text>{formatDate(project.dueDate)}</Text>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
            <Subheading>Team</Subheading>
          </div>
          
          <div className="space-y-4">
            {project.assignedTo && project.assignedTo.length > 0 ? (
              <div>
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  Zugewiesene Mitarbeiter ({project.assignedTo.length})
                </Text>
                <div className="space-y-2">
                  {project.assignedTo.slice(0, 3).map((memberId) => (
                    <div key={memberId} className="flex items-center">
                      <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
                      <Text className="text-sm">Team-Mitglied</Text>
                    </div>
                  ))}
                  {project.assignedTo.length > 3 && (
                    <Text className="text-sm text-gray-500">
                      +{project.assignedTo.length - 3} weitere
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Keine Team-Mitglieder zugewiesen</Text>
            )}
          </div>
        </div>

        {/* Wizard Info */}
        {project.creationContext?.createdViaWizard && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Squares2X2Icon className="h-5 w-5 text-gray-400 mr-2" />
              <Subheading>Wizard-Erstellung</Subheading>
            </div>
            
            <div className="space-y-4">
              <div>
                <Text className="text-sm font-medium text-gray-600">Template</Text>
                <Text className="mt-1">{project.creationContext.templateId}</Text>
              </div>
              
              <div>
                <Text className="text-sm font-medium text-gray-600">Wizard-Version</Text>
                <Text className="mt-1">{project.creationContext.wizardVersion}</Text>
              </div>
              
              {project.setupStatus && (
                <div>
                  <Text className="text-sm font-medium text-gray-600 mb-2">Setup-Status</Text>
                  <div className="flex flex-wrap gap-1">
                    {project.setupStatus.campaignLinked && (
                      <Badge color="green" className="text-xs">Kampagne</Badge>
                    )}
                    {project.setupStatus.assetsAttached && (
                      <Badge color="blue" className="text-xs">Assets</Badge>
                    )}
                    {project.setupStatus.tasksCreated && (
                      <Badge color="purple" className="text-xs">Tasks</Badge>
                    )}
                    {project.setupStatus.teamNotified && (
                      <Badge color="orange" className="text-xs">Team benachrichtigt</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs - Platzhalter für zukünftige Features */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex space-x-6">
              <button className="text-blue-600 border-b-2 border-blue-600 pb-2 text-sm font-medium">
                Übersicht
              </button>
              <button className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Tasks
              </button>
              <button className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Assets
              </button>
              <button className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Kommunikation
              </button>
              <button className="text-gray-500 hover:text-gray-700 pb-2 text-sm font-medium">
                Monitoring
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <Subheading className="mb-2">Projekt-Details werden erweitert</Subheading>
            <Text className="text-gray-600">
              Weitere Funktionen wie Tasks, Assets und Monitoring werden in kommenden Updates hinzugefügt.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}