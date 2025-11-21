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
  onFolderSelect: (type: 'general' | 'team', id?: string, emailAddress?: string) => void;
  unreadCounts: Record<string, number>;
  organizationId: string;
}

interface DomainMailbox {
  id: string;
  domainId: string;
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

  // Auto-select first mailbox when loaded
  useEffect(() => {
    if (!loading && !selectedFolderId) {
      // Wähle das erste Domain-Postfach aus (falls vorhanden)
      if (domainMailboxes.length > 0) {
        const firstMailbox = domainMailboxes[0];
        onFolderSelect('general', firstMailbox.domainId, firstMailbox.inboxAddress);
      }
      // Falls keine Domain-Postfächer, wähle das erste Projekt-Postfach
      else if (projectMailboxes.length > 0) {
        const firstMailbox = projectMailboxes[0];
        onFolderSelect('team', firstMailbox.projectId, firstMailbox.inboxAddress);
      }
    }
  }, [loading, domainMailboxes, projectMailboxes, selectedFolderId, onFolderSelect]);

  const loadMailboxes = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);

      // Domain Mailboxes laden (OHNE orderBy für Index-Kompatibilität)
      const domainQuery = query(
        collection(db, 'inbox_domain_mailboxes'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active')
      );

      const domainSnapshot = await getDocs(domainQuery);
      const domains = domainSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DomainMailbox));

      setDomainMailboxes(domains);

      // Project Mailboxes laden (OHNE orderBy für Index-Kompatibilität)
      const projectQuery = query(
        collection(db, 'inbox_project_mailboxes'),
        where('organizationId', '==', organizationId),
        where('status', 'in', ['active', 'completed'])
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Posteingang</h3>
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
                  onClick={() => onFolderSelect('general', mailbox.domainId, mailbox.inboxAddress)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedFolderId === mailbox.domainId && selectedFolderType === 'general'
                      ? 'bg-[#005fab] text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <InboxIcon className="h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-left flex items-center gap-2">
                      <span className="truncate">{mailbox.domain}</span>
                      {mailbox.isDefault && (
                        <span className={clsx(
                          'text-xs flex-shrink-0',
                          selectedFolderId === mailbox.domainId && selectedFolderType === 'general'
                            ? 'text-white/70'
                            : 'text-gray-500'
                        )}>
                          (Standard)
                        </span>
                      )}
                    </div>
                  </div>

                  {(unreadCounts[mailbox.domainId] || 0) > 0 && (
                    <Badge
                      color={selectedFolderId === mailbox.domainId && selectedFolderType === 'general' ? 'zinc' : 'blue'}
                      className={clsx(
                        'whitespace-nowrap flex-shrink-0 ml-auto',
                        selectedFolderId === mailbox.domainId && selectedFolderType === 'general'
                          ? 'bg-white/20 text-white'
                          : ''
                      )}
                    >
                      {unreadCounts[mailbox.domainId] || 0}
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
                    onClick={() => onFolderSelect('team', mailbox.projectId, mailbox.inboxAddress)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedFolderId === mailbox.projectId && selectedFolderType === 'team'
                        ? 'bg-[#005fab] text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <FolderIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-left">
                        {mailbox.projectName}
                      </div>
                    </div>

                    {(unreadCounts[mailbox.projectId] || 0) > 0 && (
                      <Badge
                        color={selectedFolderId === mailbox.projectId && selectedFolderType === 'team' ? 'zinc' : 'blue'}
                        className={clsx(
                          'whitespace-nowrap flex-shrink-0 ml-auto',
                          selectedFolderId === mailbox.projectId && selectedFolderType === 'team'
                            ? 'bg-white/20 text-white'
                            : ''
                        )}
                      >
                        {unreadCounts[mailbox.projectId] || 0}
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
