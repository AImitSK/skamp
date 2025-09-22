// src/components/projects/strategy/StrategyDocumentsTable.tsx
'use client';

import React from 'react';
import {
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import type { StrategyDocument } from '@/lib/firebase/strategy-document-service';

// Erweiterte Interface für Unified Documents
interface UnifiedStrategyDocument extends StrategyDocument {
  source?: 'strategy' | 'folder';
  assetId?: string;
  contentRef?: string;
}

interface StrategyDocumentsTableProps {
  documents: UnifiedStrategyDocument[];
  onEdit: (document: UnifiedStrategyDocument) => void;
  onDelete: (documentId: string) => void;
  loading: boolean;
}

export default function StrategyDocumentsTable({
  documents,
  onEdit,
  onDelete,
  loading
}: StrategyDocumentsTableProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Unbekannt';
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'zinc';
      case 'review': return 'amber';
      case 'approved': return 'green';
      case 'archived': return 'gray';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'review': return 'In Prüfung';
      case 'approved': return 'Freigegeben';
      case 'archived': return 'Archiviert';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'briefing': return 'Briefing';
      case 'strategy': return 'Strategie';
      case 'analysis': return 'Analyse';
      case 'notes': return 'Notizen';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 mb-2">Noch keine Strategiedokumente erstellt</p>
        <p className="text-sm text-gray-400">
          Verwenden Sie eine der Vorlagen oben, um zu beginnen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">
          Bestehende Strategiedokumente
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Titel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt am
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Autor
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {document.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {document.templateName && (
                      <div className="text-xs text-gray-500">
                        Vorlage: {document.templateName}
                      </div>
                    )}
                    {document.source === 'folder' && (
                      <Badge color="gray" className="text-xs">
                        Ordner-System
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color="blue" className="text-xs">
                    {getTypeLabel(document.type)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color={getStatusColor(document.status) as any} className="text-xs">
                    {getStatusLabel(document.status)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(document.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {document.authorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => onEdit(document)}>
                        <PencilIcon className="h-4 w-4" />
                        Bearbeiten
                      </DropdownItem>
                      <DropdownItem onClick={() => onDelete(document.id)}>
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-red-600">Löschen</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}