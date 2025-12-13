// src/components/projects/monitoring/ClippingsGallery.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { ClippingAsset, MediaClipping } from '@/types/media';
import { mediaService } from '@/lib/firebase/media-service';

interface ClippingsGalleryProps {
  projectId: string;
  organizationId: string;
  className?: string;
}

interface ClippingCardProps {
  clipping: ClippingAsset;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (clipping: ClippingAsset) => void;
}

const ClippingCard: React.FC<ClippingCardProps> = ({
  clipping,
  isSelected,
  onSelect,
  onView
}) => {
  const t = useTranslations('projects.monitoring.clippingsGallery');

  const getSentimentColor = (score: number) => {
    if (score > 0.1) return 'text-green-600 bg-green-50';
    if (score < -0.1) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return '😊';
    if (score < -0.1) return '😞';
    return '😐';
  };

  const publishDate = new Date(clipping.publishDate.seconds * 1000);

  return (
    <div className={`bg-white rounded-lg border ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'} overflow-hidden hover:shadow-md transition-all duration-200`}>
      {/* Screenshot/Preview */}
      <div className="aspect-video bg-gray-100 relative">
        {(clipping as any).screenshot ? (
          <img
            src={(clipping as any).screenshot}
            alt={t('card.screenshotAlt', { outlet: clipping.outlet })}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Auswahl-Checkbox */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(clipping.id!)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Sentiment Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(clipping.sentimentScore)}`}>
          {getSentimentIcon(clipping.sentimentScore)} {clipping.sentimentScore.toFixed(2)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {(clipping as any).title || clipping.fileName}
          </h3>
        </div>

        {/* Outlet & Date */}
        <div className="flex items-center text-xs text-gray-500 mb-3">
          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
          <span className="mr-3">{clipping.outlet}</span>
          <CalendarIcon className="h-3 w-3 mr-1" />
          <span>{publishDate.toLocaleDateString('de-DE')}</span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-500">{t('card.reach')}</div>
            <div className="font-medium text-gray-900">
              {clipping.reachValue.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500">{t('card.mediaValue')}</div>
            <div className="font-medium text-gray-900">
              €{((clipping as any).mediaValue || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => onView(clipping)}
            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <EyeIcon className="h-3 w-3 mr-1" />
            {t('card.view')}
          </button>

          {clipping.url && (
            <a
              href={clipping.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-xs text-gray-500 hover:text-gray-700"
            >
              <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
              {t('card.original')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ClippingFilters;
  onFiltersChange: (filters: ClippingFilters) => void;
  outlets: string[];
}

interface ClippingFilters {
  searchTerm: string;
  outlets: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  sentimentRange: {
    min: number;
    max: number;
  };
  reachMin: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  outlets
}) => {
  const t = useTranslations('projects.monitoring.clippingsGallery.filters');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{t('title')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('search')}
              </label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  searchTerm: e.target.value
                })}
                placeholder={t('searchPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Outlets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('outlets')}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {outlets.map(outlet => (
                  <label key={outlet} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.outlets.includes(outlet)}
                      onChange={(e) => {
                        const newOutlets = e.target.checked
                          ? [...filters.outlets, outlet]
                          : filters.outlets.filter(o => o !== outlet);
                        onFiltersChange({
                          ...filters,
                          outlets: newOutlets
                        });
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{outlet}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('dateRange')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={filters.dateRange.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        from: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.dateRange.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        to: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sentiment Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sentimentRange')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={filters.sentimentRange.min}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      sentimentRange: {
                        ...filters.sentimentRange,
                        min: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder={t('minPlaceholder')}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={filters.sentimentRange.max}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      sentimentRange: {
                        ...filters.sentimentRange,
                        max: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder={t('maxPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Min Reach */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('minReach')}
              </label>
              <input
                type="number"
                min="0"
                value={filters.reachMin}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  reachMin: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('minReachPlaceholder')}
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => onFiltersChange({
                searchTerm: '',
                outlets: [],
                dateRange: {},
                sentimentRange: { min: -1, max: 1 },
                reachMin: 0
              })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('reset')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClippingsGallery: React.FC<ClippingsGalleryProps> = ({
  projectId,
  organizationId,
  className = ''
}) => {
  const t = useTranslations('projects.monitoring.clippingsGallery');
  const [clippings, setClippings] = useState<ClippingAsset[]>([]);
  const [filteredClippings, setFilteredClippings] = useState<ClippingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewingClipping, setViewingClipping] = useState<ClippingAsset | null>(null);

  const [filters, setFilters] = useState<ClippingFilters>({
    searchTerm: '',
    outlets: [],
    dateRange: {},
    sentimentRange: { min: -1, max: 1 },
    reachMin: 0
  });

  // Lade Clippings
  useEffect(() => {
    const loadClippings = async () => {
      try {
        setLoading(true);
        const projectClippings = await mediaService.getProjectClippings(projectId, organizationId);
        setClippings(projectClippings as ClippingAsset[]);
        setFilteredClippings(projectClippings as ClippingAsset[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
        console.error('Clippings loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClippings();
  }, [projectId, organizationId, t]);

  // Filter anwenden
  useEffect(() => {
    let filtered = [...clippings];

    // Suchterm
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        ((c as any).title?.toLowerCase().includes(searchLower)) ||
        (c.description?.toLowerCase().includes(searchLower)) ||
        c.outlet.toLowerCase().includes(searchLower)
      );
    }

    // Outlets
    if (filters.outlets.length > 0) {
      filtered = filtered.filter(c => filters.outlets.includes(c.outlet));
    }

    // Datum
    if (filters.dateRange.from) {
      filtered = filtered.filter(c => 
        new Date(c.publishDate.seconds * 1000) >= filters.dateRange.from!
      );
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter(c => 
        new Date(c.publishDate.seconds * 1000) <= filters.dateRange.to!
      );
    }

    // Sentiment
    filtered = filtered.filter(c => 
      c.sentimentScore >= filters.sentimentRange.min && 
      c.sentimentScore <= filters.sentimentRange.max
    );

    // Reichweite
    if (filters.reachMin > 0) {
      filtered = filtered.filter(c => c.reachValue >= filters.reachMin);
    }

    setFilteredClippings(filtered);
  }, [clippings, filters]);

  // Unique Outlets für Filter
  const uniqueOutlets = Array.from(new Set(clippings.map(c => c.outlet))).sort();

  const handleSelectAll = () => {
    if (selectedIds.size === filteredClippings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClippings.map(c => c.id!).filter(Boolean)));
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;

    try {
      const selectedClippingIds = Array.from(selectedIds);
      const blob = await mediaService.exportClippings(
        selectedClippingIds, 
        'csv',
        { organizationId, userId: 'current-user' } // TODO: Get actual user ID
      );
      
      // Download blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clippings-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{t('error', { error })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('count', { filtered: filteredClippings.length, total: clippings.length })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder={t('searchPlaceholder')}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            {t('filterButton')}
          </button>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkExport}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              {t('exportButton', { count: selectedIds.size })}
            </button>
          )}
        </div>
      </div>

      {/* Select All */}
      {filteredClippings.length > 0 && (
        <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredClippings.length && filteredClippings.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              {t('selectAll', { count: filteredClippings.length })}
            </span>
          </label>
        </div>
      )}

      {/* Gallery Grid */}
      {filteredClippings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClippings.map((clipping) => (
            <ClippingCard
              key={clipping.id}
              clipping={clipping}
              isSelected={selectedIds.has(clipping.id!)}
              onSelect={(id) => {
                const newSelected = new Set(selectedIds);
                if (newSelected.has(id)) {
                  newSelected.delete(id);
                } else {
                  newSelected.add(id);
                }
                setSelectedIds(newSelected);
              }}
              onView={setViewingClipping}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('empty.title')}
          </h3>
          <p className="text-gray-500">
            {filters.searchTerm || filters.outlets.length > 0 || filters.reachMin > 0
              ? t('empty.tryOtherFilters')
              : t('empty.noClippings')
            }
          </p>
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        outlets={uniqueOutlets}
      />

      {/* Clipping Detail Modal (Placeholder) */}
      {viewingClipping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {(viewingClipping as any).title || viewingClipping.fileName}
                </h3>
                <button
                  onClick={() => setViewingClipping(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{t('detail.outlet')}:</span> {viewingClipping.outlet}
                  </div>
                  <div>
                    <span className="font-medium">{t('detail.date')}:</span> {new Date(viewingClipping.publishDate.seconds * 1000).toLocaleDateString('de-DE')}
                  </div>
                  <div>
                    <span className="font-medium">{t('detail.reach')}:</span> {viewingClipping.reachValue.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">{t('detail.sentiment')}:</span> {viewingClipping.sentimentScore.toFixed(2)}
                  </div>
                </div>

                {viewingClipping.description && (
                  <div>
                    <h4 className="font-medium mb-2">{t('detail.content')}:</h4>
                    <p className="text-gray-700 text-sm">{viewingClipping.description}</p>
                  </div>
                )}

                {(viewingClipping as any).screenshot && (
                  <div>
                    <h4 className="font-medium mb-2">{t('detail.screenshot')}:</h4>
                    <img
                      src={(viewingClipping as any).screenshot}
                      alt={t('detail.screenshotAlt')}
                      className="w-full border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClippingsGallery;