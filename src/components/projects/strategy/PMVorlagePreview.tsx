'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { PMVorlage } from '@/types/pm-vorlage';

interface PMVorlagePreviewProps {
  pmVorlage: PMVorlage;
  isExpanded?: boolean;
}

/**
 * PMVorlagePreview
 *
 * Zeigt eine Vorschau der generierten PM-Vorlage.
 * Kann eingeklappt (nur Headline) oder ausgeklappt (vollstaendig) sein.
 */
export function PMVorlagePreview({
  pmVorlage,
  isExpanded = false,
}: PMVorlagePreviewProps) {
  const t = useTranslations('strategy');

  if (!isExpanded) {
    // Kompakte Ansicht: Nur Headline und Lead
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-zinc-900 line-clamp-2">
          {pmVorlage.headline}
        </h3>
        <p className="text-sm text-zinc-600 line-clamp-2">
          {pmVorlage.leadParagraph}
        </p>
      </div>
    );
  }

  // Vollstaendige Ansicht
  return (
    <div className="space-y-4">
      {/* Headline */}
      <h3 className="text-lg font-semibold text-zinc-900">
        {pmVorlage.headline}
      </h3>

      {/* Lead */}
      <p className="text-sm font-medium text-zinc-700">
        <strong>{pmVorlage.leadParagraph}</strong>
      </p>

      {/* Body */}
      <div className="space-y-3">
        {pmVorlage.bodyParagraphs.map((paragraph, index) => (
          <p key={index} className="text-sm text-zinc-600">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Zitat */}
      {pmVorlage.quote && (
        <blockquote className="border-l-4 border-[#0ea5e9] pl-4 py-2 my-4 bg-zinc-50 rounded-r">
          <p className="text-sm italic text-zinc-700">
            &quot;{pmVorlage.quote.text}&quot;
          </p>
          <footer className="text-xs text-zinc-500 mt-1">
            {pmVorlage.quote.person}, {pmVorlage.quote.role} bei {pmVorlage.quote.company}
          </footer>
        </blockquote>
      )}

      {/* CTA */}
      {pmVorlage.cta && (
        <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-lg p-3">
          <p className="text-sm text-[#0284c7] font-medium">
            {pmVorlage.cta}
          </p>
        </div>
      )}

      {/* Hashtags */}
      {pmVorlage.hashtags && pmVorlage.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pmVorlage.hashtags.map((hashtag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700"
            >
              {hashtag}
            </span>
          ))}
        </div>
      )}

      {/* Metadaten */}
      <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
        <span>Zielgruppe: {pmVorlage.targetGroup}</span>
        {pmVorlage.generatedAt && (
          <span>
            Generiert: {new Date(
              typeof pmVorlage.generatedAt === 'object' && 'seconds' in pmVorlage.generatedAt
                ? pmVorlage.generatedAt.seconds * 1000
                : pmVorlage.generatedAt
            ).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
