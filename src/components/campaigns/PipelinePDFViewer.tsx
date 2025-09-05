// src/components/campaigns/PipelinePDFViewer.tsx - ✅ Plan 2/9: Pipeline-PDF-Viewer für Interne Freigabe
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { 
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ShareIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { PRCampaign } from '@/types/pr';
import { PipelineStage } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

interface PipelinePDFViewerProps {
  campaign: PRCampaign;
  organizationId: string;
  onPDFGenerated?: (pdfUrl: string) => void;
  className?: string;
}

interface PipelinePDFInfo {
  enabled: boolean;
  versionCount: number;
  lastGenerated?: Timestamp;
  currentStage?: PipelineStage;
  autoGenerate: boolean;
}

export const PipelinePDFViewer = ({ 
  campaign, 
  organizationId, 
  onPDFGenerated,
  className = ""
}: PipelinePDFViewerProps) => {
  const [pdfInfo, setPdfInfo] = useState<PipelinePDFInfo>({
    enabled: campaign.internalPDFs?.enabled || false,
    versionCount: campaign.internalPDFs?.versionCount || 0,
    lastGenerated: campaign.internalPDFs?.lastGenerated,
    currentStage: campaign.pipelineStage,
    autoGenerate: campaign.internalPDFs?.autoGenerate || false
  });
  const [generating, setGenerating] = useState(false);
  const [lastPdfUrl, setLastPdfUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Pipeline-Stadium-spezifische Konfiguration
  const getStageConfig = (stage?: PipelineStage) => {
    switch (stage) {
      case 'creation':
        return {
          label: 'Erstellung',
          color: 'blue' as const,
          icon: DocumentTextIcon,
          description: 'Entwurfs-PDFs für interne Abstimmung'
        };
      case 'review':
        return {
          label: 'Review',
          color: 'amber' as const,
          icon: ClockIcon,
          description: 'Review-PDFs für Team-Freigabe'
        };
      case 'approval':
        return {
          label: 'Freigabe',
          color: 'green' as const,
          icon: CheckCircleIcon,
          description: 'Finale PDFs für Kunden-Freigabe'
        };
      default:
        return {
          label: 'Unbekannt',
          color: 'zinc' as const,
          icon: DocumentTextIcon,
          description: 'Pipeline-PDFs'
        };
    }
  };

  const stageConfig = getStageConfig(pdfInfo.currentStage);

  // Pipeline-PDF generieren
  const handleGeneratePipelinePDF = async () => {
    if (!campaign.id || !campaign.projectId) {
      setError('Kampagne oder Projekt-ID fehlt');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const pdfUrl = await pdfVersionsService.generatePipelinePDF(
        campaign.id,
        campaign,
        { organizationId, userId: 'current-user' } // TODO: Get real userId from context
      );

      setLastPdfUrl(pdfUrl);
      setPdfInfo(prev => ({
        ...prev,
        versionCount: prev.versionCount + 1,
        lastGenerated: Timestamp.now()
      }));

      onPDFGenerated?.(pdfUrl);
    } catch (error) {
      console.error('Pipeline-PDF-Generierung fehlgeschlagen:', error);
      setError('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setGenerating(false);
    }
  };

  // Download der letzten PDF
  const handleDownload = () => {
    if (lastPdfUrl) {
      window.open(lastPdfUrl, '_blank');
    }
  };

  // Wenn nicht für Projekte aktiviert, zeige nichts
  if (!campaign.projectId || !pdfInfo.enabled) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <stageConfig.icon className="h-5 w-5 text-gray-500" />
          <Text className="font-medium">Interne Pipeline-PDFs</Text>
          <Badge color={stageConfig.color} className="text-xs">
            {stageConfig.label}
          </Badge>
        </div>
        
        <Button
          onClick={handleGeneratePipelinePDF}
          disabled={generating}
          color="secondary"
          className="text-sm"
        >
          {generating ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Generiere...
            </>
          ) : (
            <>
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              PDF generieren
            </>
          )}
        </Button>
      </div>

      {/* Pipeline-Stadium Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <Text className="text-sm text-gray-600">
          {stageConfig.description}
        </Text>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>Versionen: {pdfInfo.versionCount}</span>
          {pdfInfo.lastGenerated && (
            <span>
              Zuletzt: {new Date(pdfInfo.lastGenerated.toDate()).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
          {pdfInfo.autoGenerate && (
            <Badge color="green" className="text-xs">
              Auto-Generation AN
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <Text className="text-sm text-red-700">{error}</Text>
          </div>
        </div>
      )}

      {/* PDF Actions */}
      <div className="flex items-center gap-2">
        {lastPdfUrl && (
          <>
            <Button
              onClick={handleDownload}
              plain
              className="text-sm !text-gray-600 hover:!text-gray-900"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Download
            </Button>
            
            <Button
              onClick={() => {
                if (lastPdfUrl) {
                  navigator.clipboard.writeText(lastPdfUrl);
                }
              }}
              plain
              className="text-sm !text-gray-600 hover:!text-gray-900"
            >
              <ShareIcon className="h-4 w-4 mr-1" />
              Link kopieren
            </Button>
          </>
        )}
        
        {!lastPdfUrl && pdfInfo.versionCount === 0 && (
          <Text className="text-sm text-gray-500">
            Noch keine Pipeline-PDF generiert
          </Text>
        )}
      </div>

      {/* Auto-Generate Hinweis */}
      {pdfInfo.autoGenerate && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          📄 Bei jeder Speicherung wird automatisch eine neue interne PDF-Version erstellt
        </div>
      )}
    </div>
  );
};