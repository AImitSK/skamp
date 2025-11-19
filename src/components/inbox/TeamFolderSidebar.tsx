// src/components/inbox/TeamFolderSidebar.tsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import {
  InboxIcon,
  FolderIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface TeamFolderSidebarProps {
  selectedFolderId?: string;
  selectedFolderType: 'general' | 'team';
  onFolderSelect: (type: 'general' | 'team', id?: string) => void;
  unreadCounts: Record<string, number>;
  organizationId: string;
}

interface DomainMailbox {
  id: string;
  domain: string;
  inboxAddress: string;
  unreadCount: number;
  threadCount: number;
  isDefault?: boolean;
}

interface ProjectMailbox {
  id: string;
  projectId: string;
  projectName: string;
  inboxAddress: string;
  unreadCount: number;
  threadCount: number;
  status: 'active' | 'completed' | 'archived';
}

export function TeamFolderSidebar({
  selectedFolderId,
  selectedFolderType,
  onFolderSelect,
  unreadCounts,
  organizationId
}: TeamFolderSidebarProps) {
  const [domainMailboxes, setDomainMailboxes] = useState<DomainMailbox[]>([]);
  const [projectMailboxes, setProjectMailboxes] = useState<ProjectMailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Lade Mailboxen
  useEffect(() => {
    loadMailboxes();
  }, [organizationId]);

  const loadMailboxes = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);

      // Domain Mailboxes laden
      const domainQuery = query(
        collection(db, 'inbox_domain_mailboxes'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'asc')
      );

      const domainSnapshot = await getDocs(domainQuery);
      const domains = domainSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DomainMailbox));

      setDomainMailboxes(domains);

      // Project Mailboxes laden
      const projectQuery = query(
        collection(db, 'inbox_project_mailboxes'),
        where('organizationId', '==', organizationId),
        where('status', 'in', ['active', 'completed']),
        orderBy('createdAt', 'desc')
      );

      const projectSnapshot = await getDocs(projectQuery);
      const projects = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectMailbox));

      setProjectMailboxes(projects);

    } catch (error) {
      console.error('[TeamFolderSidebar] Error loading mailboxes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter mailboxes based on search
  const filteredDomains = domainMailboxes.filter(mailbox => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mailbox.domain.toLowerCase().includes(query) ||
      mailbox.inboxAddress.toLowerCase().includes(query)
    );
  });

  const filteredProjects = projectMailboxes.filter(mailbox => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mailbox.projectName.toLowerCase().includes(query) ||
      mailbox.inboxAddress.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      {/* Header mit Suche */}
      <div className="p-4 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Postfächer</h3>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Postfach suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent"
          />
        </div>
      </div>

      {/* Mailbox List */}
      <nav className="flex-1 overflow-y-auto">
        {/* Domain Mailboxes */}
        <div className="px-2 pt-4">
          <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Domains
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab]"></div>
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {searchQuery ? 'Keine Domains gefunden' : 'Noch keine Domain-Postfächer'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDomains.map(mailbox => (
                <button
                  key={mailbox.id}
                  onClick={() => onFolderSelect('general', mailbox.id)}
                  className={clsx(
                    'w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedFolderId === mailbox.id && selectedFolderType === 'general'
                      ? 'bg-[#005fab] text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <InboxIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-left">
                        {mailbox.domain}
                      </div>
                      {mailbox.isDefault && (
                        <div className={clsx(
                          'text-xs truncate text-left',
                          selectedFolderId === mailbox.id && selectedFolderType === 'general'
                            ? 'text-white/70'
                            : 'text-gray-500'
                        )}>
                          Standard
                        </div>
                      )}
                    </div>
                  </div>

                  {mailbox.unreadCount > 0 && (
                    <Badge
                      color={selectedFolderId === mailbox.id && selectedFolderType === 'general' ? 'zinc' : 'blue'}
                      className={clsx(
                        'whitespace-nowrap flex-shrink-0 ml-auto',
                        selectedFolderId === mailbox.id && selectedFolderType === 'general'
                          ? 'bg-white/20 text-white'
                          : ''
                      )}
                    >
                      {mailbox.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Mailboxes */}
        {projectMailboxes.length > 0 && (
          <div className="px-2 pt-4">
            <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Projekte
            </h4>

            {filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Keine Projekte gefunden
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProjects.map(mailbox => (
                  <button
                    key={mailbox.id}
                    onClick={() => onFolderSelect('team', mailbox.id)}
                    className={clsx(
                      'w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedFolderId === mailbox.id && selectedFolderType === 'team'
                        ? 'bg-[#005fab] text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FolderIcon className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-left">
                          {mailbox.projectName}
                        </div>
                        <div className={clsx(
                          'text-xs truncate text-left capitalize',
                          selectedFolderId === mailbox.id && selectedFolderType === 'team'
                            ? 'text-white/70'
                            : 'text-gray-500'
                        )}>
                          {mailbox.status}
                        </div>
                      </div>
                    </div>

                    {mailbox.unreadCount > 0 && (
                      <Badge
                        color={selectedFolderId === mailbox.id && selectedFolderType === 'team' ? 'zinc' : 'blue'}
                        className={clsx(
                          'whitespace-nowrap flex-shrink-0 ml-auto',
                          selectedFolderId === mailbox.id && selectedFolderType === 'team'
                            ? 'bg-white/20 text-white'
                            : ''
                        )}
                      >
                        {mailbox.unreadCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && domainMailboxes.length === 0 && projectMailboxes.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <InboxIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Postfächer vorhanden</p>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t bg-white">
        <div className="text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Domains:</span>
            <span className="font-medium">{domainMailboxes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Projekte:</span>
            <span className="font-medium">{projectMailboxes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
