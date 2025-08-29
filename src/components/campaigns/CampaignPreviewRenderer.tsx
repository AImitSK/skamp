// src/components/campaigns/CampaignPreviewRenderer.tsx - Customer-optimierte Campaign Preview für Freigabe-Context
"use client";

import { memo, useMemo } from 'react';
import { KeyVisualData, CampaignAssetAttachment } from "@/types/pr";
import { KeyVisualDisplay } from "./KeyVisualDisplay";
import { TextbausteinDisplay } from "./TextbausteinDisplay";
import { 
  InformationCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  PaperClipIcon
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

interface CampaignPreviewRendererProps {
  campaignTitle: string;
  contentHtml: string;
  keyVisual?: KeyVisualData;
  clientName?: string;
  createdAt: any;
  attachedAssets?: CampaignAssetAttachment[];
  textbausteine?: any[];
  keywords?: string[];
  organizationId?: string; // Für das Laden der Textbausteine
  
  // Customer-spezifische Props
  isCustomerView?: boolean;
  hideMetadata?: boolean;
  showSimplified?: boolean;
  className?: string;
}

export const CampaignPreviewRenderer = memo(function CampaignPreviewRenderer({
  campaignTitle,
  contentHtml,
  keyVisual,
  clientName,
  createdAt,
  attachedAssets = [],
  textbausteine = [],
  keywords = [],
  organizationId,
  isCustomerView = false,
  hideMetadata = false,
  showSimplified = false,
  className = ""
}: CampaignPreviewRendererProps) {


  const formattedDate = useMemo(() => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }, [createdAt]);

  return (
    <div className={clsx(
      "bg-white rounded-lg border border-gray-200",
      className
    )}>
      {/* Header für Customer-View */}
      {isCustomerView && !hideMetadata && (
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              Pressemitteilung zur Prüfung
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {clientName && (
                <div className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  {clientName}
                </div>
              )}
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {formattedDate}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={clsx(
        "p-6",
        isCustomerView && "p-4 sm:p-6"
      )}>
        {/* Campaign Preview - Paper-Look für Customer-View */}
        <div className={clsx(
          "rounded-lg",
          isCustomerView ? "bg-gray-100 p-3 sm:p-6" : ""
        )}>
          <div className={clsx(
            "max-w-4xl mx-auto",
            isCustomerView ? "bg-white rounded-lg p-6 sm:p-12" : ""
          )}>
            
            {/* Key Visual */}
            {keyVisual?.url && (
              <KeyVisualDisplay
                keyVisual={keyVisual}
                isReadOnly={isCustomerView}
                showFullWidth={isCustomerView}
                className={clsx(
                  isCustomerView ? "mb-8 -mx-6 -mt-6 sm:-mx-12 sm:-mt-12" : "mb-6"
                )}
              />
            )}
            
            {/* Pressemitteilung Header - nur wenn contentHtml keinen Titel enthält */}
            {!contentHtml?.includes('<h1') && !contentHtml?.includes('<title') && (
              <div className="mb-6 sm:mb-8">
                {isCustomerView && (
                  <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mb-2">
                    Pressemitteilung
                  </p>
                )}
                <h1 className={clsx(
                  "font-bold text-gray-900 leading-tight",
                  isCustomerView ? "text-xl sm:text-2xl lg:text-3xl" : "text-lg sm:text-2xl"
                )}>
                  {campaignTitle || 'Titel der Pressemitteilung'}
                </h1>
              </div>
            )}
            
            {/* Hauptinhalt */}
            <div 
              className={clsx(
                "prose max-w-none text-gray-800 leading-relaxed campaign-preview-content",
                isCustomerView ? "text-sm sm:text-base" : "text-sm"
              )}
              dangerouslySetInnerHTML={{ 
                __html: contentHtml || '<p class="text-gray-400 italic text-center py-8">Inhalt wird generiert...</p>' 
              }} 
            />

            {/* Customer-optimierte Styles */}
            <style jsx>{`
              .campaign-preview-content :global(*) {
                color: #374151 !important;
              }
              
              .campaign-preview-content :global(span[data-type="cta-text"]),
              .campaign-preview-content :global(.cta-text) {
                color: #000000 !important;
                font-weight: bold !important;
                text-decoration: none !important;
              }
              
              .campaign-preview-content :global(span[data-type="hashtag"]),
              .campaign-preview-content :global(.hashtag) {
                color: #000000 !important;
                font-weight: normal !important;
                text-decoration: none !important;
              }
              
              .campaign-preview-content :global(blockquote) {
                color: #374151 !important;
                border-left: 4px solid #d1d5db;
                padding-left: 1rem;
                margin: 1.5rem 0;
                font-style: italic;
              }
              
              .campaign-preview-content :global(a) {
                color: #374151 !important;
                text-decoration: none !important;
              }
            `}</style>
            
            {/* Textbausteine für Customer-View */}
            {isCustomerView && textbausteine && textbausteine.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <TextbausteinDisplay 
                  textbausteine={textbausteine}
                  organizationId={organizationId}
                  isCustomerView={true}
                />
              </div>
            )}
            
            {/* Datum - nur wenn contentHtml kein Datum enthält */}
            {isCustomerView && !contentHtml?.includes(formattedDate) && formattedDate && (
              <p className="text-sm text-gray-600 mt-8 pt-4 border-t border-gray-200">
                {formattedDate}
              </p>
            )}
          </div>
        </div>

        {/* Metadaten für Agency-View */}
        {!isCustomerView && !hideMetadata && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {keywords.length > 0 && (
                <div>
                  <span className="font-medium">Keywords:</span> {keywords.slice(0, 3).join(', ')}
                  {keywords.length > 3 && ` +${keywords.length - 3} weitere`}
                </div>
              )}
              {textbausteine.length > 0 && (
                <div>
                  <span className="font-medium">Textbausteine:</span> {textbausteine.length}
                </div>
              )}
              {attachedAssets.length > 0 && (
                <div>
                  <span className="font-medium">Medien:</span> {attachedAssets.length}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison für Performance-Optimierung
  return (
    prevProps.campaignTitle === nextProps.campaignTitle &&
    prevProps.contentHtml === nextProps.contentHtml &&
    prevProps.keyVisual?.url === nextProps.keyVisual?.url &&
    prevProps.clientName === nextProps.clientName &&
    prevProps.isCustomerView === nextProps.isCustomerView &&
    prevProps.showSimplified === nextProps.showSimplified &&
    prevProps.attachedAssets?.length === nextProps.attachedAssets?.length
  );
});