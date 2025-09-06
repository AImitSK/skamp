'use client';

import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  PhotoIcon,
  FolderIcon,
  TagIcon,
  SparklesIcon,
  ShareIcon,
  CheckIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { MediaAsset, MediaFolder } from '@/types/media';
import { Project } from '@/types/project';
import { CampaignAssetAttachment } from '@/types/pr';
import { useAuth } from '@/context/AuthContext';
import { mediaService } from '@/lib/firebase/media-service';
import { projectService } from '@/lib/firebase/project-service';

interface SmartAssetSelectorProps {
  // Unterstütze beide Interfaces für Kompatibilität
  project?: Project;
  projectId?: string;
  organizationId?: string;
  currentPhase?: string;
  existingAttachments?: CampaignAssetAttachment[];
  // Callbacks - verschiedene Varianten
  onSelect?: (assets: MediaAsset[], folders: MediaFolder[]) => void;
  onAssetSelected?: (assetId: string) => void;
  onCancel?: () => void;
  isOpen?: boolean;
  multiSelect?: boolean;
  filterTypes?: string[]; // z.B. ['image/*', 'application/pdf']
}

interface AssetSuggestion {
  asset: MediaAsset;
  score: number;
  reasons: string[];
  isProjectShared: boolean;
  recentlyUsed: boolean;
  sameCampaign: boolean;
}

interface SmartFilters {
  search: string;
  type: string;
  source: 'all' | 'project' | 'shared' | 'recent' | 'suggested';
  phase: string;
  tags: string[];
  dateRange: 'all' | 'week' | 'month' | 'quarter';
}

