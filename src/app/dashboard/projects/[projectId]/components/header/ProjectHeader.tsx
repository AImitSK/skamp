'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { useProject } from '../../context/ProjectContext';
import { TeamMember } from '@/types/international';

/**
 * ProjectHeader Props
 */
interface ProjectHeaderProps {
  teamMembers: TeamMember[];
  onEditClick: () => void;
  onDeleteClick: () => void;
}

/**
 * Helper: Project Status Color
 */
const getProjectStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'on_hold': return 'yellow';
    case 'completed': return 'blue';
    case 'cancelled': return 'red';
    default: return 'zinc';
  }
};

/**
 * Helper: Project Status Label
 * HINWEIS: Diese Funktion wird jetzt direkt in der Komponente mit useTranslations ersetzt
 */

/**
 * Helper: Format Date
 * Note: Pass t() function to enable i18n for fallback values
 */
const formatDate = (timestamp: any, t: any) => {
  if (!timestamp) return t('dateUnknown');
  try {
    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Handle JS Date
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Handle timestamp string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
    return t('dateUnknown');
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    return t('dateInvalid');
  }
};

/**
 * Helper: Format Project Date
 * Note: Pass t() function to enable i18n for fallback values
 */
const formatProjectDate = (date: any, t: any): string => {
  try {
    if (!date) return '-';

    // Firestore Timestamp mit toDate Methode
    if (date && typeof date === 'object' && date.toDate) {
      return formatDate(date.toDate(), t);
    }

    // Firestore Timestamp mit seconds/nanoseconds
    if (date && typeof date === 'object' && date.seconds) {
      return formatDate(new Date(date.seconds * 1000), t);
    }

    // Date Object direkt
    if (date instanceof Date) {
      return formatDate(date, t);
    }

    // String (ISO date oder andere Formate)
    if (typeof date === 'string') {
      return formatDate(new Date(date), t);
    }

    return '-';
  } catch (error) {
    console.error('Fehler beim Formatieren des Projekt-Datums:', error);
    return '-';
  }
};

/**
 * ProjectHeader Component
 *
 * Zeigt Header mit:
 * - Zurück-Button
 * - Titel + Status Badge
 * - Erstellt-Datum
 * - Team-Avatare
 * - Bearbeiten-Button
 * - Mehr-Optionen Dropdown (Löschen)
 */
export const ProjectHeader = React.memo(function ProjectHeader({
  teamMembers,
  onEditClick,
  onDeleteClick,
}: ProjectHeaderProps) {
  const { project } = useProject();
  const t = useTranslations('projects.detail.header');

  if (!project) return null;

  // Helper: Get translated status label
  const getStatusLabel = (status: string) => {
    const statusKey = status as 'active' | 'on_hold' | 'completed' | 'cancelled';
    return t.has(`status.${statusKey}`) ? t(`status.${statusKey}`) : status;
  };

  return (
    <div className="mb-6">
      {/* Titel-Zeile mit Zurück-Button */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 mb-2">
          {/* Zurück-Button links vom Titel */}
          <Link href="/dashboard/projects">
            <Button plain className="p-2">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>

          {/* Titel und Status */}
          <Heading className="!text-2xl">{project.title}</Heading>
          <Badge color={getProjectStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
          {/* Erstellt-Datum */}
          <span className="text-sm text-gray-500">
            {t('created')}: {formatProjectDate(project.createdAt, t)}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Team-Mitglieder Avatare */}
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex items-center -space-x-2">
              {(() => {
                // Wie in KanBan Card - nur assignedTo ohne Duplikate
                const uniqueMembers = [];
                const seenMemberIds = new Set();

                for (const userId of project.assignedTo) {
                  const member = teamMembers.find(m => m.userId === userId || m.id === userId);
                  if (member && !seenMemberIds.has(member.id)) {
                    uniqueMembers.push({ userId, member });
                    seenMemberIds.add(member.id);
                  } else if (!member) {
                    uniqueMembers.push({ userId, member: null });
                  }
                }

                return uniqueMembers.slice(0, 5).map(({ userId, member }, index) => {
                  if (member) {
                    const initials = member.displayName
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '??';

                    return (
                      <Avatar
                        key={userId}
                        className="size-8 ring-2 ring-gray-50 hover:z-10 transition-all"
                        src={member.photoUrl}
                        initials={initials}
                        style={{ zIndex: 5 - index }}
                        title={member.displayName}
                      />
                    );
                  }
                  return null;
                });
              })()}
              {project.assignedTo && project.assignedTo.length > 5 && (
                <div
                  className="size-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium ring-2 ring-gray-50"
                  title={t('moreMembers', { count: project.assignedTo.length - 5 })}
                >
                  +{project.assignedTo.length - 5}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button onClick={onEditClick} color="secondary" className="!py-1.5">
              <PencilSquareIcon className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">{t('edit')}</span>
            </Button>

            {/* Mehr-Optionen Dropdown */}
            <Dropdown>
              <DropdownButton plain className="!py-1.5 !px-2">
                <EllipsisVerticalIcon className="w-5 h-5" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={onDeleteClick} className="text-red-600">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {t('delete')}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
});
