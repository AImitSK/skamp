'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, DocumentArrowDownIcon, EllipsisVerticalIcon, TrashIcon, PaperAirplaneIcon, LinkIcon } from '@heroicons/react/24/outline';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { EmailPerformanceStats } from '@/components/monitoring/EmailPerformanceStats';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { MonitoringSuggestionsTable } from '@/components/monitoring/MonitoringSuggestionsTable';
import { MonitoringSuggestion } from '@/types/monitoring';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { toastService } from '@/lib/utils/toast';
import Link from 'next/link';
import { MonitoringProvider, useMonitoring } from './context/MonitoringContext';
import { MonitoringHeader } from './components/MonitoringHeader';
import { PDFExportButton } from './components/PDFExportButton';
import { TabNavigation } from './components/TabNavigation';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';

function MonitoringContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const tabParam = searchParams.get('tab') as 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions' | null;

  // Context-Daten
  const {
    campaign,
    sends,
    clippings,
    suggestions,
    isLoadingData,
    error,
    reloadData,
    analysisPDFs,
    analysenFolderLink,
    handleDeletePDF: contextDeletePDF,
  } = useMonitoring();

  // Lokaler State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions'>(tabParam || 'dashboard');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<any>(null);

  // Tab-Sync mit URL
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Handler mit useCallback
  const handleSendUpdated = useCallback(() => {
    reloadData();
  }, [reloadData]);

  const handleTabChange = useCallback((tab: 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions') => {
    setActiveTab(tab);
  }, []);

  const handleDeletePDF = useCallback(async (pdf: any) => {
    setPdfToDelete(pdf);
    setShowDeleteDialog(true);
  }, []);

  const confirmDeletePDF = useCallback(async () => {
    if (!pdfToDelete) return;

    try {
      await contextDeletePDF(pdfToDelete);
      setShowDeleteDialog(false);
      setPdfToDelete(null);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      setShowDeleteDialog(false);
      setPdfToDelete(null);
    }
  }, [pdfToDelete, contextDeletePDF]);

  const handleConfirmSuggestion = useCallback(async (
    suggestion: MonitoringSuggestion,
    sentiment: 'positive' | 'neutral' | 'negative'
  ) => {
    if (!user?.uid || !currentOrganization?.id) return;

    try {
      await monitoringSuggestionService.confirmSuggestion(
        suggestion.id!,
        {
          userId: user.uid,
          organizationId: currentOrganization.id,
          sentiment
        }
      );

      toastService.success('Vorschlag erfolgreich als Clipping gespeichert');
      await reloadData();
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
      toastService.error('Fehler beim Übernehmen des Vorschlags');
    }
  }, [user?.uid, currentOrganization?.id, reloadData]);

  const handleMarkSpam = useCallback(async (suggestion: MonitoringSuggestion) => {
    if (!user?.uid || !currentOrganization?.id) return;

    try {
      await monitoringSuggestionService.markAsSpam(
        suggestion.id!,
        {
          userId: user.uid,
          organizationId: currentOrganization.id
        },
        {
          type: 'url_domain',
          description: `Spam-Domain aus Vorschlag: ${suggestion.articleTitle}`
        }
      );

      toastService.success('Vorschlag als Spam markiert');
      await reloadData();
    } catch (error) {
      console.error('Fehler beim Spam-Markieren:', error);
      toastService.error('Fehler beim Markieren als Spam');
    }
  }, [user?.uid, currentOrganization?.id, reloadData]);

  // Loading State
  if (isLoadingData) return <LoadingState />;

  // Error State
  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  // Not Found State
  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Text className="text-gray-500">Kampagne nicht gefunden</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header mit PDF-Export Button */}
      <div className="flex items-center justify-between mb-6">
        <MonitoringHeader />
        <PDFExportButton />
      </div>

      {/* Tab Navigation + Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <TabNavigation activeTab={activeTab} onChange={handleTabChange} />
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <MonitoringDashboard clippings={clippings} sends={sends} />

              {analysisPDFs.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <DocumentArrowDownIcon className="h-5 w-5 text-gray-600 mr-2" />
                      <Subheading>Generierte Reports ({analysisPDFs.length})</Subheading>
                    </div>
                    {analysenFolderLink && (
                      <Link
                        href={analysenFolderLink}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Zum Analysen-Ordner
                      </Link>
                    )}
                  </div>

                  <div className="space-y-2">
                    {analysisPDFs.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <DocumentTextIcon className="h-5 w-5 text-red-500" />
                          <div>
                            <Text className="font-medium">{pdf.fileName}</Text>
                            <Text className="text-xs text-gray-500">
                              {pdf.createdAt?.toDate?.()?.toLocaleDateString('de-DE')}
                            </Text>
                          </div>
                        </div>

                        <Dropdown>
                          <DropdownButton plain>
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            <DropdownItem onClick={() => window.open(pdf.downloadUrl, '_blank')}>
                              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                              Download
                            </DropdownItem>
                            <DropdownItem onClick={() => handleDeletePDF(pdf)}>
                              <TrashIcon className="h-4 w-4 mr-2 text-red-600" />
                              <span className="text-red-600">Löschen</span>
                            </DropdownItem>
                            <DropdownItem disabled>
                              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                              Versenden (Coming Soon)
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <EmailPerformanceStats sends={sends} />
          )}

          {activeTab === 'recipients' && (
            <RecipientTrackingList
              sends={sends}
              campaignId={campaignId}
              onSendUpdated={handleSendUpdated}
            />
          )}

          {activeTab === 'clippings' && (
            <ClippingArchive clippings={clippings} />
          )}

          {activeTab === 'suggestions' && currentOrganization && (
            <MonitoringSuggestionsTable
              suggestions={suggestions}
              campaignId={campaignId}
              organizationId={currentOrganization.id}
              onConfirm={handleConfirmSuggestion}
              onMarkSpam={handleMarkSpam}
              loading={isLoadingData}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>PDF löschen</DialogTitle>
        <DialogBody>
          <Text>
            Möchten Sie das PDF &quot;{pdfToDelete?.fileName}&quot; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Text>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={confirmDeletePDF}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions' | null;

  const campaignId = params.campaignId as string;
  const activeTab = tabParam || 'dashboard';

  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={currentOrganization?.id || ''}
      activeTab={activeTab}
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
