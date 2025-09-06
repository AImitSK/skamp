// src/components/projects/kanban/QuickProjectDialog.tsx - Schnelles Projekt hinzufügen
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { XMarkIcon, PlusIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { PipelineStage } from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';

// ========================================
// INTERFACES
// ========================================

export interface QuickProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
  targetStage: PipelineStage;
}

interface QuickProjectForm {
  title: string;
  description: string;
  customerName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// ========================================
// QUICK PROJECT DIALOG KOMPONENTE
// ========================================

export const QuickProjectDialog: React.FC<QuickProjectDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetStage
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<QuickProjectForm>({
    title: '',
    description: '',
    customerName: '',
    priority: 'medium'
  });

  // Stage Labels
  const getStageLabel = (stage: PipelineStage): string => {
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

  // Handle form changes
  const handleFormChange = (field: keyof QuickProjectForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !currentOrganization?.id) {
      console.error('User or organization not available');
      return;
    }

    if (!form.title.trim()) {
      console.error('Projekttitel ist erforderlich');
      return;
    }

    try {
      setLoading(true);

      const projectData = {
        title: form.title.trim(),
        description: form.description.trim(),
        customer: form.customerName.trim() ? {
          name: form.customerName.trim(),
          id: `customer_${Date.now()}`, // Temporary ID
          email: '',
          contactPerson: ''
        } : null,
        currentStage: targetStage,
        status: 'active' as const,
        priority: form.priority,
        tags: [],
        organizationId: currentOrganization.id,
        createdBy: user.uid,
        assignedTo: [user.uid],
        creationContext: {
          createdViaWizard: false,
          method: 'quick_add',
          sourceStage: targetStage
        }
      };

      const result = await projectService.create(projectData);
      
      if (result.success && result.project) {
        console.log('Projekt erfolgreich erstellt:', result.project);
        if (onSuccess) {
          onSuccess(result.project.id);
        }
        handleClose();
      } else {
        console.error('Projekt-Erstellung fehlgeschlagen:', result.error);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      setForm({
        title: '',
        description: '',
        customerName: '',
        priority: 'medium'
      });
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PlusIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Projekt hinzufügen
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Neues Projekt in <span className="font-medium">{getStageLabel(targetStage)}</span> erstellen
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekttitel *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Produktlaunch Kampagne"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Kurze Beschreibung des Projekts..."
              disabled={loading}
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kunde
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => handleFormChange('customerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kundenname (optional)"
              disabled={loading}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorität
            </label>
            <select
              value={form.priority}
              onChange={(e) => handleFormChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Erstelle...</span>
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="h-4 w-4" />
                  <span>Projekt erstellen</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickProjectDialog;