// src/components/inbox/InboxAssetSelectorModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { MediaAsset, MediaFolder } from '@/types/media';
import { CampaignAssetAttachment } from '@/types/pr';
import { mediaService } from '@/lib/firebase/media-service';
import { serverTimestamp } from 'firebase/firestore';
import {
  FolderIcon,
  PhotoIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  HomeIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import SimpleProjectUploadModal from '@/components/campaigns/SimpleProjectUploadModal';
import { toastService } from '@/lib/utils/toast';

interface InboxAssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  userId?: string;
  onAssetsSelected: (assets: CampaignAssetAttachment[]) => void;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export function InboxAssetSelectorModal({
  isOpen,
  onClose,
  organizationId,
  userId,
  onAssetsSelected
}: InboxAssetSelectorModalProps) {
  const t = useTranslations('inbox.assetSelector');

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Map<string, MediaAsset>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [projectRootFolderId, setProjectRootFolderId] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Lade Projekte
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const { db } = await import('@/lib/firebase/client-init');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const projectsQuery = query(
          collection(db, 'projects'),
          where('organizationId', '==', organizationId)
        );

        const snapshot = await getDocs(projectsQuery);
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading projects:', error);
        toastService.error('Fehler beim Laden der Projekte');
      } finally {
        setLoadingProjects(false);
      }
    };

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, organizationId]);

  // Lade Medien wenn Projekt gewählt wird
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectRoot();
    } else {
      setAssets([]);
      setFolders([]);
      setBreadcrumbs([]);
      setCurrentFolderId(null);
      setProjectRootFolderId(null);
      setSelectedAssets(new Map()); // Reset Auswahl
    }
  }, [selectedProjectId]);

  const loadProjectRoot = async () => {
    setLoading(true);
    try {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (!selectedProject) return;

      const projectName = selectedProject.title || selectedProject.name;

      // 1. Alle Ordner der Organisation laden
      const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

      // 2. Projekt-Hauptordner finden
      const projectFolder = allFolders.find(folder =>
        folder.name.includes('P-') && folder.name.includes(projectName)
      );

      if (projectFolder && projectFolder.id) {
        setProjectRootFolderId(projectFolder.id);

        // 3. Starte auf Root-Ebene des Projekts (alle Unterordner wie Medien, Pressemeldungen, etc.)
        await loadFolder(projectFolder.id, [
          { id: null, name: 'Home' },
          { id: projectFolder.id, name: projectName }
        ]);
      } else {
        toastService.warning('Projekt-Ordner nicht gefunden');
        setAssets([]);
        setFolders([]);
      }
    } catch (error) {
      console.error('Error loading project root:', error);
      toastService.error('Fehler beim Laden des Projekts');
    } finally {
      setLoading(false);
    }
  };

  const loadFolder = async (folderId: string | null, newBreadcrumbs: BreadcrumbItem[]) => {
    setLoading(true);
    try {
      const [folderAssets, subFolders] = await Promise.all([
        mediaService.getMediaAssets(organizationId, folderId || undefined),
        mediaService.getFolders(organizationId, folderId || undefined)
      ]);

      setAssets(folderAssets);
      setFolders(subFolders);
      setCurrentFolderId(folderId);
      setBreadcrumbs(newBreadcrumbs);
    } catch (error) {
      console.error('Error loading folder:', error);
      toastService.error('Fehler beim Laden des Ordners');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: MediaFolder) => {
    if (!folder.id) return;

    const newBreadcrumbs = [
      ...breadcrumbs,
      { id: folder.id, name: folder.name }
    ];

    loadFolder(folder.id, newBreadcrumbs);
  };

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);

    loadFolder(item.id, newBreadcrumbs);
  };

  const handleAssetToggle = (asset: MediaAsset, checked: boolean) => {
    const newSelection = new Map(selectedAssets);

    if (checked) {
      newSelection.set(asset.id!, asset);
    } else {
      newSelection.delete(asset.id!);
    }

    setSelectedAssets(newSelection);
  };

  const handleConfirm = () => {
    const attachments: CampaignAssetAttachment[] = [];

    // Process all selected assets from Map
    selectedAssets.forEach(asset => {
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
        attachedAt: serverTimestamp() as any,
        attachedBy: organizationId
      });
    });

    onAssetsSelected(attachments);

    // Reset und schließen
    setSelectedAssets(new Map());
    onClose();
  };

  const handleUploadSuccess = async () => {
    setShowUploadModal(false);

    // Reload current folder
    setTimeout(async () => {
      if (currentFolderId) {
        await loadFolder(currentFolderId, breadcrumbs);
      }
    }, 2000);
  };

  const filteredAssets = assets.filter(asset =>
    asset.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="5xl">
        <DialogTitle className="px-6 py-4 border-b">
          <span>{t('title')}</span>
        </DialogTitle>

        <DialogBody className="px-6 py-4">
          {/* Projekt-Auswahl */}
          <div className="mb-4">
            <Field>
              <Label>{t('project.label')}</Label>
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={loadingProjects}
              >
                <option value="">{t('project.selectPlaceholder')}</option>
                {loadingProjects ? (
                  <option>{t('project.loading')}</option>
                ) : (
                  projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title || project.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
          </div>

          {/* Breadcrumb Navigation + Upload Button */}
          {breadcrumbs.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.id || 'home'} className="flex items-center gap-2">
                    {index > 0 && <ChevronRightIcon className="h-4 w-4" />}
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="hover:text-[#005fab] flex items-center gap-1"
                    >
                      {index === 0 && <HomeIcon className="h-4 w-4" />}
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>

              {selectedProjectId && currentFolderId && (
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white px-3 py-1.5 text-sm"
                >
                  <CloudArrowUpIcon className="h-4 w-4 mr-1.5" />
                  {t('upload')}
                </Button>
              )}
            </div>
          )}

          {selectedProjectId ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
                </div>
              ) : (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {/* Folders - Einfachklick zum Öffnen, keine Checkbox */}
                  {filteredFolders.map(folder => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 p-3 hover:bg-blue-50 border-b last:border-b-0 cursor-pointer transition-colors"
                      onClick={() => handleFolderClick(folder)}
                    >
                      <FolderIcon className="h-10 w-10 text-[#005fab] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Text className="font-medium truncate">{folder.name}</Text>
                        {folder.description && (
                          <Text className="text-sm text-gray-500 truncate">{folder.description}</Text>
                        )}
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 shrink-0" />
                    </div>
                  ))}

                  {/* Assets */}
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedAssets.has(asset.id!)}
                        onChange={(checked) => handleAssetToggle(asset, checked)}
                        className="shrink-0"
                      />
                      {asset.fileType?.startsWith('image/') ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="h-10 w-10 object-cover rounded shrink-0"
                        />
                      ) : (
                        <DocumentTextIcon className="h-10 w-10 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Text className="font-medium truncate">{asset.fileName}</Text>
                        <Text className="text-sm text-gray-500">
                          {asset.fileType || t('fileType.unknown')}
                        </Text>
                      </div>
                    </div>
                  ))}

                  {filteredAssets.length === 0 && filteredFolders.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <Text>{t('emptyStates.noFilesOrFolders')}</Text>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Text>{t('emptyStates.selectProject')}</Text>
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button plain onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedAssets.size === 0}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            {t('actions.confirm', { count: selectedAssets.size })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Modal */}
      {showUploadModal && currentFolderId && (
        <SimpleProjectUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          currentFolderId={currentFolderId}
          folderName={breadcrumbs[breadcrumbs.length - 1]?.name}
          clientId={organizationId}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