export default function SmartAssetSelector({
  project,
  projectId,
  organizationId,
  currentPhase,
  existingAttachments = [],
  onSelect,
  onAssetSelected,
  onCancel,
  isOpen = true,
  multiSelect = true,
  filterTypes = []
}: SmartAssetSelectorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<MediaFolder[]>([]);
  const [filters, setFilters] = useState<SmartFilters>({
    search: '',
    type: 'all',
    source: 'all',
    phase: 'all',
    tags: [],
    dateRange: 'all'
  });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadAssets();
    }
  }, [isOpen, user?.uid, project?.id]);

  useEffect(() => {
    if (assets.length > 0 && project?.id) {
      generateSuggestions();
    }
  }, [assets, project, currentPhase, existingAttachments]);

  const loadAssets = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Lade alle Assets der Organisation
      const [allAssets, allFolders] = await Promise.all([
        mediaService.getMediaAssets(user.uid),
        mediaService.getFolders(user.uid)
      ]);
      
      setAssets(allAssets);
      setFolders(allFolders);
    } catch (error) {
      console.error('Fehler beim Laden der Assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    if (!project?.id || !user?.uid) return;
    
    try {
      // Smart Asset Suggestions basierend auf verschiedenen Faktoren
      const assetSuggestions: AssetSuggestion[] = [];
      
      // 1. Projekt-weite geteilte Assets
      const projectSharedAssets = await projectService.getProjectSharedAssets(
        project.id,
        { organizationId: user.uid }
      );
      
      // 2. Häufig verwendete Assets im Projekt
      const projectSummary = await mediaService.getProjectAssetSummary(
        project.id,
        { organizationId: user.uid }
      );
      
      // 3. Assets aus ähnlicher Phase
      const phaseAssets = assets.filter(asset => {
        // Logic für Phase-basierte Vorschläge
        if (currentPhase === 'creation') {
          return asset.tags?.includes('logo') || 
                 asset.tags?.includes('template') ||
                 asset.fileType?.includes('image');
        }
        if (currentPhase === 'approval') {
          return asset.fileType?.includes('pdf') || 
                 asset.tags?.includes('final');
        }
        return false;
      });
      
      // 4. Kürzlich verwendete Assets
      const recentAssets = assets
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
        .slice(0, 10);
      
      // Scoring-Logic
      for (const asset of assets) {
        let score = 0;
        const reasons: string[] = [];
        
        // Ist in Projekt geteilt?
        const isProjectShared = projectSharedAssets.some(
          shared => shared.assetId === asset.id
        );
        if (isProjectShared) {
          score += 30;
          reasons.push('Projekt-weit geteilt');
        }
        
        // Ist häufig verwendet?
        const isPopular = projectSummary.topAssets?.some(
          (top: any) => top.assetId === asset.id
        );
        if (isPopular) {
          score += 25;
          reasons.push('Häufig verwendet');
        }
        
        // Passt zur aktuellen Phase?
        const isPhaseRelevant = phaseAssets.includes(asset);
        if (isPhaseRelevant) {
          score += 20;
          reasons.push(`Relevant für ${currentPhase}`);
        }
        
        // Ist kürzlich verwendet?
        const isRecent = recentAssets.includes(asset);
        if (isRecent) {
          score += 15;
          reasons.push('Kürzlich verwendet');
        }
        
        // Hat relevante Tags?
        const hasRelevantTags = asset.tags?.some(tag => 
          currentPhase?.includes(tag.toLowerCase()) || 
          project.title.toLowerCase().includes(tag.toLowerCase())
        );
        if (hasRelevantTags) {
          score += 10;
          reasons.push('Relevante Tags');
        }
        
        // Bereits in Verwendung?
        const alreadyUsed = existingAttachments.some(
          attachment => attachment.assetId === asset.id
        );
        if (alreadyUsed) {
          score -= 50; // Reduziere Score für bereits verwendete Assets
        }
        
        // Nur Assets mit Score > 10 als Vorschlag
        if (score > 10 && !alreadyUsed) {
          assetSuggestions.push({
            asset,
            score,
            reasons,
            isProjectShared,
            recentlyUsed: isRecent,
            sameCampaign: false
          });
        }
      }
      
      // Sortiere nach Score
      assetSuggestions.sort((a, b) => b.score - a.score);
      setSuggestions(assetSuggestions.slice(0, 12)); // Top 12 Vorschläge
      
    } catch (error) {
      console.error('Fehler bei Smart Suggestions:', error);
    }
  };

  // Filterlogik
  const filteredAssets = assets.filter(asset => {
    // Bereits ausgewählte ausblenden bei Einzelauswahl
    if (!multiSelect && selectedAssets.includes(asset)) return false;
    
    // Suchfilter
    if (filters.search && !asset.fileName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Typ-Filter
    if (filters.type !== 'all' && !asset.fileType?.includes(filters.type)) {
      return false;
    }
    
    // filterTypes berücksichtigen
    if (filterTypes.length > 0) {
      const matchesFilter = filterTypes.some(filter => {
        if (filter.endsWith('/*')) {
          return asset.fileType?.startsWith(filter.replace('/*', '/'));
        }
        return asset.fileType === filter;
      });
      if (!matchesFilter) return false;
    }
    
    // Source-Filter
    if (filters.source === 'suggested') {
      return suggestions.some(s => s.asset.id === asset.id);
    }
    if (filters.source === 'project' && project?.id) {
      // Nur Projekt-Assets (vereinfacht)
      return asset.tags?.includes('project') || asset.description?.includes(project.title);
    }
    if (filters.source === 'shared') {
      return suggestions.some(s => s.asset.id === asset.id && s.isProjectShared);
    }
    if (filters.source === 'recent') {
      const daysSinceUpdate = asset.updatedAt 
        ? (Date.now() - asset.updatedAt.toMillis()) / (1000 * 60 * 60 * 24)
        : 999;
      return daysSinceUpdate <= 7;
    }
    
    // Tag-Filter
    if (filters.tags.length > 0) {
      const assetTags = asset.tags || [];
      if (!filters.tags.some(tag => assetTags.includes(tag))) {
        return false;
      }
    }
    
    // Datumsbereich-Filter
    if (filters.dateRange !== 'all' && asset.createdAt) {
      const daysAgo = (Date.now() - asset.createdAt.toMillis()) / (1000 * 60 * 60 * 24);
      switch (filters.dateRange) {
        case 'week':
          if (daysAgo > 7) return false;
          break;
        case 'month':
          if (daysAgo > 30) return false;
          break;
        case 'quarter':
          if (daysAgo > 90) return false;
          break;
      }
    }
    
    return true;
  });

  const handleAssetSelect = (asset: MediaAsset) => {
    if (multiSelect) {
      setSelectedAssets(prev => 
        prev.includes(asset) 
          ? prev.filter(a => a.id !== asset.id)
          : [...prev, asset]
      );
    } else {
      setSelectedAssets([asset]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedAssets, selectedFolders);
  };

  const getSuggestionBadge = (suggestion: AssetSuggestion) => {
    if (suggestion.score >= 50) return { color: 'bg-green-100 text-green-800', label: 'Sehr relevant' };
    if (suggestion.score >= 30) return { color: 'bg-blue-100 text-blue-800', label: 'Relevant' };
    return { color: 'bg-yellow-100 text-yellow-800', label: 'Interessant' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Smart Asset Auswahl
              </h3>
              {project && (
                <p className="text-sm text-gray-500">
                  Für Projekt: {project.title}
                  {currentPhase && ` • Phase: ${currentPhase}`}
                </p>
              )}
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {/* Suche */}
            <div className="relative flex-1 min-w-64">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Assets durchsuchen..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Source Filter */}
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Assets</option>
              <option value="suggested">Vorschläge</option>
              <option value="project">Projekt-Assets</option>
              <option value="shared">Geteilt</option>
              <option value="recent">Kürzlich</option>
            </select>
            
            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Typen</option>
              <option value="image">Bilder</option>
              <option value="pdf">PDF</option>
              <option value="video">Videos</option>
              <option value="doc">Dokumente</option>
            </select>
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zeitraum
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">Alle Zeit</option>
                    <option value="week">Letzte Woche</option>
                    <option value="month">Letzter Monat</option>
                    <option value="quarter">Letztes Quartal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase
                  </label>
                  <select
                    value={filters.phase}
                    onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">Alle Phasen</option>
                    <option value="creation">Erstellung</option>
                    <option value="approval">Freigabe</option>
                    <option value="distribution">Distribution</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {showSuggestions && suggestions.length > 0 && filters.source === 'all' && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
                <h4 className="font-medium text-gray-900">Smart Vorschläge</h4>
                <span className="ml-2 text-xs text-gray-500">({suggestions.length})</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {suggestions.slice(0, 6).map((suggestion) => {
                  const isSelected = selectedAssets.includes(suggestion.asset);
                  const badge = getSuggestionBadge(suggestion);
                  
                  return (
                    <div
                      key={suggestion.asset.id}
                      className={`relative bg-white border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(suggestion.asset)}
                    >
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        {suggestion.asset.downloadUrl ? (
                          <img 
                            src={suggestion.asset.downloadUrl}
                            alt={suggestion.asset.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <PhotoIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Score Badge */}
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </div>
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <div className="bg-blue-500 rounded-full p-1">
                              <CheckIcon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {/* Shared Indicator */}
                        {suggestion.isProjectShared && (
                          <div className="absolute bottom-2 right-2">
                            <ShareIcon className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {suggestion.asset.fileName}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestion.reasons.slice(0, 2).map((reason, index) => (
                            <span key={index} className="text-xs text-purple-600 bg-purple-50 px-1 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Asset Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Assets ({filteredAssets.length})
              </h4>
              {selectedAssets.length > 0 && (
                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {selectedAssets.length} ausgewählt
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-96 overflow-y-auto">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAssets.includes(asset);
                  const suggestion = suggestions.find(s => s.asset.id === asset.id);
                  
                  return (
                    <div
                      key={asset.id}
                      className={`relative bg-white border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAssetSelect(asset)}
                    >
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        {asset.downloadUrl ? (
                          <img 
                            src={asset.downloadUrl}
                            alt={asset.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <div className="bg-blue-500 rounded-full p-1">
                              <CheckIcon className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {/* Suggestion Indicator */}
                        {suggestion && (
                          <div className="absolute top-1 left-1">
                            <SparklesIcon className="h-3 w-3 text-purple-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-1">
                        <p className="text-xs text-gray-900 truncate">
                          {asset.fileName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''} ausgewählt
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedAssets.length === 0}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedAssets.length > 0 
                  ? `${selectedAssets.length} Asset${selectedAssets.length !== 1 ? 's' : ''} hinzufügen`
                  : 'Assets auswählen'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}