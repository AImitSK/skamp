'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';
import Link from 'next/link';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';

export default function ProjectEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditWizard, setShowEditWizard] = useState(false);

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

  const handleEditSuccess = (updatedProject: Project) => {
    setProject(updatedProject);
    // Optionally redirect or reload
    setTimeout(() => {
      router.push(`/dashboard/projects/${projectId}`);
    }, 1000);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <Text className="mt-4">Projekt wird geladen...</Text>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Text className="text-red-600 mb-4">{error || 'Projekt nicht gefunden'}</Text>
          <Link href="/dashboard/projects">
            <Button variant="secondary">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button plain className="mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Zurück zum Projekt
            </Button>
          </Link>
          
          <Heading>Projekt bearbeiten</Heading>
          <Subheading>
            Bearbeiten Sie die Projektdetails mit dem erweiterten Editor
          </Subheading>
        </div>

        {/* Project Overview Card */}
        {project && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {project.description || 'Keine Beschreibung verfügbar'}
                </p>
              </div>
              <Button
                onClick={() => setShowEditWizard(true)}
                className="flex items-center space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Projekt bearbeiten</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Project Edit Wizard */}
      {project && currentOrganization && (
        <ProjectEditWizard
          isOpen={showEditWizard}
          onClose={() => setShowEditWizard(false)}
          onSuccess={handleEditSuccess}
          project={project}
          organizationId={currentOrganization.id}
        />
      )}
    </>
  );
}