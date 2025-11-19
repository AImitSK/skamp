// src/components/inbox/MailboxSidebar.tsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { InboxIcon, FolderIcon } from '@heroicons/react/24/outline';

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

interface MailboxSidebarProps {
  selectedMailboxId?: string;
  onSelectMailbox: (mailboxId: string, type: 'domain' | 'project') => void;
}

export default function MailboxSidebar({
  selectedMailboxId,
  onSelectMailbox
}: MailboxSidebarProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [domainMailboxes, setDomainMailboxes] = useState<DomainMailbox[]>([]);
  const [projectMailboxes, setProjectMailboxes] = useState<ProjectMailbox[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentOrganization) return;

    const loadMailboxes = async () => {
      try {
        setLoading(true);

        // Domain Mailboxes laden
        const domainQuery = query(
          collection(db, 'inbox_domain_mailboxes'),
          where('organizationId', '==', currentOrganization.id),
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
          where('organizationId', '==', currentOrganization.id),
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
        console.error('[MailboxSidebar] Error loading mailboxes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMailboxes();
  }, [user, currentOrganization]);

  if (loading) {
    return (
      <div className="w-64 bg-white border-r p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <InboxIcon className="h-5 w-5" />
          Inbox
        </h2>
      </div>

      {/* Mailbox List */}
      <div className="flex-1 overflow-y-auto">
        {/* Domain Mailboxes */}
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Domains
          </h3>
          <div className="space-y-1">
            {domainMailboxes.map(mailbox => (
              <button
                key={mailbox.id}
                onClick={() => onSelectMailbox(mailbox.id, 'domain')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedMailboxId === mailbox.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <InboxIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-medium truncate">
                        {mailbox.domain}
                      </div>
                      {mailbox.isDefault && (
                        <div className="text-xs text-gray-500">Standard</div>
                      )}
                    </div>
                  </div>
                  {mailbox.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full flex-shrink-0">
                      {mailbox.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Project Mailboxes */}
        {projectMailboxes.length > 0 && (
          <div className="p-4 border-t">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Projekte
            </h3>
            <div className="space-y-1">
              {projectMailboxes.map(mailbox => (
                <button
                  key={mailbox.id}
                  onClick={() => onSelectMailbox(mailbox.id, 'project')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedMailboxId === mailbox.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderIcon className="h-4 w-4 flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {mailbox.projectName}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {mailbox.status}
                        </div>
                      </div>
                    </div>
                    {mailbox.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full flex-shrink-0">
                        {mailbox.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {domainMailboxes.length === 0 && projectMailboxes.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <InboxIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Mailboxen vorhanden</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t bg-gray-50">
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
