'use client';

import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  FolderIcon,
  ShareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EllipsisVerticalIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Project } from '@/types/project';
import { CampaignAssetAttachment, ResolvedAsset } from '@/types/pr';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';

interface ProjectAssetGalleryProps {
  // Unterstütze beide Varianten für Kompatibilität
  project?: Project;
  projectId?: string;
  organizationId?: string;
  currentStage?: string;
  onAssetSelect?: (asset: CampaignAssetAttachment) => void;
  onAssetsChange?: () => void;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'images' | 'documents' | 'videos' | 'shared';
type PhaseFilter = 'all' | 'creation' | 'approval' | 'distribution' | 'monitoring';

interface AssetFilters {
  search: string;
  type: FilterMode;
  phase: PhaseFilter;
  status: 'all' | 'valid' | 'needs_refresh' | 'missing';
}

export default function ProjectAssetGallery({
  project,
  projectId,
  organizationId,
  currentStage,
  onAssetSelect,
  onAssetsChange
}: ProjectAssetGalleryProps) {
  const t = useTranslations('projects.assets.gallery');
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [resolvedAssets, setResolvedAssets] = useState<ResolvedAsset[]>([]);
  const [sharedAssets, setSharedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [filters, setFilters] = useState<AssetFilters>({
    search: '',
    type: 'all',
    phase: 'all',
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActions, setBulkActions] = useState(false);

  // Kompatibilitätsschicht: erstelle ein mock project-Objekt falls nur projectId vorhanden
  const activeProject = project || (projectId ? {
    id: projectId,
    currentStage: currentStage || 'creation',
    organizationId: organizationId || ''
  } as Project : null);

  // Lade Assets
  useEffect(() => {
    if (activeProject?.id && user?.uid) {
      loadProjectAssets();
    }
  }, [activeProject?.id, user?.uid]);

  const loadProjectAssets = async () => {
    if (!activeProject?.id || !user?.uid) return;
    
    try {
      setLoading(true);
      
      // Lade geteilte Assets
      const shared = await projectService.getProjectSharedAssets(activeProject.id, {
        organizationId: user.uid
      });
      setSharedAssets(shared);
      
      // Sammle alle Assets aus Kampagnen (würde hier über prService erfolgen)
      const allAttachments: CampaignAssetAttachment[] = [];
      
      // Für Demo: Verwende geteilte Assets
      allAttachments.push(...shared);
      
      // Löse Assets auf
      if (allAttachments.length > 0) {
        const resolved = await mediaService.resolveAttachedAssets(
          allAttachments,
          true,
          { organizationId: user.uid }
        );
        setResolvedAssets(resolved);
      } else {
        setResolvedAssets([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asset-Refresh
  const refreshAssets = async () => {
    if (!activeProject?.id || !user?.uid) return;
    
    try {
      setRefreshing(true);
      
      // Asset-Snapshots aktualisieren
      const attachments = resolvedAssets.map(r => r.attachment);
      const refreshed = await mediaService.refreshAssetSnapshots(attachments, {
        organizationId: user.uid,
        userId: user.uid
      });
      
      // Neu auflösen
      const resolved = await mediaService.resolveAttachedAssets(
        refreshed,
        true,
        { organizationId: user.uid }
      );
      setResolvedAssets(resolved);
      
      onAssetsChange?.();
    } catch (error) {
      console.error('Fehler beim Asset-Refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Asset-Sharing
  const shareAssetToProject = async (assetId: string) => {
    if (!activeProject?.id || !user?.uid) return;
    
    try {
      await mediaService.shareAssetToProject(
        assetId,
        activeProject.id,
        { canView: true, canDownload: true, canEdit: false, canDelete: false, canShare: true },
        { organizationId: user.uid, userId: user.uid }
      );
      
      await loadProjectAssets();
      onAssetsChange?.();
    } catch (error) {
      console.error('Fehler beim Asset-Sharing:', error);
    }
  };

  // Bulk-Operationen
  const handleBulkShare = async () => {
    if (selectedAssets.length === 0) return;
    
    try {
      for (const assetId of selectedAssets) {
        await shareAssetToProject(assetId);
      }
      setSelectedAssets([]);
    } catch (error) {
      console.error('Fehler bei Bulk-Share:', error);
    }
  };

  // Filterlogik
  const filteredAssets = resolvedAssets.filter(resolved => {
    const attachment = resolved.attachment;
    const metadata = attachment.metadata;
    
    // Suchfilter
    if (filters.search && !metadata.fileName?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Typ-Filter
    if (filters.type !== 'all') {
      const fileType = metadata.fileType || '';
      switch (filters.type) {
        case 'images':
          if (!fileType.startsWith('image/')) return false;
          break;
        case 'documents':
          if (!fileType.includes('pdf') && !fileType.includes('doc') && !fileType.includes('text')) return false;
          break;
        case 'videos':
          if (!fileType.startsWith('video/')) return false;
          break;
        case 'shared':
          if (!attachment.isProjectWide) return false;
          break;
      }
    }
    
    // Phasen-Filter
    if (filters.phase !== 'all' && metadata.attachedInPhase !== filters.phase) {
      return false;
    }
    
    // Status-Filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'valid':
          if (!resolved.isAvailable || resolved.needsRefresh) return false;
          break;
        case 'needs_refresh':
          if (!resolved.needsRefresh) return false;
          break;
        case 'missing':
          if (resolved.isAvailable) return false;
          break;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('title')}</h3>
          <p className="text-sm text-gray-500">
            {t('assetsCount', { filtered: filteredAssets.length, total: resolvedAssets.length })}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          {selectedAssets.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg">
              <span className="text-sm text-blue-700">
                {t('bulkActions.selected', { count: selectedAssets.length })}
              </span>
              <button
                onClick={handleBulkShare}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {t('bulkActions.share')}
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={refreshAssets}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
            >
              <FolderIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Suche */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Typ-Filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as FilterMode }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('filters.type.all')}</option>
              <option value="images">{t('filters.type.images')}</option>
              <option value="documents">{t('filters.type.documents')}</option>
              <option value="videos">{t('filters.type.videos')}</option>
              <option value="shared">{t('filters.type.shared')}</option>
            </select>
            
            {/* Phasen-Filter */}
            <select
              value={filters.phase}
              onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value as PhaseFilter }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('filters.phase.all')}</option>
              <option value="creation">{t('filters.phase.creation')}</option>
              <option value="approval">{t('filters.phase.approval')}</option>
              <option value="distribution">{t('filters.phase.distribution')}</option>
              <option value="monitoring">{t('filters.phase.monitoring')}</option>
            </select>
            
            {/* Status-Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('filters.status.all')}</option>
              <option value="valid">{t('filters.status.valid')}</option>
              <option value="needs_refresh">{t('filters.status.needsRefresh')}</option>
              <option value="missing">{t('filters.status.missing')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Asset Grid/List */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('empty.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('empty.description')}
          </p>
          <div className="mt-6">
            <button
              onClick={() => {/* TODO: Open Asset Selector */}}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              {t('empty.action')}
            </button>
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
          : 'space-y-2'
        }>
          {filteredAssets.map((resolved) => (
            <AssetCard
              key={resolved.attachment.id}
              resolved={resolved}
              viewMode={viewMode}
              selected={selectedAssets.includes(resolved.attachment.id)}
              onSelect={(selected) => {
                if (selected) {
                  setSelectedAssets(prev => [...prev, resolved.attachment.id]);
                } else {
                  setSelectedAssets(prev => prev.filter(id => id !== resolved.attachment.id));
                }
              }}
              onClick={() => onAssetSelect?.(resolved.attachment)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Asset Card Komponente
interface AssetCardProps {
  resolved: ResolvedAsset;
  viewMode: ViewMode;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  t: any;
}

function AssetCard({ resolved, viewMode, selected, onSelect, onClick, t }: AssetCardProps) {
  const { attachment, isAvailable, hasChanged, needsRefresh, error } = resolved;
  const { metadata } = attachment;

  const getStatusColor = () => {
    if (!isAvailable) return 'text-red-500 bg-red-50';
    if (needsRefresh || hasChanged) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-500 bg-green-50';
  };

  const getStatusIcon = () => {
    if (!isAvailable) return <ExclamationTriangleIcon className="h-4 w-4" />;
    if (needsRefresh || hasChanged) return <ArrowPathIcon className="h-4 w-4" />;
    return <PhotoIcon className="h-4 w-4" />;
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={`flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
          selected ? 'ring-2 ring-blue-500 border-blue-300' : ''
        }`}
        onClick={onClick}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
          className="mr-3"
        />
        
        <div className="flex-shrink-0">
          {metadata.thumbnailUrl ? (
            <img 
              src={metadata.thumbnailUrl} 
              alt={metadata.fileName} 
              className="h-10 w-10 object-cover rounded"
            />
          ) : (
            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
              <PhotoIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {metadata.fileName}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{metadata.fileType}</span>
            {attachment.isProjectWide && (
              <>
                <span>•</span>
                <ShareIcon className="h-3 w-3" />
                <span>{t('card.shared')}</span>
              </>
            )}
            {metadata.attachedInPhase && (
              <>
                <span>•</span>
                <span>{metadata.attachedInPhase}</span>
              </>
            )}
          </div>
        </div>

        <div className={`flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-1">
            {!isAvailable ? t('card.status.missing') : needsRefresh ? t('card.status.update') : t('card.status.ok')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-white border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-colors ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
          className="absolute top-2 left-2 z-10"
        />
        
        {metadata.thumbnailUrl ? (
          <img 
            src={metadata.thumbnailUrl} 
            alt={metadata.fileName} 
            className="w-full h-24 object-cover"
          />
        ) : (
          <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
            <PhotoIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
        
        <div className={`absolute top-2 right-2 flex items-center px-1.5 py-0.5 rounded-full text-xs ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        
        {attachment.isProjectWide && (
          <div className="absolute bottom-2 right-2">
            <ShareIcon className="h-4 w-4 text-blue-500" />
          </div>
        )}
      </div>
      
      <div className="p-2">
        <p className="text-xs font-medium text-gray-900 truncate">
          {metadata.fileName}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {metadata.fileType}
        </p>
      </div>
    </div>
  );
}