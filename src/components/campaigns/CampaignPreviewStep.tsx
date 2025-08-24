// src/components/campaigns/CampaignPreviewStep.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  InformationCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  FolderIcon
} from "@heroicons/react/24/outline";
import { KeyVisualData, CampaignAssetAttachment } from "@/types/pr";

interface CampaignPreviewStepProps {
  campaignTitle: string;
  finalContentHtml: string;
  keyVisual?: KeyVisualData;
  selectedCompanyName?: string;
  realPrScore: {
    totalScore: number;
    breakdown: { 
      headline: number; 
      keywords: number; 
      structure: number; 
      relevance: number; 
      concreteness: number; 
      engagement: number 
    };
    hints: string[];
    keywordMetrics: any[];
  } | null;
  keywords: string[];
  boilerplateSections: any[];
  attachedAssets: CampaignAssetAttachment[];
  editorContent: string;
  approvalData: { customerApprovalRequired: boolean };
}

export function CampaignPreviewStep({
  campaignTitle,
  finalContentHtml,
  keyVisual,
  selectedCompanyName,
  realPrScore,
  keywords,
  boilerplateSections,
  attachedAssets,
  editorContent,
  approvalData
}: CampaignPreviewStepProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Linke Spalte: Pressemitteilung im Papier-Look (2/3 Breite) */}
      <div className="lg:col-span-2">
        <div className="bg-gray-100 p-6 rounded-lg">
          <div className="bg-white shadow-xl rounded-lg p-12 max-w-4xl mx-auto">
            {/* Key Visual im 16:9 Format */}
            {keyVisual?.url && (
              <div className="mb-8 -mx-12 -mt-12">
                <div className="w-full" style={{ aspectRatio: '16/9' }}>
                  <img 
                    src={keyVisual.url} 
                    alt="Key Visual" 
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                </div>
              </div>
            )}
            
            {/* Pressemitteilung Header */}
            <div className="mb-8">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Pressemitteilung</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">{campaignTitle || 'Titel der Pressemitteilung'}</h1>
            </div>
            
            {/* Hauptinhalt - Fertiges ContentHtml */}
            <div 
              className="prose max-w-none text-gray-800 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: finalContentHtml || '<p class="text-gray-400 italic text-center py-8">Klicken Sie auf "Weiter" oder "Vorschau" um die finale Vorschau zu generieren</p>' }} 
            />
            
            {/* Datum */}
            <p className="text-sm text-gray-600 mt-8 pt-4 border-t border-gray-200">
              {new Date().toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Rechte Spalte: Info-Karten (1/3 Breite) */}
      <div className="lg:col-span-1 space-y-6">
        {/* Kampagnen-Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <InformationCircleIcon className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900">Kampagnen-Info</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge color="blue">Entwurf</Badge>
            </div>
            {selectedCompanyName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Kunde:</span>
                <span className="font-medium text-right">{selectedCompanyName}</span>
              </div>
            )}
            {approvalData.customerApprovalRequired && (
              <div className="flex justify-between">
                <span className="text-gray-600">Freigabe:</span>
                <Badge color="amber">Erforderlich</Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Statistiken */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900">Statistiken</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Zeichen</span>
              <span className="font-mono text-sm">
                {(editorContent || '').replace(/<[^>]*>/g, '').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Textbausteine</span>
              <span className="font-mono text-sm">{boilerplateSections.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Keywords</span>
              <span className="font-mono text-sm">{keywords.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Medien</span>
              <span className="font-mono text-sm">{attachedAssets.length}</span>
            </div>
          </div>
        </div>
        
        {/* PR-Score Box */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">PR-SEO Analyse</h4>
            </div>
            <Badge 
              color={(realPrScore?.totalScore || 0) >= 76 ? 'green' : (realPrScore?.totalScore || 0) >= 51 ? 'amber' : 'red'}
              className="text-sm font-semibold px-3 py-1"
            >
              PR-Score: {realPrScore?.totalScore || 0}/100
            </Badge>
          </div>
          
          {/* Score Details */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              Headline: {realPrScore?.breakdown?.headline || 0}/100
            </div>
            <div className="text-sm text-gray-600">
              Keywords: {realPrScore?.breakdown?.keywords || 0}/100
            </div>
            <div className="text-sm text-gray-600">
              Struktur: {realPrScore?.breakdown?.structure || 0}/100
            </div>
            
            {keywords.length > 0 && realPrScore?.keywordMetrics && realPrScore.keywordMetrics.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="text-xs text-gray-600 mb-1">Keywords:</div>
                {realPrScore.keywordMetrics.slice(0, 2).map((kw: any, i: number) => (
                  <div key={i} className="text-xs text-gray-700">{kw.keyword}</div>
                ))}
              </div>
            )}
          </div>
          
        </div>
        
        {/* Anhänge */}
        {attachedAssets.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <PaperClipIcon className="h-5 w-5 text-gray-400" />
              <h4 className="font-semibold text-gray-900">Anhänge</h4>
            </div>
            <div className="space-y-2">
              {attachedAssets.slice(0, 3).map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-sm">
                  {asset.type === 'folder' ? (
                    <FolderIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="truncate text-gray-700">
                    {asset.metadata.fileName || asset.metadata.folderName}
                  </span>
                </div>
              ))}
              {attachedAssets.length > 3 && (
                <div className="text-xs text-gray-500 pt-1">
                  +{attachedAssets.length - 3} weitere
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}