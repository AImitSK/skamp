// src/components/projects/distribution/ProjectListCard.tsx
'use client';

import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  LinkIcon,
  UsersIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  FolderIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';

interface Props {
  projectList: ProjectDistributionList;
  masterList?: DistributionList;
  onUnlink: () => void;
  onExport: () => void;
  onView?: () => void;
}

export default function ProjectListCard({
  projectList,
  masterList,
  onUnlink,
  onExport,
  onView
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  // Name und Beschreibung bestimmen
  const listName = projectList.name || masterList?.name || 'Unbenannte Liste';
  const listDescription = projectList.description || masterList?.description;

  // Kategorie und Farbe bestimmen
  const category = masterList?.category || 'custom';
  const getCategoryColor = (cat: string): string => {
    switch (cat) {
      case 'press': return 'purple';
      case 'customers': return 'blue';
      case 'partners': return 'green';
      case 'leads': return 'amber';
      default: return 'zinc';
    }
  };

  // Badge-Text für Listentyp
  const getTypeBadge = () => {
    switch (projectList.type) {
      case 'linked':
        return { label: 'Verknüpft', color: 'blue' };
      case 'custom':
        return { label: 'Projekt-eigen', color: 'green' };
      case 'combined':
        return { label: 'Kombiniert', color: 'purple' };
      default:
        return { label: 'Unbekannt', color: 'zinc' };
    }
  };

  const typeBadge = getTypeBadge();

  // Kontaktanzahl
  const contactCount = projectList.cachedContactCount || masterList?.contactCount || 0;

  // Datum formatieren
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div
      className="relative rounded-lg border border-gray-200 bg-white p-5 transition-all hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {projectList.type === 'linked' && (
              <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            {projectList.type === 'custom' && (
              <FolderIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
            <h3 className="font-medium text-gray-900 truncate">
              {listName}
            </h3>
          </div>
          {listDescription && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {listDescription}
            </p>
          )}
        </div>

        {/* Actions Dropdown */}
        <Dropdown>
          <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
            <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
          </DropdownButton>
          <DropdownMenu anchor="bottom end">
            {onView && (
              <DropdownItem onClick={onView}>
                <EyeIcon className="h-4 w-4" />
                Anzeigen
              </DropdownItem>
            )}
            <DropdownItem onClick={onExport}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              Exportieren
            </DropdownItem>
            {projectList.type === 'linked' && masterList?.type === 'dynamic' && (
              <DropdownItem disabled>
                <ArrowPathIcon className="h-4 w-4" />
                Aktualisieren (Master-Liste)
              </DropdownItem>
            )}
            <DropdownDivider />
            <DropdownItem onClick={onUnlink}>
              <TrashIcon className="h-4 w-4" />
              <span className="text-red-600">
                {projectList.type === 'linked' ? 'Verknüpfung entfernen' : 'Löschen'}
              </span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          color={typeBadge.color as any}
          className="text-xs"
        >
          {typeBadge.label}
        </Badge>
        {masterList && (
          <>
            <Badge
              color={getCategoryColor(category) as any}
              className="text-xs"
            >
              {LIST_CATEGORY_LABELS[category as keyof typeof LIST_CATEGORY_LABELS] || category}
            </Badge>
            {masterList.type === 'dynamic' && (
              <Badge color="green" className="text-xs">
                Dynamisch
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-600">
          <UsersIcon className="h-4 w-4 mr-1.5 text-gray-400" />
          <span className="font-medium">{contactCount.toLocaleString()}</span>
          <span className="ml-1">Kontakte</span>
        </div>
        <div className="text-xs text-gray-400">
          {formatDate(projectList.addedAt)}
        </div>
      </div>

      {/* Kombinierte Listen Info */}
      {projectList.type === 'combined' && projectList.linkedLists && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xs text-gray-500">
            Kombiniert aus {projectList.linkedLists.length} Listen
            {projectList.additionalContacts && projectList.additionalContacts.length > 0 &&
              ` + ${projectList.additionalContacts.length} einzelne Kontakte`}
          </Text>
        </div>
      )}

      {/* Hover-Effekt für verknüpfte Listen */}
      {projectList.type === 'linked' && masterList && isHovered && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-opacity-30 pointer-events-none" />
      )}
    </div>
  );
}