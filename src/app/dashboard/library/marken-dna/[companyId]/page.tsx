// src/app/dashboard/library/marken-dna/[companyId]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCompany } from '@/lib/hooks/useCRMData';
import {
  useMarkenDNADocuments,
  useCreateMarkenDNADocument,
  useUpdateMarkenDNADocument,
} from '@/lib/hooks/useMarkenDNA';
import { MarkenDNADocumentType as MarkenDNADocType } from '@/types/marken-dna';
import { toastService } from '@/lib/utils/toast';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkenDNAEditorModal } from '@/components/marken-dna/MarkenDNAEditorModal';
import { StatusCircles, MarkenDNADocumentType, DocumentStatus } from '@/components/marken-dna/StatusCircles';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * Document Type Konfiguration
 */
const DOCUMENT_TYPES: Array<{
  key: MarkenDNADocumentType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { key: 'briefing', icon: DocumentTextIcon, color: 'blue' },
  { key: 'swot', icon: DocumentTextIcon, color: 'purple' },
  { key: 'audience', icon: DocumentTextIcon, color: 'green' },
  { key: 'positioning', icon: DocumentTextIcon, color: 'amber' },
  { key: 'goals', icon: DocumentTextIcon, color: 'rose' },
  { key: 'messages', icon: DocumentTextIcon, color: 'cyan' },
];

/**
 * Marken-DNA Detail Page
 *
 * Zeigt alle 6 Marken-DNA Dokumente für ein Unternehmen an.
 * Ermoeglicht das Erstellen und Bearbeiten der Dokumente.
 *
 * @component
 */
