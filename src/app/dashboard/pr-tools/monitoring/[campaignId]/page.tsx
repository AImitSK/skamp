'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DocumentTextIcon, ChartBarIcon, NewspaperIcon, DocumentArrowDownIcon, TableCellsIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    loadData();
  }, [campaignId, currentOrganization?.id]);

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
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      alert('PDF-Export fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setExportingPDF(false);
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
            <MonitoringDashboard clippings={clippings} sends={sends} />
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