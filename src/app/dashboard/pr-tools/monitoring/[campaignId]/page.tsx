'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DocumentTextIcon, ChartBarIcon, NewspaperIcon, DocumentArrowDownIcon, TableCellsIcon, EllipsisVerticalIcon, TrashIcon, PaperAirplaneIcon, LinkIcon } from '@heroicons/react/24/outline';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { EmailPerformanceStats } from '@/components/monitoring/EmailPerformanceStats';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { EmailCampaignSend } from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { MediaClipping } from '@/types/monitoring';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { monitoringExcelExport } from '@/lib/exports/monitoring-excel-export';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import Link from 'next/link';

export default function MonitoringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const campaignId = params.campaignId as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [clippings, setClippings] = useState<MediaClipping[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'performance' | 'recipients' | 'clippings'>('dashboard');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [analysisPDFs, setAnalysisPDFs] = useState<any[]>([]);
  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [analysenFolderLink, setAnalysenFolderLink] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [campaignId, currentOrganization?.id]);

  useEffect(() => {
    if (activeTab === 'dashboard' && campaign && currentOrganization?.id) {
      loadAnalysisPDFs();
    }
  }, [activeTab, campaign, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      const [campaignData, sendsData, clippingsData] = await Promise.all([
        prService.getById(campaignId),
        emailCampaignService.getSends(campaignId, {
          organizationId: currentOrganization.id
        }),
        clippingService.getByCampaignId(campaignId, {
          organizationId: currentOrganization.id
        })
      ]);

      setCampaign(campaignData);
      setSends(sendsData);
      setClippings(clippingsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisPDFs = async () => {
    if (!currentOrganization?.id || !campaign) {
      console.log('📂 loadAnalysisPDFs aborted: Missing org or campaign');
      return;
    }

    try {
      setLoadingPDFs(true);
      console.log('📂 Loading PDFs for campaign:', campaign.title);

      const { mediaService } = await import('@/lib/firebase/media-service');
      const allFolders = await mediaService.getAllFoldersForOrganization(currentOrganization.id);
      console.log('📂 Total folders in org:', allFolders.length);

      const projectId = campaign.projectId;
      console.log('📂 Campaign projectId:', projectId);

      if (!projectId) {
        console.log('📂 No projectId - skipping PDF load');
        setAnalysisPDFs([]);
        return;
      }

      const projectFolder = allFolders.find(f =>
        f.name.includes('P-') && f.name.includes(projectId.substring(0, 8))
      );
      console.log('📂 Found project folder:', projectFolder?.name);

      if (!projectFolder) {
        console.log('📂 Project folder not found');
        setAnalysisPDFs([]);
        return;
      }

      const analysenFolder = allFolders.find(f =>
        f.parentFolderId === projectFolder.id && f.name === 'Analysen'
      );
      console.log('📂 Found Analysen folder:', analysenFolder?.name);

      if (analysenFolder) {
        const assets = await mediaService.getMediaAssets(
          currentOrganization.id,
          analysenFolder.id
        );
        console.log('📂 Total assets in Analysen folder:', assets.length);

        const campaignPDFs = assets.filter(asset =>
          asset.fileType === 'application/pdf'
        );
        console.log('📂 PDFs found:', campaignPDFs.length, campaignPDFs);

        setAnalysisPDFs(campaignPDFs);

        setAnalysenFolderLink(
          `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolder.id}`
        );
      } else {
        console.log('📂 Analysen folder not found - no PDFs to load');
      }
    } catch (error) {
      console.error('📂 Fehler beim Laden der Analyse-PDFs:', error);
    } finally {
      setLoadingPDFs(false);
    }
  };

  const handleSendUpdated = () => {
    loadData();
  };

  const handlePDFExport = async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      setExportingPDF(true);
      const result = await monitoringReportService.generatePDFReport(
        campaignId,
        currentOrganization.id,
        user.uid
      );

      window.open(result.pdfUrl, '_blank');
      loadAnalysisPDFs();
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      alert('PDF-Export fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleDeletePDF = async (assetId: string) => {
    if (!currentOrganization?.id) return;

    if (!confirm('PDF wirklich löschen?')) return;

    try {
      const { mediaService } = await import('@/lib/firebase/media-service');
      const asset = analysisPDFs.find(p => p.id === assetId);

      if (asset) {
        await mediaService.deleteMediaAsset(asset);
        await loadAnalysisPDFs();
        alert('PDF erfolgreich gelöscht');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des PDFs');
    }
  };

  const handleExcelExport = async () => {
    if (!currentOrganization?.id) return;

    try {
      setExportingExcel(true);
      const blob = await monitoringExcelExport.generateExcel(
        campaignId,
        currentOrganization.id
      );

      const fileName = `Monitoring_${campaign?.title || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      monitoringExcelExport.downloadExcel(blob, fileName);
    } catch (error) {
      console.error('Excel-Export fehlgeschlagen:', error);
      alert('Excel-Export fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Text className="text-gray-500">Kampagne nicht gefunden</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/pr-tools/monitoring">
              <Button plain className="p-2">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <Heading>Monitoring: {campaign.title}</Heading>
              <Text className="text-gray-600">
                Versendet am {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE') : 'N/A'}
              </Text>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePDFExport}
              color="secondary"
              disabled={exportingPDF}
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {exportingPDF ? 'Generiere PDF...' : 'PDF-Report'}
            </Button>
            <Button
              onClick={handleExcelExport}
              color="secondary"
              disabled={exportingExcel}
            >
              <TableCellsIcon className="h-4 w-4 mr-2" />
              {exportingExcel ? 'Exportiere...' : 'Excel-Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation in white box */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('performance')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'performance'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                E-Mail Performance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recipients')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'recipients'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Empfänger & Veröffentlichungen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clippings')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'clippings'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <NewspaperIcon className="w-4 h-4 mr-2" />
                Clipping-Archiv ({clippings.length})
              </button>
            </div>
          </div>
        </div>

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
                            <DropdownItem onClick={() => handleDeletePDF(pdf.id)}>
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
        </div>
      </div>
    </div>
  );
}