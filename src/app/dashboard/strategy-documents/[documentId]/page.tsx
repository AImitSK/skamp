'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
        setError('Strategiedokument nicht gefunden');
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Strategiedokuments:', error);
      setError('Strategiedokument konnte nicht geladen werden');
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
        'Automatische Speicherung',
        { organizationId: currentOrganization.id, userId: user.uid }
      );
      
      // Dokument neu laden um aktuelle Version zu haben
      await loadDocument();
    } catch (error) {
      console.error('Fehler beim Speichern des Strategiedokuments:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
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
        `Status geändert zu: ${newStatus}`,
        { organizationId: currentOrganization.id, userId: user.uid }
      );
      
      await loadDocument();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      alert('Fehler beim Aktualisieren des Status.');
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
      alert('Fehler beim Exportieren als PDF.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'yellow';
      case 'review': return 'blue';
      case 'approved': return 'green';
      case 'archived': return 'gray';
      default: return 'gray';
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
      case 'briefing': return 'Projekt-Briefing';
      case 'strategy': return 'Strategiedokument';
      case 'analysis': return 'Analyse';
      case 'notes': return 'Notizen';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Strategiedokument wird geladen...</Text>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <DocumentTextIcon className="h-12 w-12 mx-auto" />
        </div>
        <Heading>{error || 'Strategiedokument nicht gefunden'}</Heading>
        <div className="mt-6">
          <Button onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Zurück
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
                  <Badge color="gray" className="text-xs">
                    aus {document.templateName}
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
                    Version {document.version}, zuletzt geändert {document.updatedAt.toDate().toLocaleDateString('de-DE')}
                  </Text>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button outline onClick={handleExportPDF}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              PDF Export
            </Button>
            
            {!isReadOnly && (
              <>
                {document.status === 'draft' && (
                  <Button
                    outline
                    onClick={() => handleStatusUpdate('review')}
                    disabled={saving}
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Zur Prüfung
                  </Button>
                )}
                
                {document.status === 'review' && (
                  <Button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={saving}
                  >
                    Freigeben
                  </Button>
                )}
              </>
            )}
            
            {isReadOnly && (
              <Badge color="blue" className="px-3 py-2">
                <EyeIcon className="w-4 h-4 mr-1" />
                Nur Lesen
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