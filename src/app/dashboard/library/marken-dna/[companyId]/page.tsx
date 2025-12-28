// src/app/dashboard/library/marken-dna/[companyId]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { useDNASynthese, useSynthesizeDNA, useUpdateDNASynthese, useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
import { MarkenDNADocumentType as MarkenDNADocType } from '@/types/marken-dna';
import { toastService } from '@/lib/utils/toast';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkenDNAChatModal } from '@/components/marken-dna/chat/MarkenDNAChatModal';
import { DNASyntheseRenderer } from '@/components/marken-dna/DNASyntheseRenderer';
import { DNASyntheseEditorModal } from '@/components/marken-dna/DNASyntheseEditorModal';
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
  EllipsisVerticalIcon,
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

  // Synthese Mutations
  const { mutateAsync: updateSynthese } = useUpdateDNASynthese();
  const { mutateAsync: deleteSynthese, isPending: isDeletingSynthese } = useDeleteDNASynthese();

  // UI State
  const [editingDocumentType, setEditingDocumentType] = useState<MarkenDNADocumentType | null>(null);
  const [isSyntheseExpanded, setIsSyntheseExpanded] = useState(false);
  const [isSyntheseEditorOpen, setIsSyntheseEditorOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-Outside Handler für Menüs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // DNA Synthese Update Handler
  const handleUpdateSynthese = async (content: string) => {
    if (!currentOrganization?.id || !user?.uid) {
      toastService.error('Fehler: Nicht authentifiziert');
      return;
    }

    await updateSynthese({
      companyId,
      data: {
        content,
        plainText: content,
        manuallyEdited: true,
      },
      organizationId: currentOrganization.id,
      userId: user.uid,
    });
    toastService.success('DNA Synthese aktualisiert');
  };

  // DNA Synthese Delete Handler
  const handleDeleteSynthese = async () => {
    if (!confirm('DNA Synthese wirklich löschen?')) return;

    try {
      await deleteSynthese({ companyId });
      toastService.success('DNA Synthese gelöscht');
      setIsSyntheseExpanded(false);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toastService.error('Fehler beim Löschen');
    }
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
              <div className="flex items-center gap-2">
                {/* Toggle Button */}
                <button
                  onClick={() => setIsSyntheseExpanded(!isSyntheseExpanded)}
                  className={clsx(
                    'flex-1 flex items-center justify-between px-4 py-2 rounded-lg transition-all',
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

                {/* 3-Punkte-Menü */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === 'synthese' ? null : 'synthese')}
                    className="p-2 rounded-lg border border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-purple-600" />
                  </button>

                  {openMenuId === 'synthese' && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-10">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          setIsSyntheseEditorOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          handleDeleteSynthese();
                        }}
                        disabled={isDeletingSynthese}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
        {DOCUMENT_TYPES.map(({ key }) => {
          const status = getDocumentStatus(key);
          const updatedAt = getDocumentUpdatedAt(key);

          return (
            <div
              key={key}
              className={clsx(
                'bg-white rounded-lg shadow-sm p-4 border-l-4 transition-all',
                'hover:shadow-md cursor-pointer',
                status === 'completed' && 'border-l-green-500',
                status === 'draft' && 'border-l-amber-500',
                status === 'missing' && 'border-l-zinc-200'
              )}
              onClick={() => setEditingDocumentType(key)}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <h3 className="font-medium text-zinc-900">
                    {t(`documents.${key}`)}
                  </h3>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                <span className="text-xs text-zinc-500">
                  {updatedAt ? updatedAt : '—'}
                </span>

                {/* 3-Punkte-Menü */}
                <div className="relative">
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === key ? null : key);
                    }}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 transition-all"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500" />
                  </button>

                  {openMenuId === key && (
                    <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-10">
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setEditingDocumentType(key);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <PencilIcon className="h-4 w-4" />
                        {status === 'missing' ? t('actions.create') : t('actions.edit')}
                      </button>
                      {status !== 'missing' && (
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            if (confirm(t('confirmDeleteDocument'))) {
                              handleDeleteDocument(key);
                            }
                          }}
                          disabled={isDeleting}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {t('actions.delete')}
                        </button>
                      )}
                    </div>
                  )}
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

      {/* DNA Synthese Editor Modal */}
      {dnaSynthese && (
        <DNASyntheseEditorModal
          isOpen={isSyntheseEditorOpen}
          onClose={() => setIsSyntheseEditorOpen(false)}
          content={dnaSynthese.plainText || ''}
          onSave={handleUpdateSynthese}
        />
      )}
    </div>
  );
}