export default function MarkenDNADetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const t = useTranslations('markenDNA');
  const tCommon = useTranslations('common');

  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Daten laden
  const { data: company, isLoading: isLoadingCompany } = useCompany(
    currentOrganization?.id,
    companyId
  );
  const { data: documents = [], isLoading: isLoadingDocuments } = useMarkenDNADocuments(
    companyId
  );

  // Mutations für Speichern
  const { mutateAsync: createDocument } = useCreateMarkenDNADocument();
  const { mutateAsync: updateDocument } = useUpdateMarkenDNADocument();

  // UI State
  const [editingDocumentType, setEditingDocumentType] = useState<MarkenDNADocumentType | null>(null);

  // Speicherfunktion
  const handleSaveDocument = async (
    content: string,
    docType: MarkenDNADocumentType,
    status: 'draft' | 'completed' = 'draft'
  ) => {
    if (!currentOrganization?.id || !user?.uid || !company) {
      toastService.error('Fehler: Nicht authentifiziert');
      return;
    }

    const existingDoc = documents.find(d => d.type === docType);
    const docTypeTyped = docType as MarkenDNADocType;

    try {
      if (existingDoc) {
        // Update existierendes Dokument
        await updateDocument({
          companyId,
          type: docTypeTyped,
          data: {
            content,
            plainText: content,
            status,
          },
          organizationId: currentOrganization.id,
          userId: user.uid,
        });
      } else {
        // Neues Dokument erstellen
        await createDocument({
          data: {
            companyId,
            companyName: company.name,
            type: docTypeTyped,
            content,
            plainText: content,
            status,
          },
          organizationId: currentOrganization.id,
          userId: user.uid,
        });
      }
      toastService.success('Dokument gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toastService.error('Fehler beim Speichern');
      throw error;
    }
  };

  // Hilfsfunktion: Status für Dokumenttyp abrufen
  const getDocumentStatus = (docType: MarkenDNADocumentType): DocumentStatus => {
    const doc = documents.find(d => d.type === docType);
    if (!doc) return 'missing';
    return doc.status as DocumentStatus;
  };

  // Hilfsfunktion: Dokument-Content abrufen
  const getDocumentContent = (docType: MarkenDNADocumentType): string | undefined => {
    const doc = documents.find(d => d.type === docType);
    return doc?.content;
  };

  // Hilfsfunktion: Markdown zu Plain-Text für Vorschau
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/#{1,6}\s+/g, '') // Headers entfernen
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold entfernen
      .replace(/\*([^*]+)\*/g, '$1') // Italic entfernen
      .replace(/^\s*[-*+]\s+/gm, '') // Liste entfernen
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links entfernen
      .replace(/`([^`]+)`/g, '$1') // Code entfernen
      .replace(/\n{2,}/g, ' ') // Mehrfache Zeilenumbrüche
      .trim();
  };

  // Hilfsfunktion: Letzte Aktualisierung abrufen
  const getDocumentUpdatedAt = (docType: MarkenDNADocumentType): string | undefined => {
    const doc = documents.find(d => d.type === docType);
    if (!doc?.updatedAt) return undefined;
    return new Date(doc.updatedAt.seconds * 1000).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Status-Icon Komponente
  const StatusIcon = ({ status }: { status: DocumentStatus }) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'draft':
        return <ClockIcon className="h-5 w-5 text-amber-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-zinc-300" />;
    }
  };

  // Status Badge Komponente
  const StatusBadge = ({ status }: { status: DocumentStatus }) => {
    switch (status) {
      case 'completed':
        return <Badge color="green">{t('status.completed')}</Badge>;
      case 'draft':
        return <Badge color="amber">{t('status.draft')}</Badge>;
      default:
        return <Badge color="zinc">{t('status.missing')}</Badge>;
    }
  };

  if (isLoadingCompany || isLoadingDocuments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{tCommon('loading')}</Text>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Text className="text-zinc-500">{t('companyNotFound')}</Text>
        <Button
          onClick={() => router.push('/dashboard/library/marken-dna')}
          className="mt-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  // Berechne Gesamtstatus
  const completedCount = DOCUMENT_TYPES.filter(
    dt => getDocumentStatus(dt.key) === 'completed'
  ).length;
  const draftCount = DOCUMENT_TYPES.filter(
    dt => getDocumentStatus(dt.key) === 'draft'
  ).length;
  const isComplete = completedCount === 6;

  // Status-Map für StatusCircles
  const statusMap: Record<MarkenDNADocumentType, DocumentStatus> = {
    briefing: getDocumentStatus('briefing'),
    swot: getDocumentStatus('swot'),
    audience: getDocumentStatus('audience'),
    positioning: getDocumentStatus('positioning'),
    goals: getDocumentStatus('goals'),
    messages: getDocumentStatus('messages'),
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button
          plain
          onClick={() => router.push('/dashboard/library/marken-dna')}
          className="text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
      </div>

      {/* Company Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{company.name}</h1>
            <div className="mt-2 flex items-center gap-4">
              <Badge color="zinc">{t('results.customer')}</Badge>
              {isComplete ? (
                <Badge color="green">{t('status.allComplete')}</Badge>
              ) : (
                <Badge color="amber">
                  {completedCount}/6 {t('status.completed')}
                </Badge>
              )}
            </div>
          </div>

          {/* Status Circles */}
          <div className="flex items-center gap-2">
            <StatusCircles
              documents={statusMap}
              size="lg"
              clickable={true}
              onCircleClick={(docType) => setEditingDocumentType(docType)}
            />
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map(({ key, icon: Icon, color }) => {
          const status = getDocumentStatus(key);
          const content = getDocumentContent(key);
          const updatedAt = getDocumentUpdatedAt(key);

          return (
            <div
              key={key}
              className={clsx(
                'bg-white rounded-lg shadow-sm p-5 border-l-4 transition-all',
                'hover:shadow-md cursor-pointer',
                status === 'completed' && 'border-l-green-500',
                status === 'draft' && 'border-l-amber-500',
                status === 'missing' && 'border-l-zinc-200'
              )}
              onClick={() => setEditingDocumentType(key)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <h3 className="font-medium text-zinc-900">
                    {t(`documents.${key}`)}
                  </h3>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Content Preview */}
              {content ? (
                <p className="text-sm text-zinc-600 line-clamp-3 mb-3">
                  {stripMarkdown(content).substring(0, 150)}...
                </p>
              ) : (
                <p className="text-sm text-zinc-400 italic mb-3">
                  {t('noContentYet')}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                {updatedAt ? (
                  <span className="text-xs text-zinc-500">
                    {t('lastUpdated')}: {updatedAt}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
                <Button
                  plain
                  className="text-primary hover:text-primary-dark"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setEditingDocumentType(key);
                  }}
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  {status === 'missing' ? t('actions.create') : t('actions.edit')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Modal */}
      {editingDocumentType && (() => {
        const existingDoc = documents.find(d => d.type === editingDocumentType);
        return (
          <MarkenDNAEditorModal
            open={true}
            onClose={() => setEditingDocumentType(null)}
            company={company}
            documentType={editingDocumentType}
            existingDocument={existingDoc?.content}
            existingChatHistory={existingDoc?.chatHistory}
            onSave={async (content: string, status: 'draft' | 'completed') => {
              await handleSaveDocument(content, editingDocumentType, status);
              setEditingDocumentType(null);
            }}
          />
        );
      })()}
    </div>
  );
}
