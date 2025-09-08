'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { projectService } from '@/lib/firebase/project-service';
import { Project, ProjectPriority, PipelineStage } from '@/types/project';
import Link from 'next/link';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember } from '@/types/international';

export default function ProjectEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active' as string,
    priority: 'medium' as ProjectPriority,
    currentStage: 'ideas_planning' as PipelineStage,
    assignedTo: [] as string[],
    tags: [] as string[],
    dueDate: ''
  });

  useEffect(() => {
    loadProject();
    loadTeamMembers();
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
        // Initialize form with project data
        setFormData({
          title: projectData.title || '',
          description: projectData.description || '',
          status: projectData.status || 'active',
          priority: (projectData as any).priority || 'medium',
          currentStage: projectData.currentStage || 'ideas_planning',
          assignedTo: projectData.assignedTo || [],
          tags: (projectData as any).tags || [],
          dueDate: projectData.dueDate 
            ? new Date(projectData.dueDate.seconds * 1000).toISOString().split('T')[0]
            : ''
        });
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

  const loadTeamMembers = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const members = await teamMemberService.getByOrganization(currentOrganization.id);
      setTeamMembers(members.filter(m => m.status === 'active'));
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project || !currentOrganization?.id) return;

    try {
      setSaving(true);
      
      const updateData: Partial<Project> = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        currentStage: formData.currentStage,
        assignedTo: formData.assignedTo,
        updatedAt: new Date(),
        updatedBy: user?.uid
      };

      // Add optional fields
      if (formData.priority) {
        (updateData as any).priority = formData.priority;
      }
      if (formData.tags.length > 0) {
        (updateData as any).tags = formData.tags;
      }
      if (formData.dueDate) {
        updateData.dueDate = {
          seconds: new Date(formData.dueDate).getTime() / 1000,
          nanoseconds: 0
        } as any;
      }

      await projectService.update(projectId, updateData, {
        organizationId: currentOrganization.id
      });

      setSuccessMessage('Projekt erfolgreich aktualisiert');
      setTimeout(() => {
        router.push(`/dashboard/projects/${projectId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating project:', error);
      setErrorMessage('Fehler beim Speichern des Projekts');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim();
      
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
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
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/dashboard/projects/${projectId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zum Projekt
          </Button>
        </Link>
        
        <Heading>Projekt bearbeiten</Heading>
        <Text className="mt-2 text-gray-600">
          Bearbeiten Sie die Projektdetails und Einstellungen
        </Text>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Projekttitel *
          </label>
          <Input
            id="title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Projekttitel eingeben"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Beschreibung
          </label>
          <Textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Projektbeschreibung eingeben"
          />
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Aktiv</option>
              <option value="on_hold">Pausiert</option>
              <option value="completed">Abgeschlossen</option>
              <option value="cancelled">Abgebrochen</option>
            </Select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priorität
            </label>
            <Select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as ProjectPriority }))}
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </Select>
          </div>
        </div>

        {/* Pipeline Stage */}
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-2">
            Pipeline-Phase
          </label>
          <Select
            id="stage"
            value={formData.currentStage}
            onChange={(e) => setFormData(prev => ({ ...prev, currentStage: e.target.value as PipelineStage }))}
          >
            <option value="ideas_planning">Ideen & Planung</option>
            <option value="creation">Erstellung</option>
            <option value="internal_approval">Interne Freigabe</option>
            <option value="customer_approval">Kundenfreigabe</option>
            <option value="distribution">Distribution</option>
            <option value="monitoring">Monitoring</option>
            <option value="completed">Abgeschlossen</option>
          </Select>
        </div>

        {/* Team Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team-Mitglieder
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {teamMembers.map(member => (
              <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  value={member.userId}
                  checked={formData.assignedTo.includes(member.userId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        assignedTo: [...prev.assignedTo, member.userId]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        assignedTo: prev.assignedTo.filter(id => id !== member.userId)
                      }));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
            Fälligkeitsdatum
          </label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <Input
            id="tags"
            type="text"
            placeholder="Tag eingeben und Enter drücken"
            onKeyDown={handleTagInput}
          />
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={saving || !formData.title}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Speichern...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                Änderungen speichern
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}