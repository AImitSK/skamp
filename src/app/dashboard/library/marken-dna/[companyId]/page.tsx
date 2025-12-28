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
  useDeleteMarkenDNADocument,
} from '@/lib/hooks/useMarkenDNA';
import { useDNASynthese, useSynthesizeDNA } from '@/lib/hooks/useDNASynthese';
import { MarkenDNADocumentType as MarkenDNADocType } from '@/types/marken-dna';
import { toastService } from '@/lib/utils/toast';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkenDNAChatModal } from '@/components/marken-dna/chat/MarkenDNAChatModal';
import { DNASyntheseRenderer } from '@/components/marken-dna/DNASyntheseRenderer';
import { MarkenDNADocumentType, DocumentStatus } from '@/components/marken-dna/StatusCircles';
import { DnaIcon } from '@/components/icons/DnaIcon';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  TrashIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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

  // DNA Synthese laden
  const { data: dnaSynthese, isLoading: isLoadingSynthese } = useDNASynthese(companyId);
  const { mutate: synthesize, isPending: isSynthesizing } = useSynthesizeDNA();

  // Mutations für Speichern und Löschen
  const { mutateAsync: createDocument } = useCreateMarkenDNADocument();
  const { mutateAsync: updateDocument } = useUpdateMarkenDNADocument();
  const { mutateAsync: deleteDocument, isPending: isDeleting } = useDeleteMarkenDNADocument();

  // UI State
  const [editingDocumentType, setEditingDocumentType] = useState<MarkenDNADocumentType | null>(null);
  const [isSyntheseExpanded, setIsSyntheseExpanded] = useState(false);

  // DNA Synthese Handler
  const handleSynthesize = () => {
    if (!currentOrganization?.id || !company) {
      toastService.error('Fehler: Nicht authentifiziert');
      return;
    }

    synthesize(
      {
        companyId,
        companyName: company.name,
        organizationId: currentOrganization.id,
        language: 'de',
      },
      {
        onSuccess: () => {
          toastService.success('DNA Synthese erfolgreich erstellt!');
          setIsSyntheseExpanded(true);
        },
        onError: (error) => {
          console.error('Synthese Fehler:', error);
          toastService.error(`Fehler: ${error.message}`);
        },
      }
    );
  };

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

  // Löschfunktion
  const handleDeleteDocument = async (docType: MarkenDNADocumentType) => {
    if (!currentOrganization?.id) {
      toastService.error('Fehler: Nicht authentifiziert');
      return;
    }

    const docTypeTyped = docType as MarkenDNADocType;

    try {
      await deleteDocument({
        companyId,
        type: docTypeTyped,
        organizationId: currentOrganization.id,
      });
      toastService.success('Dokument gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toastService.error('Fehler beim Löschen');
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

  // Token-Anzahl berechnen
  const tokenCount = dnaSynthese?.plainText
    ? Math.ceil(dnaSynthese.plainText.length / 4)
    : 0;

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

      {/* Company Header + DNA Synthese (KOMBINIERT) */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">{company.name}</h1>
              <div className="mt-2 flex items-center gap-3">
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

            {/* Status Circles + Prozent (kompakt) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {DOCUMENT_TYPES.map(({ key }) => {
                  const status = getDocumentStatus(key);
                  return (
                    <div
                      key={key}
                      title={t(`documents.${key}`)}
                      className={clsx(
                        'w-3 h-3 rounded-full border-2',
                        status === 'completed' && 'bg-green-500 border-green-500',
                        status === 'draft' && 'bg-amber-500 border-amber-500',
                        status === 'missing' && 'bg-white border-zinc-300'
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-sm font-medium text-zinc-600">
                {Math.round((completedCount / 6) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200" />

        {/* DNA Synthese Section */}
        <div className="p-6 bg-gradient-to-r from-purple-50/50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DnaIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  DNA Synthese
                  {dnaSynthese && (
                    <Badge color="green" className="text-xs">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Aktiv
                    </Badge>
                  )}
                </h2>
                {dnaSynthese && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Erstellt: {dnaSynthese.synthesizedAt?.seconds
                      ? new Date(dnaSynthese.synthesizedAt.seconds * 1000).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isComplete && !dnaSynthese && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Alle 6 Dokumente benötigt
                </span>
              )}
              <Button
                onClick={handleSynthesize}
                disabled={!isComplete || isSynthesizing}
                className={clsx(
                  'text-sm',
                  isComplete
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                )}
              >
                {isSynthesizing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {dnaSynthese ? 'Neu generieren' : 'Synthetisieren'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Toggle für Synthese-Inhalt */}
          {dnaSynthese && (
            <div className="mt-4">
              <button
                onClick={() => setIsSyntheseExpanded(!isSyntheseExpanded)}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all',
                  'border border-purple-200 hover:border-purple-300',
                  isSyntheseExpanded ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                )}
              >
                <span className="text-xs text-purple-600">
                  ~{tokenCount} Tokens
                </span>
                {isSyntheseExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-purple-600" />
                )}
              </button>

              {/* Expandierter Inhalt */}
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isSyntheseExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                )}
              >
                <div className="bg-white rounded-lg border border-purple-200 p-5">
                  <DNASyntheseRenderer content={dnaSynthese.plainText || ''} />
                </div>
              </div>
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  {status !== 'missing' && (
                    <Button
                      plain
                      className="text-red-500 hover:text-red-700"
                      disabled={isDeleting}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (confirm(t('confirmDeleteDocument'))) {
                          handleDeleteDocument(key);
                        }
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
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
            </div>
          );
        })}
      </div>

      {/* Chat Modal */}
      {editingDocumentType && (() => {
        const existingDoc = documents.find(d => d.type === editingDocumentType);
        return (
          <MarkenDNAChatModal
            key={`modal-${companyId}-${editingDocumentType}`}
            isOpen={true}
            onClose={() => setEditingDocumentType(null)}
            companyId={companyId}
            companyName={company.name}
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
