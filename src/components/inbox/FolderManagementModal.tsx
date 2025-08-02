// src/components/inbox/FolderManagementModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Button } from '@/components/button';
import clsx from 'clsx';
import {
  XMarkIcon,
  FolderIcon,
  PlusIcon
} from '@heroicons/react/20/solid';
import { TeamFolder, AutoAssignRule } from '@/types/inbox-enhanced';
import { teamFolderService } from '@/lib/email/team-folder-service';
// import { toast } from 'react-hot-toast';
// Fallback toast implementation
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message)
};

// ============================================================================
// INTERFACES
// ============================================================================

interface FolderManagementModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  parentFolderId?: string;
  editingFolder?: TeamFolder;
  onClose: () => void;
  onSaved: () => void;
}

interface FolderFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  isShared: boolean;
  autoAssignRules: AutoAssignRule[];
}

// Preset Icons
const FOLDER_ICONS = [
  '📁', '📂', '📄', '📋', '📌', '🎯', '💼', '🏢', '👥', '👤',
  '💡', '🚀', '⭐', '🔥', '💎', '🎨', '🔧', '⚙️', '📈', '📊',
  '🎪', '🎭', '🎬', '🎵', '🎯', '🏆', '🎁', '🎉', '❤️', '💚'
];

// Preset Colors
const FOLDER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FolderManagementModal({
  isOpen,
  mode,
  parentFolderId,
  editingFolder,
  onClose,
  onSaved
}: FolderManagementModalProps) {
  // Context
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // State
  const [formData, setFormData] = useState<FolderFormData>({
    name: '',
    description: '',
    icon: '📁',
    color: '#3B82F6',
    isShared: false,
    autoAssignRules: []
  });
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize form when modal opens or editing folder changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && editingFolder) {
        setFormData({
          name: editingFolder.name,
          description: editingFolder.description || '',
          icon: editingFolder.icon || '📁',
          color: editingFolder.color || '#3B82F6',
          isShared: editingFolder.isShared,
          autoAssignRules: editingFolder.autoAssignRules || []
        });
      } else {
        // Reset for create mode
        setFormData({
          name: '',
          description: '',
          icon: '📁',
          color: '#3B82F6',
          isShared: false,
          autoAssignRules: []
        });
      }
      setShowAdvanced(false);
    }
  }, [isOpen, mode, editingFolder]);

  // ========================================
  // FORM HANDLING
  // ========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !currentOrganization) {
      toast.error('Authentifizierung erforderlich');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Ordner-Name ist erforderlich');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'create') {
        if (parentFolderId) {
          // Unterordner erstellen
          await teamFolderService.createSubFolder(
            currentOrganization.id,
            user.uid,
            parentFolderId,
            {
              name: formData.name.trim(),
              description: formData.description.trim() || undefined,
              icon: formData.icon,
              color: formData.color,
              isShared: formData.isShared,
              autoAssignRules: formData.autoAssignRules
            }
          );
        } else {
          // Root-Ordner erstellen
          const folderData = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            icon: formData.icon,
            color: formData.color,
            ownerId: user.uid,
            ownerName: user.displayName || user.email || 'Unbekannt',
            level: 0,
            path: [formData.name.trim()],
            isShared: formData.isShared,
            isSystem: false,
            emailCount: 0,
            unreadCount: 0,
            autoAssignRules: formData.autoAssignRules
          };

          const folderDataWithRequired = {
            ...folderData,
            organizationId: currentOrganization.id,
            userId: user.uid
          };

          await teamFolderService.create(folderDataWithRequired, {
            organizationId: currentOrganization.id,
            userId: user.uid
          });
        }

        toast.success('Ordner erstellt');
      } else {
        // Ordner bearbeiten
        if (!editingFolder?.id) {
          throw new Error('Ordner-ID fehlt');
        }

        await teamFolderService.update(
          editingFolder.id,
          {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            icon: formData.icon,
            color: formData.color,
            isShared: formData.isShared,
            autoAssignRules: formData.autoAssignRules
          },
          {
            organizationId: currentOrganization.id,
            userId: user.uid
          }
        );

        toast.success('Ordner aktualisiert');
      }

      onSaved();
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignRuleChange = (index: number, field: keyof AutoAssignRule, value: any) => {
    const newRules = [...formData.autoAssignRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, autoAssignRules: newRules });
  };

  const addAutoAssignRule = () => {
    const newRule: AutoAssignRule = {
      id: `rule_${Date.now()}`,
      type: 'domain',
      pattern: '',
      isActive: true,
      priority: formData.autoAssignRules.length + 1
    };
    setFormData({
      ...formData,
      autoAssignRules: [...formData.autoAssignRules, newRule]
    });
  };

  const removeAutoAssignRule = (index: number) => {
    const newRules = formData.autoAssignRules.filter((_, i) => i !== index);
    setFormData({ ...formData, autoAssignRules: newRules });
  };

  // ========================================
  // RENDER
  // ========================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Neuen Ordner erstellen' : 'Ordner bearbeiten'}
            </h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name & Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordner-Name
              </label>
              <div className="flex space-x-2">
                {/* Icon Picker */}
                <div className="flex-shrink-0">
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md max-h-20 overflow-y-auto">
                    {FOLDER_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={clsx(
                          'text-lg p-1 rounded hover:bg-gray-100',
                          formData.icon === icon && 'bg-blue-100'
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Kundenprojekte"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kurze Beschreibung des Ordners..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farbe
              </label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={clsx(
                      'w-8 h-8 rounded-full border-2',
                      formData.color === color ? 'border-gray-800' : 'border-gray-300'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Sharing */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isShared"
                checked={formData.isShared}
                onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isShared" className="ml-2 block text-sm text-gray-700">
                Mit Team teilen
              </label>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAdvanced ? 'Erweiterte Optionen ausblenden' : 'Erweiterte Optionen anzeigen'}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700">Automatische Zuweisungsregeln</h4>
                  
                  {formData.autoAssignRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                      <select
                        value={rule.type}
                        onChange={(e) => handleAutoAssignRuleChange(index, 'type', e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="domain">Domain</option>
                        <option value="keyword">Keyword</option>
                        <option value="sender">Absender</option>
                        <option value="subject">Betreff</option>
                      </select>
                      
                      <input
                        type="text"
                        value={rule.pattern}
                        onChange={(e) => handleAutoAssignRuleChange(index, 'pattern', e.target.value)}
                        placeholder="z.B. kunde.de"
                        className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeAutoAssignRule(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addAutoAssignRule}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Regel hinzufügen
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                {mode === 'create' ? 'Erstellen' : 'Aktualisieren'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}