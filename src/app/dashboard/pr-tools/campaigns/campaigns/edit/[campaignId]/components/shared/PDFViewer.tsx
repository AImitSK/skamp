// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/shared/PDFViewer.tsx
'use client';
import React from 'react';
import { useTranslations } from 'next-intl';

interface PDFViewerProps {
  pdfUrl: string | null;
  title?: string;
  loading?: boolean;
}

export default React.memo(function PDFViewer({ pdfUrl, title, loading = false }: PDFViewerProps) {
  const t = useTranslations('campaigns.edit.pdf');

  if (loading) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">{t('noPreview')}</p>
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      title={title || t('defaultTitle')}
      className="w-full h-[800px] border border-gray-200 rounded-lg"
    />
  );
});
