'use client';

import React from 'react';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
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
  onTeamManageClick: () => void;
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
 */
const getProjectStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'on_hold': return 'Pausiert';
    case 'completed': return 'Abgeschlossen';
    case 'cancelled': return 'Abgebrochen';
    default: return status;
  }
};

/**
 * Helper: Format Date
 */
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';
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
    return 'Unbekannt';
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    return 'Ungültiges Datum';
  }
};

/**
 * Helper: Format Project Date
 */
const formatProjectDate = (date: any): string => {
  try {
    if (!date) return '-';

    // Firestore Timestamp mit toDate Methode
    if (date && typeof date === 'object' && date.toDate) {
      return formatDate(date.toDate());
    }

    // Firestore Timestamp mit seconds/nanoseconds
    if (date && typeof date === 'object' && date.seconds) {
      return formatDate(new Date(date.seconds * 1000));
    }

    // Date Object direkt
    if (date instanceof Date) {
      return formatDate(date);
    }

    // String (ISO date oder andere Formate)
    if (typeof date === 'string') {
      return formatDate(new Date(date));
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
 * - Mehr-Optionen Dropdown (Team verwalten, Löschen)
 */
export function ProjectHeader({
  teamMembers,
  onEditClick,
  onTeamManageClick,
  onDeleteClick,
}: ProjectHeaderProps) {
  const { project } = useProject();

  if (!project) return null;

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
            {getProjectStatusLabel(project.status)}
          </Badge>
          {/* Erstellt-Datum */}
          <span className="text-sm text-gray-500">
            Erstellt: {formatProjectDate(project.createdAt)}
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
                  title={`${project.assignedTo.length - 5} weitere Mitglieder`}
                >
                  +{project.assignedTo.length - 5}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button onClick={onEditClick} color="secondary" className="!py-1.5">
              <PencilSquareIcon className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Bearbeiten</span>
            </Button>

            {/* Mehr-Optionen Dropdown */}
            <Dropdown>
              <DropdownButton plain className="!py-1.5 !px-2">
                <EllipsisVerticalIcon className="w-5 h-5" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={onTeamManageClick}>
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Team verwalten
                </DropdownItem>
                <DropdownItem onClick={onDeleteClick} className="text-red-600">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Projekt löschen
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}
