// src/components/mediathek/AssetDetailsModal.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MediaAsset, MediaFolder } from "@/types/media";
import { useUpdateMediaAsset } from "@/lib/hooks/useMediaData";
import {
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

interface AssetDetailsModalProps {
  asset: MediaAsset;
  currentFolder?: MediaFolder;
  allFolders?: MediaFolder[];
  organizationId: string;
  onClose: () => void;
}

export default function AssetDetailsModal({
  asset,
  currentFolder,
  allFolders = [],
  organizationId,
  onClose
}: AssetDetailsModalProps) {
  const t = useTranslations('mediathek.assetDetails');
  const [fileName, setFileName] = useState(asset.fileName || '');
  const [description, setDescription] = useState(asset.description || '');

  const updateAssetMutation = useUpdateMediaAsset();

  const getFileIcon = (fileType: string | undefined) => {
    if (!fileType) return DocumentTextIcon;

    if (fileType.startsWith('image/')) {
      return PhotoIcon;
    } else if (fileType.startsWith('video/')) {
      return VideoCameraIcon;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return DocumentTextIcon;
    } else {
      return DocumentTextIcon;
    }
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      return;
    }

    try {
      const updates: Partial<MediaAsset> = {};

      if (fileName !== asset.fileName) {
        updates.fileName = fileName.trim();
      }

      if (description !== (asset.description || '')) {
        updates.description = description.trim() || undefined;
      }

      if (Object.keys(updates).length > 0) {
        await updateAssetMutation.mutateAsync({
          assetId: asset.id!,
          updates,
          organizationId
        });
        // ✅ React Query invalidiert automatisch die Queries
      }

      onClose();
    } catch (error) {
      // Error handling could be improved with proper user feedback
      console.error(t('saveError'), error);
    }
  };

  const FileIcon = getFileIcon(asset.fileType);

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>{t('title')}</DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
          {/* Asset Preview & Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {asset.fileType?.startsWith('image/') ? (
                  <img
                    src={asset.downloadUrl}
                    alt={asset.fileName}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FileIcon className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {asset.fileName}
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p><strong>{t('fileInfo.type')}:</strong> {asset.fileType}</p>
                  <p><strong>{t('fileInfo.created')}:</strong> {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : t('fileInfo.unknown')}</p>
                  <p className="truncate"><strong>{t('fileInfo.url')}:</strong> {asset.downloadUrl}</p>
                </div>
              </div>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <Label>{t('fields.fileName.label')}</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={t('fields.fileName.placeholder')}
              />
              <Description>
                {t('fields.fileName.description')}
              </Description>
            </Field>

            <Field>
              <Label>{t('fields.description.label')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('fields.description.placeholder')}
                rows={3}
              />
              <Description>
                {t('fields.description.description')}
              </Description>
            </Field>
        </FieldGroup>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={updateAssetMutation.isPending}>
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!fileName.trim() || updateAssetMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {updateAssetMutation.isPending ? t('actions.saving') : t('actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}