// src/components/projects/distribution/components/ProjectListRow.tsx
'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  FolderIcon,
  StarIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';

interface ProjectListRowProps {
  list: ProjectDistributionList;
  masterListDetails?: DistributionList;
  onViewDetails: () => void;
  onEdit?: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const ProjectListRow = memo(function ProjectListRow({
  list,
  masterListDetails,
  onViewDetails,
  onEdit,
  onExport,
  onDelete,
}: ProjectListRowProps) {
  const t = useTranslations('projects.distribution.listRow');

  // Daten aus Liste oder Master-Liste extrahieren
  const listName = list.name || masterListDetails?.name || t('unnamedList');
  const category = list.category || masterListDetails?.category || 'custom';
  const listType = list.listType || masterListDetails?.type || 'static';
  const contactCount = list.cachedContactCount || masterListDetails?.contactCount || 0;

  // Datum formatieren
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return t('dateUnknown');
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Name */}
        <div className="w-[35%] min-w-0">
          <button
            onClick={onViewDetails}
            className="text-left w-full group"
          >
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
              {listName}
            </p>
          </button>
          <div className="mt-1">
            <Badge
              color={list.type === 'linked' ? 'blue' : 'zinc'}
              className="text-xs whitespace-nowrap inline-flex items-center gap-1"
            >
              {list.type === 'linked' && <StarIcon className="h-3 w-3" fill="currentColor" />}
              {list.type === 'custom' && <FolderIcon className="h-3 w-3" />}
              {list.type === 'linked' ? t('types.linked') : list.type === 'custom' ? t('types.project') : t('types.combined')}
            </Badge>
          </div>
        </div>

        {/* Kategorie */}
        <div className="w-[15%]">
          {category && (
            <Badge color="zinc" className="text-xs whitespace-nowrap">
              {LIST_CATEGORY_LABELS[category as keyof typeof LIST_CATEGORY_LABELS] || category}
            </Badge>
          )}
        </div>

        {/* Typ */}
        <div className="w-[15%]">
          <Badge
            color={listType === 'dynamic' ? 'green' : 'blue'}
            className="text-xs whitespace-nowrap"
          >
            {listType === 'dynamic' ? t('listTypes.dynamic') : t('listTypes.static')}
          </Badge>
        </div>

        {/* Kontakte */}
        <div className="w-[12%]">
          <span className="text-sm font-medium text-gray-700">
            {contactCount.toLocaleString()}
          </span>
        </div>

        {/* Datum */}
        <div className="flex-1">
          <span className="text-sm text-gray-600">
            {formatDate(list.addedAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="ml-4">
          <Dropdown>
            <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 stroke-[2.5]" />
            </DropdownButton>
            <DropdownMenu anchor="bottom end">
              {list.type === 'custom' && onEdit && (
                <>
                  <DropdownItem onClick={onEdit}>
                    <PencilIcon className="h-4 w-4" />
                    {t('actions.edit')}
                  </DropdownItem>
                  <DropdownDivider />
                </>
              )}
              <DropdownItem onClick={onExport}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t('actions.export')}
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={onDelete}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">
                  {list.type === 'linked' ? t('actions.removeLink') : t('actions.delete')}
                </span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
});

export default ProjectListRow;
