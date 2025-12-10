'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  UserIcon,
  ArrowDownTrayIcon as DownloadIcon
} from '@heroicons/react/24/outline';

import { strategyDocumentService, StrategyDocument } from '@/lib/firebase/strategy-document-service';
import StrategyDocumentEditor from '@/components/strategy/StrategyDocumentEditor';

export default function StrategyDocumentPage() {
  const t = useTranslations('strategy');
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const documentId = params.documentId as string;
  
  const [document, setDocument] = useState<StrategyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId, currentOrganization?.id]);

  const loadDocument = async () => {
    if (!documentId || !currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);
      const documentData = await strategyDocumentService.getById(documentId, {
        organizationId: currentOrganization.id
      });
      
      if (documentData) {
        setDocument(documentData);
        // Nur readonly wenn Dokument approved/archiviert ist oder User keine Bearbeitungsrechte hat
        setIsReadOnly(documentData.status === 'approved' || documentData.status === 'archived');
      } else {
        setError(t('errors.notFound'));
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Strategiedokuments:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: string, title: string) => {
    if (!document || !currentOrganization?.id || !user) return;

    try {
      setSaving(true);
      await strategyDocumentService.update(
        document.id,
        { content, title },
        t('actions.autoSave'),
        { organizationId: currentOrganization.id, userId: user.uid }
      );

      // Dokument neu laden um aktuelle Version zu haben
      await loadDocument();
    } catch (error) {
      console.error('Fehler beim Speichern des Strategiedokuments:', error);
      alert(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'draft' | 'review' | 'approved' | 'archived') => {
    if (!document || !currentOrganization?.id || !user) return;

    try {
      setSaving(true);
      await strategyDocumentService.update(
        document.id,
        { status: newStatus },
        `${t('actions.statusChanged')}: ${newStatus}`,
        { organizationId: currentOrganization.id, userId: user.uid }
      );

      await loadDocument();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      alert(t('errors.statusUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!document || !currentOrganization?.id) return;

    try {
      const pdfBlob = await strategyDocumentService.exportToPDF(document.id, {
        organizationId: currentOrganization.id
      });
      
      // Download starten
      const url = URL.createObjectURL(pdfBlob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert(t('errors.exportFailed'));
    }
  };

  const getStatusColor = (status: string): 'yellow' | 'blue' | 'green' | 'zinc' => {
    switch (status) {
      case 'draft': return 'yellow';
      case 'review': return 'blue';
      case 'approved': return 'green';
      case 'archived': return 'zinc';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('status.draft');
      case 'review': return t('status.review');
      case 'approved': return t('status.approved');
      case 'archived': return t('status.archived');
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'briefing': return t('types.briefing');
      case 'strategy': return t('types.strategy');
      case 'analysis': return t('types.analysis');
      case 'notes': return t('types.notes');
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">{t('loading')}</Text>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <DocumentTextIcon className="h-12 w-12 mx-auto" />
        </div>
        <Heading>{error || t('errors.notFound')}</Heading>
        <div className="mt-6">
          <Button onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t('actions.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button plain className="p-2" onClick={() => router.back()}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <Heading>{document.title}</Heading>
                <Badge color={getStatusColor(document.status)}>
                  {getStatusLabel(document.status)}
                </Badge>
                {document.templateName && (
                  <Badge color="zinc" className="text-xs">
                    {t('labels.fromTemplate', { name: document.templateName })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <Text className="text-sm text-gray-600">
                  {getTypeLabel(document.type)}
                </Text>
                <span className="text-gray-300">•</span>
                <div className="flex items-center space-x-1">
                  <UserIcon className="h-3 w-3 text-gray-400" />
                  <Text className="text-sm text-gray-600">{document.authorName}</Text>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-3 w-3 text-gray-400" />
                  <Text className="text-sm text-gray-600">
                    {t('labels.versionInfo', {
                      version: document.version,
                      date: document.updatedAt.toDate().toLocaleDateString('de-DE')
                    })}
                  </Text>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button plain onClick={handleExportPDF}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              {t('actions.exportPdf')}
            </Button>

            {!isReadOnly && (
              <>
                {document.status === 'draft' && (
                  <Button
                    plain
                    onClick={() => handleStatusUpdate('review')}
                    disabled={saving}
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    {t('actions.toReview')}
                  </Button>
                )}

                {document.status === 'review' && (
                  <Button
                    color="primary"
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={saving}
                  >
                    {t('actions.approve')}
                  </Button>
                )}
              </>
            )}

            {isReadOnly && (
              <Badge color="blue" className="px-3 py-2">
                <EyeIcon className="w-4 h-4 mr-1" />
                {t('labels.readOnly')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg border border-gray-200">
        <StrategyDocumentEditor
          document={document}
          onSave={handleSave}
          onCancel={() => router.push(`/dashboard/projects/${document?.projectId}`)}
          isLoading={saving}
        />
      </div>
    </div>
  );
}