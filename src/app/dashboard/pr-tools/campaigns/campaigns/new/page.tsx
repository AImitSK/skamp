// src\app\dashboard\pr-tools\campaigns\campaigns\new\page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { Field } from '@/components/fieldset';
import { Label } from '@/components/label'; 
import { Input } from '@/components/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Badge } from '@/components/badge';
import { Checkbox } from '@/components/checkbox';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  CheckIcon,
  ArrowLeftIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  LinkIcon
} from "@heroicons/react/20/solid";
import Link from 'next/link';
import clsx from 'clsx';

// Import Customer Selector
import { CustomerSelector } from '@/components/pr/CustomerSelector';

// Dynamic import für das neue Modal
import dynamic from 'next/dynamic';
const StructuredGenerationModal = dynamic(() => import('@/components/pr/ai/StructuredGenerationModal'), {
  ssr: false
});

// Modal für Freigabe-Link Anzeige
function ApprovalLinkModal({ 
  isOpen, 
  onClose, 
  approvalUrl, 
  campaignTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  approvalUrl: string; 
  campaignTitle: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(approvalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Freigabe angefordert!
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Die Kampagne "{campaignTitle}" wurde zur Freigabe gesendet.
                </p>
              </div>
            </div>

            {/* Freigabe-Link */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Freigabe-Link für den Kunden:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={approvalUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono select-all"
                />
                <Button
                  onClick={handleCopy}
                  className="flex items-center gap-2"
                  color={copied ? 'zinc' : 'indigo'}
                >
                  {copied ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Hinweise */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Nächste Schritte:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Senden Sie diesen Link an Ihren Kunden</li>
                <li>• Der Kunde kann die Pressemitteilung prüfen</li>
                <li>• Sie werden benachrichtigt, sobald eine Entscheidung getroffen wurde</li>
                <li>• Die Kampagne kann erst nach Freigabe versendet werden</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1"
                color="indigo"
              >
                Zum Freigaben-Center
              </Button>
              <Button
                plain
                onClick={() => {
                  window.location.href = '/dashboard/pr';
                }}
              >
                Zur Übersicht
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    info: ExclamationTriangleIcon
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

// Animated Progress Steps
function AnimatedProgressSteps({ 
  steps, 
  currentStepIndex 
}: { 
  steps: Array<{ id: string; name: string; icon: any; completed: boolean }>;
  currentStepIndex: number;
}) {
  return (
    <div className="relative mb-8">
      {/* Progress Line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out"
          style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = step.completed;
          
          return (
            <div 
              key={step.id}
              className={`flex flex-col items-center transition-all duration-300 ${
                isActive ? 'scale-110' : ''
              }`}
            >
              <div className={clsx(
                "rounded-full p-3 transition-all duration-300 transform",
                isCompleted && "bg-green-500 scale-100",
                isActive && !isCompleted && "bg-indigo-600 shadow-lg shadow-indigo-500/50 animate-pulse",
                !isCompleted && !isActive && "bg-gray-200"
              )}>
                {isCompleted ? (
                  <CheckCircleIcon className="h-6 w-6 text-white animate-scale-in" />
                ) : (
                  <Icon className={clsx("h-6 w-6", isActive ? "text-white" : "text-gray-400")} />
                )}
              </div>
              <span className={clsx(
                "mt-2 text-sm font-medium transition-colors",
                isActive && "text-indigo-600",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-gray-400"
              )}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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

// Enhanced Asset Selector Modal
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
          attachedAt: new Date() as any, // Proper timestamp
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
          attachedAt: new Date() as any, // Proper timestamp
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
      <Label>
        Verteiler auswählen
        <span className="text-red-500 ml-1">*</span>
      </Label>
      
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
export default function NewPRCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [availableLists, setAvailableLists] = useState<DistributionList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [pressReleaseContent, setPressReleaseContent] = useState('');
  
  // Assets State
  const [attachedAssets, setAttachedAssets] = useState<CampaignAssetAttachment[]>([]);
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  // NEU: Freigabe-bezogene States
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState('');

  // KI-Assistent State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerationHistory, setAiGenerationHistory] = useState<GenerationResult[]>([]);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);

  // Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Draft State for Auto-Save
  const [draftId, setDraftId] = useState<string | null>(null);

  // Load lists
  useEffect(() => {
    if (user) {
      setLoading(true);
      listsService.getAll(user.uid)
        .then(setAvailableLists)
        .catch((error) => {
          console.error('Fehler beim Laden der Listen:', error);
          showToast('error', 'Fehler beim Laden', 'Die Verteilerlisten konnten nicht geladen werden.');
        })
        .finally(() => setLoading(false));
    }
  }, [user, showToast]);

  // Selected lists info
  const selectedLists = useMemo(() => 
    availableLists.filter(list => selectedListIds.includes(list.id!)),
    [availableLists, selectedListIds]
  );

  const totalRecipients = useMemo(() => 
    selectedLists.reduce((sum, list) => sum + list.contactCount, 0),
    [selectedLists]
  );

  // Form validity
  const isFormValid = useMemo(() => {
    return !!(
      selectedCustomerId &&
      selectedListIds.length > 0 &&
      campaignTitle.trim() &&
      pressReleaseContent.trim() &&
      pressReleaseContent !== '<p></p>'
    );
  }, [selectedCustomerId, selectedListIds, campaignTitle, pressReleaseContent]);

  // Progress steps
  const steps = [
    { 
      id: 'customer', 
      name: 'Kunde', 
      icon: BuildingOfficeIcon,
      completed: !!selectedCustomerId 
    },
    { 
      id: 'lists', 
      name: 'Verteiler', 
      icon: UsersIcon,
      completed: selectedListIds.length > 0 
    },
    { 
      id: 'content', 
      name: 'Inhalt', 
      icon: DocumentTextIcon,
      completed: !!campaignTitle && !!pressReleaseContent 
    },
    {
      id: 'media',
      name: 'Medien',
      icon: PhotoIcon,
      completed: attachedAssets.length > 0
    },
    {
      id: 'approval',
      name: 'Freigabe',
      icon: CheckCircleIcon,
      completed: approvalRequired
    }
  ];

  const currentStepIndex = steps.findIndex(step => !step.completed);

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedCustomerId) {
      errors.customer = 'Bitte wählen Sie einen Kunden aus';
    }
    if (selectedListIds.length === 0) {
      errors.lists = 'Bitte wählen Sie mindestens einen Verteiler aus';
    }
    if (!campaignTitle.trim()) {
      errors.title = 'Bitte geben Sie einen Titel ein';
    }
    if (!pressReleaseContent.trim() || pressReleaseContent === '<p></p>') {
      errors.content = 'Bitte verfassen Sie eine Pressemitteilung';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedCustomerId, selectedListIds, campaignTitle, pressReleaseContent]);

  // Save handlers
  const handleSaveDraft = async () => {
    if (!validateForm() || !user || selectedLists.length === 0) return;

    setIsSaving(true);
    try {
      // Clean assets - set proper timestamp
      const cleanedAssets = attachedAssets.map(asset => ({
        ...asset,
        attachedAt: asset.attachedAt || new Date() // Use existing or set new date
      }));

      const campaignData = {
        userId: user.uid,
        title: campaignTitle,
        contentHtml: pressReleaseContent,
        status: 'draft' as const,
        // Legacy fields for backwards compatibility
        distributionListId: selectedListIds[0] || '',
        distributionListName: selectedLists[0]?.name || '',
        // New multi-list fields
        distributionListIds: selectedListIds,
        distributionListNames: selectedLists.map(l => l.name),
        recipientCount: totalRecipients,
        clientId: selectedCustomerId,
        clientName: selectedCustomerName,
        attachedAssets: cleanedAssets,
        scheduledAt: null,
        sentAt: null,
        approvalRequired // NEU: Freigabe-Flag
      };

      const newCampaignId = await prService.create(campaignData);
      setDraftId(newCampaignId);
      
      // Save AI metadata if exists
      if (lastGeneration && lastGeneration.metadata) {
        localStorage.setItem(`campaign_ai_metadata_${newCampaignId}`, JSON.stringify({
          generatedBy: lastGeneration.metadata.generatedBy,
          timestamp: lastGeneration.metadata.timestamp,
          context: lastGeneration.metadata.context
        }));
      }

      // NEU: Wenn Freigabe erforderlich, fordere sie an
      if (approvalRequired) {
        const shareId = await prService.requestApproval(newCampaignId);
        const url = prService.getApprovalUrl(shareId);
        setApprovalUrl(url);
        setShowApprovalModal(true);
      } else {
        showToast('success', 'Kampagne gespeichert!', 'Du wirst zur Bearbeitung weitergeleitet...');
        
        setTimeout(() => {
          router.push(`/dashboard/pr/campaigns/edit/${newCampaignId}`);
        }, 1500);
      }

    } catch (error) {
      console.error("Fehler beim Speichern der Kampagne:", error);
      showToast('error', 'Fehler beim Speichern', 'Die Kampagne konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save hook
  const { saveStatus, lastSaved } = useAutoSave(
    { campaignTitle, pressReleaseContent, selectedListIds, attachedAssets, approvalRequired },
    async () => {
      if (draftId && user && selectedLists.length > 0) {
        await prService.update(draftId, {
          title: campaignTitle,
          contentHtml: pressReleaseContent,
          // Legacy fields
          distributionListId: selectedListIds[0] || '',
          distributionListName: selectedLists[0]?.name || '',
          // New multi-list fields
          distributionListIds: selectedListIds,
          distributionListNames: selectedLists.map(l => l.name),
          recipientCount: totalRecipients,
          attachedAssets: attachedAssets,
          approvalRequired: approvalRequired
        });
      }
    },
    !!draftId // Only enable auto-save after initial save
  );

  // KI-Content Handler
  const handleAiGenerate = useCallback((result: GenerationResult) => {
    console.log('🤖 AI Generation Result:', result);

    if (result.headline && result.structured?.headline) {
      setCampaignTitle(result.headline);
    } else if (result.structured?.headline) {
      setCampaignTitle(result.structured.headline);
    }

    setPressReleaseContent(result.content);

    setLastGeneration(result);
    setAiGenerationHistory(prev => [...prev, result]);
    setShowAiModal(false);
    
    showToast('success', 'KI-Generierung erfolgreich!', 'Die Pressemitteilung wurde in die Felder übernommen.');
  }, [showToast]);

  // Customer Change Handler
  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.customer;
      return newErrors;
    });
    
    if (customerId !== selectedCustomerId) {
      setAttachedAssets([]);
    }
  }, [selectedCustomerId]);

  // Asset Management
  const handleAssetsSelected = (newAssets: CampaignAssetAttachment[]) => {
    setAttachedAssets(newAssets);
    showToast('success', `${newAssets.length} Medien ausgewählt`, 'Die Medien wurden der Kampagne hinzugefügt.');
  };

  const handleRemoveAsset = (assetId: string) => {
    setAttachedAssets(attachedAssets.filter(a => 
      !((a.type === 'asset' && a.assetId === assetId) ||
        (a.type === 'folder' && a.folderId === assetId))
    ));
    showToast('info', 'Medium entfernt');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSaveDraft,
    onAiModal: () => setShowAiModal(true),
    onCloseModals: () => {
      setShowAssetSelector(false);
      setShowAiModal(false);
    }
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Neue PR-Kampagne erstellen</Heading>
            <Text className="mt-1">Erstellen Sie eine neue Pressemitteilung für Ihre Kunden.</Text>
          </div>
          
          {/* Auto-Save Indicator */}
          {draftId && (
            <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} />
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <AnimatedProgressSteps steps={steps} currentStepIndex={currentStepIndex === -1 ? steps.length : currentStepIndex} />

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 border rounded-lg bg-white">
            {/* Schritt 1: Kunde auswählen */}
            <div>
              <h3 className="text-base font-semibold mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3">
                  1
                </span>
                Für welchen Kunden ist diese Kampagne?
              </h3>
              
              <CustomerSelector
                value={selectedCustomerId}
                onChange={handleCustomerChange}
                required={true}
                description=""
                error={validationErrors.customer}
                showStats={false}
                showQuickAdd={false}
              />
            </div>

            {/* Schritt 2: Verteiler auswählen */}
            <div className={clsx("border-t pt-8 mt-8", !selectedCustomerId && "opacity-50 pointer-events-none")}>
              <h3 className="text-base font-semibold mb-4 flex items-center">
                <span className={clsx(
                  "rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3",
                  selectedCustomerId ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                )}>
                  2
                </span>
                An wen soll die Kampagne gesendet werden?
              </h3>
              
              <MultiListSelector
                availableLists={availableLists}
                selectedListIds={selectedListIds}
                onChange={setSelectedListIds}
                loading={loading}
                error={validationErrors.lists}
              />
            </div>

            {/* Schritt 3: Pressemitteilung */}
            <div className={clsx(
              "border-t pt-8 mt-8",
              (!selectedCustomerId || selectedListIds.length === 0) && "opacity-50 pointer-events-none"
            )}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center">
                    <span className={clsx(
                      "rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3",
                      selectedCustomerId && selectedListIds.length > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                    )}>
                      3
                    </span>
                    Pressemitteilung verfassen
                  </h3>
                  <Text>Erstelle professionelle Pressemitteilungen mit dem KI-Assistenten oder manuell.</Text>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      Strukturierte Generierung
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Intelligente Übernahme
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Journalistische Standards
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowAiModal(true)}
                  disabled={!selectedCustomerId || selectedListIds.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg self-start sm:self-auto"
                >
                  <SparklesIcon className="w-5 h-5" />
                  KI-Assistent öffnen
                </Button>
              </div>

              {/* KI-Generation History */}
              {aiGenerationHistory.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SparklesIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">
                        KI-Assistent verwendet ({aiGenerationHistory.length}x)
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAiModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Erneut verwenden
                    </button>
                  </div>
                  {lastGeneration?.metadata && (
                    <div className="mt-2 text-xs text-blue-700">
                      Letzte Generierung: {lastGeneration.metadata.timestamp ? 
                        new Date(lastGeneration.metadata.timestamp).toLocaleString('de-DE') : 
                        'Gerade eben'
                      }
                      {lastGeneration.metadata.context?.industry && 
                        ` • ${lastGeneration.metadata.context.industry}`
                      }
                      {lastGeneration.metadata.context?.tone && 
                        ` • ${lastGeneration.metadata.context.tone}`
                      }
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 space-y-4">
                <Field>
                  <Label>Titel / Betreffzeile *</Label>
                  <Input 
                    value={campaignTitle}
                    onChange={(e) => {
                      setCampaignTitle(e.target.value);
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }}
                    placeholder="Innovative Partnerschaft revolutioniert die Branche..."
                    className={validationErrors.title ? 'border-red-300' : ''}
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                  )}
                  {lastGeneration?.structured && campaignTitle === lastGeneration.structured.headline && (
                    <div className="mt-1 text-xs text-green-600 flex items-center">
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      Von KI generierte Headline
                    </div>
                  )}
                </Field>
                
                <Field>
                  <Label>Inhalt *</Label>
                  <RichTextEditor 
                    content={pressReleaseContent}
                    onChange={(content) => {
                      setPressReleaseContent(content);
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.content;
                        return newErrors;
                      });
                    }}
                  />
                  {validationErrors.content && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
                  )}
                  {lastGeneration && pressReleaseContent === lastGeneration.content && (
                    <div className="mt-1 text-xs text-green-600 flex items-center">
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      Von KI generierte strukturierte Pressemitteilung
                    </div>
                  )}
                </Field>
              </div>
            </div>
            
            {/* Schritt 4: Medien anhängen */}
            <div className={clsx("border-t pt-8 mt-8", !selectedCustomerId && "opacity-50 pointer-events-none")}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center">
                    <span className={clsx(
                      "rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3",
                      selectedCustomerId ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                    )}>
                      4
                    </span>
                    Medien anhängen (optional)
                  </h3>
                  <Text>Füge Bilder, Videos oder Dokumente hinzu, um deine Pressemitteilung zu bereichern.</Text>
                </div>
                
                {selectedCustomerId && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowAssetSelector(true)}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Medien auswählen
                    </Button>
                    <Link
                      href={`/dashboard/mediathek?uploadFor=${selectedCustomerId}`}
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
                  <div className="relative inline-block">
                    <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <div className="absolute -top-2 -right-2 animate-bounce">
                      <SparklesIcon className="h-5 w-5 text-indigo-500" />
                    </div>
                  </div>
                  <p className="text-gray-500 mt-3">Noch keine Medien angehängt</p>
                  <p className="text-sm text-gray-400 mt-1">Optional - du kannst Medien auch später hinzufügen</p>
                </div>
              )}
            </div>

            {/* NEU: Schritt 5: Freigabe-Option */}
            <div className={clsx("border-t pt-8 mt-8", !selectedCustomerId && "opacity-50 pointer-events-none")}>
              <h3 className="text-base font-semibold mb-4 flex items-center">
                <span className={clsx(
                  "rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3",
                  selectedCustomerId ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                )}>
                  5
                </span>
                Freigabe-Einstellungen
              </h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={approvalRequired}
                    onChange={(checked) => setApprovalRequired(checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label className="text-base font-medium text-gray-900">
                      Freigabe vom Kunden erforderlich
                    </Label>
                    <p className="mt-1 text-sm text-gray-600">
                      Wenn aktiviert, muss der Kunde die Pressemitteilung vor dem Versand freigeben. 
                      Sie erhalten einen Link, den Sie an den Kunden senden können.
                    </p>
                  </div>
                </div>
                
                {approvalRequired && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-blue-800">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="flex-1">
                      Die Kampagne kann erst versendet werden, nachdem der Kunde sie freigegeben hat.
                      Sie werden über alle Statusänderungen informiert.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/pr">
              <Button plain>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </Link>
            <Button 
              color="indigo" 
              disabled={!isFormValid || isSaving}
              onClick={handleSaveDraft}
              className={clsx(
                approvalRequired && "bg-orange-600 hover:bg-orange-500"
              )}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichert...
                </>
              ) : approvalRequired ? (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Freigabe anfordern
                </>
              ) : (
                'Als Entwurf speichern'
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar - Preview */}
        <div className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-6 bg-white rounded-lg shadow-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Kampagnen-Zusammenfassung</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Kunde</p>
                <p className="font-medium">
                  {selectedCustomerName || (
                    <span className="text-gray-400">Noch nicht ausgewählt</span>
                  )}
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
                  <p className="text-gray-400">Noch nicht ausgewählt</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Titel</p>
                <p className={clsx("font-medium", !campaignTitle && "text-gray-400")}>
                  {campaignTitle || "Noch kein Titel"}
                </p>
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

              <div>
                <p className="text-sm font-medium text-gray-600">Freigabe</p>
                <p className={clsx("font-medium", !approvalRequired && "text-gray-400")}>
                  {approvalRequired 
                    ? "Kundenfreigabe erforderlich"
                    : "Keine Freigabe nötig"
                  }
                </p>
              </div>

              {lastGeneration && (
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
          </div>
        </div>
      </div>

      {/* Asset Selector Modal */}
      {selectedCustomerId && (
        <EnhancedAssetSelector
          isOpen={showAssetSelector}
          onClose={() => setShowAssetSelector(false)}
          clientId={selectedCustomerId}
          clientName={selectedCustomerName}
          onAssetsSelected={handleAssetsSelected}
          existingAssets={attachedAssets}
        />
      )}

      {/* AI Modal */}
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

      {/* NEU: Freigabe-Link Modal */}
      <ApprovalLinkModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          router.push('/dashboard/freigaben');
        }}
        approvalUrl={approvalUrl}
        campaignTitle={campaignTitle}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onAiClick={() => setShowAiModal(true)}
        onPreviewClick={() => showToast('info', 'Preview kommt bald!')}
        onSaveClick={handleSaveDraft}
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