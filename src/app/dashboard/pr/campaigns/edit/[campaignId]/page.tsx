// src/app/dashboard/pr/campaigns/edit/[campaignId]/page.tsx - VOLLSTÄNDIG ÜBERARBEITET
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listsService } from '@/lib/firebase/lists-service';
import { prService } from '@/lib/firebase/pr-service';
import { mediaService } from '@/lib/firebase/media-service';
import { DistributionList } from '@/types/lists';
import { PRCampaign, CampaignAssetAttachment } from '@/types/pr';
import { MediaAsset, MediaFolder } from '@/types/media';
import { GenerationResult } from '@/types/ai';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field, Description } from '@/components/fieldset';
import { Label } from '@/components/label'; 
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { CustomerBadge } from '@/components/pr/CustomerSelector';
import { Badge } from '@/components/badge';
import { Checkbox } from '@/components/checkbox';
import Link from 'next/link';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ClockIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowLeftIcon,
  XCircleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";
import clsx from 'clsx';

// Dynamic import für das strukturierte Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

// Toast Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Toast Notification Component
function ToastNotification({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-50">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-up`}
            style={{ minWidth: '320px' }}
          >
            <div className="flex">
              <Icon className={`h-5 w-5 ${iconColors[toast.type]} mr-3 flex-shrink-0`} />
              <div className="flex-1">
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 flex-shrink-0 rounded-md hover:opacity-70 focus:outline-none"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Toast Hook
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration: 5000 };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

// Enhanced Asset Selector Modal (same as in new campaign)
function EnhancedAssetSelector({ 
  isOpen, 
  onClose, 
  clientId,
  clientName,
  onAssetsSelected,
  existingAssets = []
}: { 
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
  existingAssets?: CampaignAssetAttachment[];
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Initialize with existing assets
  useEffect(() => {
    if (isOpen && existingAssets.length > 0) {
      const existing = new Set<string>();
      existingAssets.forEach(asset => {
        if (asset.type === 'asset' && asset.assetId) {
          existing.add(asset.assetId);
        } else if (asset.type === 'folder' && asset.folderId) {
          existing.add(asset.folderId);
        }
      });
      setSelectedItems(existing);
    }
  }, [isOpen, existingAssets]);

  useEffect(() => {
    if (isOpen && user && clientId) {
      loadClientMedia();
    }
  }, [isOpen, user, clientId]);

  const loadClientMedia = async () => {
    if (!user || !clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { assets: clientAssets, folders: clientFolders } = await mediaService.getMediaByClientId(
        user.uid,
        clientId
      );
      
      setAssets(clientAssets);
      setFolders(clientFolders);
      
    } catch (error) {
      console.error('Fehler beim Laden der Medien:', error);
      setError('Fehler beim Laden der Medien. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = [...assets];
    
    // Type filter
    if (filterType === 'images') {
      filtered = filtered.filter(a => a.fileType?.startsWith('image/'));
    } else if (filterType === 'documents') {
      filtered = filtered.filter(a => !a.fileType?.startsWith('image/'));
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.fileName.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [assets, filterType, searchTerm]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    const allIds = new Set([
      ...filteredAssets.map(a => a.id!),
      ...folders.map(f => f.id!)
    ]);
    setSelectedItems(allIds);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleConfirm = () => {
    const attachments: CampaignAssetAttachment[] = [];
    
    // Add assets
    assets.forEach(asset => {
      if (selectedItems.has(asset.id!)) {
        attachments.push({
          id: `asset-${asset.id}`,
          type: 'asset',
          assetId: asset.id,
          metadata: {
            fileName: asset.fileName,
            fileType: asset.fileType,
            description: asset.description || '',
            thumbnailUrl: asset.downloadUrl
          },
          attachedAt: null as any,
          attachedBy: user?.uid || ''
        });
      }
    });

    // Add folders
    folders.forEach(folder => {
      if (selectedItems.has(folder.id!)) {
        attachments.push({
          id: `folder-${folder.id}`,
          type: 'folder',
          folderId: folder.id,
          metadata: {
            folderName: folder.name,
            description: folder.description || ''
          },
          attachedAt: null as any,
          attachedBy: user?.uid || ''
        });
      }
    });

    onAssetsSelected(attachments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col transform transition-all animate-modal-appear">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Medien auswählen</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Wähle Medien von {clientName || 'diesem Kunden'} aus
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="px-6 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Suchen..."
                    className="pl-9 pr-3 py-1.5 text-sm w-64"
                  />
                </div>

                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value="all">Alle Typen</option>
                  <option value="images">Nur Bilder</option>
                  <option value="documents">Nur Dokumente</option>
                </select>

                {/* Selection Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button plain onClick={selectAll} className="text-xs">
                    Alle auswählen
                  </Button>
                  <Button plain onClick={deselectAll} className="text-xs">
                    Auswahl aufheben
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedItems.size > 0 && (
                  <Badge color="indigo">
                    {selectedItems.size} ausgewählt
                  </Badge>
                )}

                {/* View Toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded">
                  <button
                    onClick={() => setView('grid')}
                    className={clsx(
                      "p-1 rounded transition-colors",
                      view === 'grid' ? "bg-white shadow" : "hover:bg-gray-200"
                    )}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={clsx(
                      "p-1 rounded transition-colors",
                      view === 'list' ? "bg-white shadow" : "hover:bg-gray-200"
                    )}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Lade Medien...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadClientMedia}>Erneut versuchen</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Folders */}
                {folders.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Ordner</h4>
                    <div className={clsx(
                      view === 'grid' 
                        ? "grid grid-cols-2 md:grid-cols-3 gap-3" 
                        : "space-y-2"
                    )}>
                      {folders.map(folder => (
                        <button
                          key={`folder-${folder.id}`}
                          onClick={() => toggleSelection(folder.id!)}
                          className={clsx(
                            "text-left transition-all",
                            view === 'grid' 
                              ? "p-4 rounded-lg border-2" 
                              : "w-full p-3 rounded-lg border flex items-center justify-between",
                            selectedItems.has(folder.id!)
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <div className={clsx(view === 'list' && "flex items-center gap-3")}>
                            <FolderIcon className={clsx(
                              "text-gray-400",
                              view === 'grid' ? "h-8 w-8 mx-auto mb-2" : "h-6 w-6"
                            )} />
                            <div>
                              <p className="text-sm font-medium truncate">{folder.name}</p>
                              {folder.description && (
                                <p className="text-xs text-gray-500 truncate">{folder.description}</p>
                              )}
                            </div>
                          </div>
                          {view === 'list' && selectedItems.has(folder.id!) && (
                            <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {filteredAssets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Dateien ({filteredAssets.length})
                    </h4>
                    <div className={clsx(
                      view === 'grid' 
                        ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" 
                        : "space-y-2"
                    )}>
                      {filteredAssets.map((asset, index) => (
                        <button
                          key={`asset-${asset.id}`}
                          onClick={() => toggleSelection(asset.id!)}
                          className={clsx(
                            "text-left transition-all relative group",
                            view === 'grid' 
                              ? "p-3 rounded-lg border-2" 
                              : "w-full p-3 rounded-lg border flex items-center justify-between",
                            selectedItems.has(asset.id!)
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {view === 'grid' ? (
                            <>
                              {asset.fileType?.startsWith('image/') ? (
                                <img 
                                  src={asset.downloadUrl} 
                                  alt={asset.fileName}
                                  className="h-16 w-full object-cover rounded mb-2"
                                />
                              ) : (
                                <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                              )}
                              <p className="text-xs font-medium truncate">{asset.fileName}</p>
                              {selectedItems.has(asset.id!) && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircleIcon className="h-5 w-5 text-indigo-600 bg-white rounded-full" />
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                {asset.fileType?.startsWith('image/') ? (
                                  <img 
                                    src={asset.downloadUrl} 
                                    alt={asset.fileName}
                                    className="h-10 w-10 object-cover rounded"
                                  />
                                ) : (
                                  <DocumentIcon className="h-10 w-10 text-gray-400" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{asset.fileName}</p>
                                  <p className="text-xs text-gray-500">
                                    {asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
                                  </p>
                                </div>
                              </div>
                              {selectedItems.has(asset.id!) && (
                                <CheckCircleIcon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                              )}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {assets.length === 0 && folders.length === 0 && (
                  <div className="text-center py-12">
                    <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Keine Medien für diesen Kunden gefunden</p>
                    <Link 
                      href={`/dashboard/mediathek?uploadFor=${clientId}`}
                      target="_blank"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      Medien in neuem Tab hochladen
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedItems.size} von {assets.length + folders.length} ausgewählt
              </p>
              <div className="flex gap-3">
                <Button plain onClick={onClose}>
                  Abbrechen
                </Button>
                <Button 
                  color="indigo" 
                  onClick={handleConfirm}
                  disabled={selectedItems.size === 0}
                >
                  Auswahl übernehmen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Multi-List Selector Component
function MultiListSelector({
  availableLists,
  selectedListIds,
  onChange,
  loading,
  error
}: {
  availableLists: DistributionList[];
  selectedListIds: string[];
  onChange: (selectedIds: string[]) => void;
  loading: boolean;
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredLists = useMemo(() => {
    if (!searchTerm) return availableLists;
    const search = searchTerm.toLowerCase();
    return availableLists.filter(list => 
      list.name.toLowerCase().includes(search)
    );
  }, [availableLists, searchTerm]);

  const selectedLists = useMemo(() => 
    availableLists.filter(list => selectedListIds.includes(list.id!)),
    [availableLists, selectedListIds]
  );

  const totalRecipients = useMemo(() => 
    selectedLists.reduce((sum, list) => sum + list.contactCount, 0),
    [selectedLists]
  );

  const toggleList = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      onChange(selectedListIds.filter(id => id !== listId));
    } else {
      onChange([...selectedListIds, listId]);
    }
  };

  const selectAll = () => {
    onChange(availableLists.map(list => list.id!));
  };

  const deselectAll = () => {
    onChange([]);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  return (
    <Field>
      <Label className="text-base font-semibold">Verteiler</Label>
      
      {/* Selected Lists Display */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className={clsx(
            "w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            error ? "border-red-300" : "border-gray-300",
            "cursor-pointer hover:border-gray-400"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
              {selectedLists.length > 0 ? (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {selectedLists.length} Verteiler ausgewählt
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalRecipients.toLocaleString()} Empfänger insgesamt
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">Verteiler wählen...</span>
              )}
            </div>
            {selectedLists.length > 0 && (
              <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
            )}
          </div>
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Liste suchen..."
                    className="pl-9 pr-3 py-2"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-2 border-b flex gap-2">
                <Button plain onClick={selectAll} className="text-xs flex-1">
                  Alle auswählen
                </Button>
                <Button plain onClick={deselectAll} className="text-xs flex-1">
                  Keine auswählen
                </Button>
              </div>

              {/* List Items */}
              <div className="max-h-64 overflow-y-auto">
                {filteredLists.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Keine Listen gefunden
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredLists.map((list) => {
                      const isSelected = selectedListIds.includes(list.id!);
                      
                      return (
                        <li key={list.id}>
                          <label
                            className={clsx(
                              "flex items-center px-3 py-2 cursor-pointer",
                              "hover:bg-gray-50",
                              isSelected && "bg-indigo-50"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleList(list.id!)}
                              className="mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={clsx(
                                "font-medium truncate",
                                isSelected ? "text-indigo-900" : "text-gray-900"
                              )}>
                                {list.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {list.contactCount} Kontakte
                                </span>
                                {list.type === 'dynamic' && (
                                  <Badge color="blue" className="text-xs">
                                    Dynamisch
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
                {selectedLists.length} von {availableLists.length} Listen ausgewählt
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Selected Lists Details */}
      {selectedLists.length > 0 && (
        <div className="mt-3 space-y-2">
          {selectedLists.map(list => (
            <div key={list.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{list.name}</p>
                <p className="text-xs text-gray-500">
                  {list.contactCount} Kontakte
                  {list.type === 'dynamic' && ' • Dynamisch'}
                </p>
              </div>
              <button
                onClick={() => toggleList(list.id!)}
                className="text-red-600 hover:text-red-500"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm">
            <p>
              <strong>{totalRecipients.toLocaleString()} Empfänger</strong> in {selectedLists.length} Listen.
            </p>
          </div>
        </div>
      )}
    </Field>
  );
}

// Auto-Save Hook
function useAutoSave(
  data: any, 
  onSave: () => Promise<void>,
  enabled: boolean = false
) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (!enabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setSaveStatus('saving');
    
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave();
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
      }
    }, 2000); // 2s debounce
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, onSave]);
  
  return { saveStatus, lastSaved };
}

// Auto-Save Indicator
function AutoSaveIndicator({ 
  status, 
  lastSaved 
}: { 
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
}) {
  return (
    <div className="flex items-center text-sm">
      {status === 'saving' && (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-2" />
          <span className="text-gray-600">Speichert...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 animate-scale-in" />
          <span className="text-green-600">Gespeichert</span>
        </>
      )}
      {status === 'error' && (
        <>
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
          <span className="text-red-600">Fehler beim Speichern</span>
        </>
      )}
      {status === 'idle' && lastSaved && (
        <span className="text-gray-500">
          Zuletzt gespeichert {formatRelativeTime(lastSaved)}
        </span>
      )}
    </div>
  );
}

// Helper function
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'gerade eben';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`;
  return `vor ${Math.floor(seconds / 3600)} Std.`;
}

// Floating Action Button
function FloatingActionButton({
  onAiClick,
  onPreviewClick,
  onSaveClick,
  disabled
}: {
  onAiClick: () => void;
  onPreviewClick: () => void;
  onSaveClick: () => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-2 animate-fade-in-up">
          <button
            onClick={() => {
              onAiClick();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
          >
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium">KI-Assistent</span>
          </button>
          
          <button
            onClick={() => {
              onPreviewClick();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
          >
            <EyeIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Vorschau</span>
          </button>
          
          <button
            onClick={() => {
              onSaveClick();
              setIsOpen(false);
            }}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all whitespace-nowrap disabled:opacity-50"
          >
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Speichern</span>
          </button>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "rounded-full p-4 shadow-lg transition-all duration-300",
          isOpen 
            ? "bg-gray-600 rotate-45" 
            : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl"
        )}
      >
        <PlusIcon className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

// Keyboard Shortcuts Hook
function useKeyboardShortcuts({
  onSave,
  onAiModal,
  onCloseModals
}: {
  onSave: () => void;
  onAiModal: () => void;
  onCloseModals: () => void;
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S = Speichern
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      
      // Cmd/Ctrl + K = KI-Assistent
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onAiModal();
      }
      
      // Escape = Modal schließen
      if (e.key === 'Escape') {
        onCloseModals();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSave, onAiModal, onCloseModals]);
}

// Main Component
export default function EditPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const { toasts, showToast, removeToast } = useToast();

  // Form State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMetadata, setAiMetadata] = useState<any>(null);

  // Asset Selector State
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  // Selected lists info
  const selectedLists = useMemo(() => 
    availableLists.filter(list => selectedListIds.includes(list.id!)),
    [availableLists, selectedListIds]
  );

  const totalRecipients = useMemo(() => 
    selectedLists.reduce((sum, list) => sum + list.contactCount, 0),
    [selectedLists]
  );

  const loadCampaignData = useCallback(async () => {
    if (!user || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [campaignData, listsData] = await Promise.all([
        prService.getById(campaignId),
        listsService.getAll(user.uid)
      ]);

      if (!campaignData) {
        setError("Kampagne nicht gefunden.");
        setLoading(false);
        return;
      }

      setCampaign(campaignData);
      setAvailableLists(listsData);
      
      // Formular-Felder mit den geladenen Daten befüllen
      setCampaignTitle(campaignData.title);
      
      // Multi-List Support: Prüfe neue und alte Felder
      if (campaignData.distributionListIds && campaignData.distributionListIds.length > 0) {
        setSelectedListIds(campaignData.distributionListIds);
      } else {
        // Fallback auf Legacy-Feld
        setSelectedListIds([campaignData.distributionListId]);
      }
      
      setPressReleaseContent(campaignData.contentHtml);
      setAttachedAssets(campaignData.attachedAssets || []);

      // KI-Metadata laden (falls vorhanden)
      try {
        const metadata = localStorage.getItem(`campaign_ai_metadata_${campaignId}`);
        if (metadata) {
          setAiMetadata(JSON.parse(metadata));
        }
      } catch (e) {
        // Ignoriere Fehler beim Laden der Metadata
      }

    } catch (err) {
      console.error("Fehler beim Laden der Kampagne:", err);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const isFormValid = selectedListIds.length > 0 && campaignTitle.trim() !== '' && pressReleaseContent.trim() !== '' && pressReleaseContent !== '<p></p>';

  const handleUpdate = async () => {
    if (!isFormValid || !campaign || selectedLists.length === 0) return;

    setIsSaving(true);
    try {
      // Remove attachedAt from each asset
      const cleanedAssets = attachedAssets.map(({ attachedAt, ...rest }) => rest);

      // Für Rückwärtskompatibilität: Verwende die erste Liste als Haupt-Liste
      const primaryList = selectedLists[0];

      const updatedData = {
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        
        // Legacy fields (für Rückwärtskompatibilität)
        distributionListId: primaryList.id!,
        distributionListName: primaryList.name,
        
        // Neue Multi-List fields
        distributionListIds: selectedListIds,
        distributionListNames: selectedLists.map(l => l.name),
        
        recipientCount: totalRecipients,
        attachedAssets: cleanedAssets,
      };
      
      await prService.update(campaign.id!, updatedData);
      
      showToast('success', 'Kampagne gespeichert!', 'Alle Änderungen wurden übernommen.');

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      showToast('error', 'Fehler beim Speichern', 'Die Kampagne konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-Save
  const { saveStatus, lastSaved } = useAutoSave(
    { campaignTitle, pressReleaseContent, selectedListIds, attachedAssets },
    async () => {
      if (campaign && selectedLists.length > 0) {
        const primaryList = selectedLists[0];
        
        await prService.update(campaign.id!, {
          title: campaignTitle,
          contentHtml: pressReleaseContent,
          distributionListId: primaryList.id!,
          distributionListName: primaryList.name,
          distributionListIds: selectedListIds,
          distributionListNames: selectedLists.map(l => l.name),
          recipientCount: totalRecipients,
          attachedAssets: attachedAssets
        });
      }
    },
    !!campaign && isFormValid
  );

  // Asset Management
  const handleAssetsSelected = async (newAssets: CampaignAssetAttachment[]) => {
    try {
      await prService.attachAssets(campaign!.id!, newAssets);
      setAttachedAssets([...attachedAssets, ...newAssets]);
      showToast('success', `${newAssets.length} Medien hinzugefügt`);
    } catch (error) {
      console.error('Fehler beim Anhängen der Assets:', error);
      showToast('error', 'Fehler beim Anhängen der Medien');
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    try {
      const asset = attachedAssets.find(a => 
        (a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId)
      );
      
      if (!asset) return;
      
      await prService.removeAssets(campaign!.id!, [assetId]);
      setAttachedAssets(attachedAssets.filter(a => a !== asset));
      showToast('info', 'Medium entfernt');
      
    } catch (error) {
      console.error('Fehler beim Entfernen des Assets:', error);
      showToast('error', 'Fehler beim Entfernen');
    }
  };

  // KI-Content Handler
  const handleAiGenerate = (result: GenerationResult) => {
    console.log('🤖 AI Generation Result (Edit Mode):', result);

    if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }
    setPressReleaseContent(result.content);

    if (result.metadata) {
      setAiMetadata({
        generatedBy: result.metadata.generatedBy,
        timestamp: result.metadata.timestamp,
        context: result.metadata.context
      });

      if (campaign?.id) {
        localStorage.setItem(`campaign_ai_metadata_${campaign.id}`, JSON.stringify({
          generatedBy: result.metadata.generatedBy,
          timestamp: result.metadata.timestamp,
          context: result.metadata.context
        }));
      }
    }

    setShowAiModal(false);
    showToast('success', 'KI-Generierung erfolgreich!', 'Die Inhalte wurden übernommen.');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleUpdate,
    onAiModal: () => setShowAiModal(true),
    onCloseModals: () => {
      setShowAssetSelector(false);
      setShowAiModal(false);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-indigo-600 rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Kampagnen-Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
        <div className="mt-4">
          <Link href="/dashboard/pr">
            <Button>Zurück zur Übersicht</Button>
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
          <div>
            <Heading>Kampagne bearbeiten</Heading>
            <Text className="mt-1">Du bearbeitest den Entwurf: "{campaign?.title}"</Text>
            
            {/* Campaign Metadata */}
            {campaign && (
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Erstellt: {campaign.createdAt?.toDate().toLocaleDateString('de-DE')}
                </div>
                {campaign.clientId && (
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <CustomerBadge 
                      customerId={campaign.clientId} 
                      customerName={campaign.clientName}
                      showIcon={false}
                    />
                  </div>
                )}
                {aiMetadata && (
                  <div className="flex items-center text-indigo-600">
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    KI-generiert: {new Date(aiMetadata.timestamp).toLocaleDateString('de-DE')}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Auto-Save Indicator */}
          <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 border rounded-lg bg-white">
            {/* Customer Info - READ ONLY */}
            {campaign?.clientId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-gray-600">Kunde</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {campaign.clientName || 'Unbekannter Kunde'}
                      </span>
                      <CustomerBadge 
                        customerId={campaign.clientId} 
                        customerName={campaign.clientName}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      href={`/dashboard/mediathek?clientId=${campaign.clientId}`}
                      target="_blank"
                    >
                      <Button plain className="text-sm">
                        <PhotoIcon className="h-4 w-4 mr-1" />
                        Medien verwalten
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-List Selector */}
            <MultiListSelector
              availableLists={availableLists}
              selectedListIds={selectedListIds}
              onChange={setSelectedListIds}
              loading={loading}
            />

            <div className="border-t pt-8 mt-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-semibold">Pressemitteilung</h3>
                  <Text>Bearbeite den Titel und den Inhalt deiner Mitteilung.</Text>
                  
                  {/* KI-Metadata */}
                  {aiMetadata && (
                    <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                      <div className="flex items-center text-indigo-700">
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">Von KI generiert</span>
                        <span className="ml-2">
                          {new Date(aiMetadata.timestamp).toLocaleString('de-DE')}
                        </span>
                        {aiMetadata.context?.industry && (
                          <span className="ml-2 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                            {aiMetadata.context.industry}
                          </span>
                        )}
                        {aiMetadata.context?.tone && (
                          <span className="ml-1 px-2 py-0.5 bg-indigo-100 rounded text-xs">
                            {aiMetadata.context.tone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  <SparklesIcon className="w-5 h-5"/>
                  KI-Assistent verwenden
                </Button>
              </div>
              
              <div className="mt-4 space-y-4">
                <Field>
                  <Label>Titel / Betreffzeile</Label>
                  <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
                </Field>
                <Field>
                  <Label>Inhalt</Label>
                  <RichTextEditor content={pressReleaseContent} onChange={setPressReleaseContent} />
                </Field>
              </div>
            </div>

            {/* Assets Section */}
            <div className="border-t pt-8 mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold">
                    <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                    Medien anhängen
                  </h3>
                  <Text>
                    Füge Bilder, Dokumente und andere Medien zu deiner Kampagne hinzu.
                  </Text>
                </div>
                
                {campaign?.clientId && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowAssetSelector(true)}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Medien auswählen
                    </Button>
                    <Link
                      href={`/dashboard/mediathek?uploadFor=${campaign.clientId}`}
                      target="_blank"
                    >
                      <Button plain className="flex items-center gap-2">
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        Neue hochladen
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Attached Assets */}
              {attachedAssets.length > 0 ? (
                <div className="space-y-3">
                  {attachedAssets.map((attachment, index) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-3">
                        {attachment.type === 'folder' ? (
                          <FolderIcon className="h-6 w-6 text-gray-400" />
                        ) : attachment.metadata.fileType?.startsWith('image/') ? (
                          <img
                            src={attachment.metadata.thumbnailUrl}
                            alt={attachment.metadata.fileName}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <DocumentIcon className="h-6 w-6 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {attachment.metadata.fileName || attachment.metadata.folderName}
                          </p>
                          {attachment.metadata.description && (
                            <p className="text-xs text-gray-500">{attachment.metadata.description}</p>
                          )}
                        </div>
                        {attachment.type === 'folder' && (
                          <Badge color="blue" className="text-xs">Ordner</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveAsset(attachment.assetId || attachment.folderId || '')}
                        className="text-red-600 hover:text-red-500 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Noch keine Medien angehängt</p>
                  {!campaign?.clientId && (
                    <p className="text-sm text-gray-400 mt-1">
                      Wähle zuerst einen Kunden aus, um Medien anzuhängen
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/pr">
              <Button plain>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
              </Button>
            </Link>
            <Button color="indigo" disabled={!isFormValid || isSaving} onClick={handleUpdate}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichert...
                </>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-6 bg-white rounded-lg shadow-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Kampagnen-Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge color="zinc" className="mt-1">
                  {campaign?.status === 'draft' ? 'Entwurf' : campaign?.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Kunde</p>
                <p className="font-medium">
                  {campaign?.clientName || 'Nicht zugeordnet'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Verteiler</p>
                {selectedLists.length > 0 ? (
                  <div className="mt-1">
                    <p className="font-medium">{selectedLists.length} Listen</p>
                    <p className="text-sm text-gray-500">
                      {totalRecipients.toLocaleString()} Empfänger
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">Keine Listen ausgewählt</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Medien</p>
                <p className={clsx("font-medium", attachedAssets.length === 0 && "text-gray-400")}>
                  {attachedAssets.length > 0 
                    ? `${attachedAssets.length} Medien angehängt`
                    : "Keine Medien"
                  }
                </p>
              </div>

              {aiMetadata && (
                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-indigo-600">
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    KI-generiert
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs font-medium text-gray-600 mb-2">Tastenkürzel</p>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Speichern</span>
                  <span className="font-mono">⌘ S</span>
                </div>
                <div className="flex justify-between">
                  <span>KI-Assistent</span>
                  <span className="font-mono">⌘ K</span>
                </div>
                <div className="flex justify-between">
                  <span>Modal schließen</span>
                  <span className="font-mono">Esc</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <Link href={`/dashboard/pr/campaigns/${campaign?.id}`}>
                <Button plain className="w-full justify-center">
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Vorschau anzeigen
                </Button>
              </Link>
              {campaign?.status === 'draft' && (
                <Button 
                  className="w-full justify-center"
                  onClick={() => showToast('info', 'Coming soon!', 'E-Mail-Versand wird bald verfügbar sein.')}
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Jetzt versenden
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selector Modal */}
      {campaign?.clientId && (
        <EnhancedAssetSelector
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={campaign.clientId}
          clientName={campaign.clientName}
          onAssetsSelected={handleAssetsSelected}
          existingAssets={attachedAssets}
        />
      )}

      {/* Strukturiertes KI-Modal */}
      {showAiModal && (
        <StructuredGenerationModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          existingContent={{
            title: campaignTitle,
            content: pressReleaseContent
          }}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onAiClick={() => setShowAiModal(true)}
        onPreviewClick={() => router.push(`/dashboard/pr/campaigns/${campaign?.id}`)}
        onSaveClick={handleUpdate}
        disabled={!isFormValid || isSaving}
      />

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-modal-appear {
          animation: modal-appear 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}