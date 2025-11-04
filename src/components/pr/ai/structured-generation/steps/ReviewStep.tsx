// src/components/pr/ai/structured-generation/steps/ReviewStep.tsx
/**
 * Review Step Component
 *
 * Vierter und letzter Step im Generierungs-Workflow: Zeigt die
 * generierte Pressemitteilung in Preview- und Structured-Ansicht.
 */

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  LightBulbIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { type ReviewStepProps } from '../types';

/**
 * ReviewStep Component
 *
 * Zeigt die generierte Pressemitteilung mit Quality-Metriken
 * und zwei Ansichtsmodi an.
 *
 * **Success Banner:**
 * - Grüner Erfolgs-Banner oben
 * - Info über automatische Übernahme
 *
 * **Quality Metrics:**
 * - Headline-Länge (< 80 Zeichen ideal)
 * - Lead-Wortanzahl (40-50 Wörter ideal)
 * - Anzahl Absätze (3-4 ideal)
 * - CTA vorhanden (✓/✗)
 * - Social-optimiert (✓/○)
 *
 * **Tab Navigation:**
 * - **Preview:** HTML-Vorschau mit Styling
 * - **Structured:** Strukturierte Ansicht aller Felder
 *
 * **Structured View:**
 * - Headline
 * - Lead-Absatz (gelb hinterlegt)
 * - Body-Paragraphen
 * - Zitat (blauer Border)
 * - CTA (indigo Border)
 * - Social Media Hashtags (blaue Pills)
 *
 * @param props - Component Props (siehe ReviewStepProps)
 *
 * @example
 * ```tsx
 * <ReviewStep
 *   result={generatedResult}
 *   onRegenerate={() => setStep('content')}
 * />
 * ```
 */
function ReviewStep({
  result,
  onRegenerate
}: ReviewStepProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'structured'>('preview');

  const metrics = [
    { label: 'Headline', value: `${result.structured.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim().length} Zeichen`, ideal: '< 80' },
    { label: 'Lead', value: `${result.structured.leadParagraph.split(' ').length} Wörter`, ideal: '40-50' },
    { label: 'Absätze', value: result.structured.bodyParagraphs.length, ideal: '3-4' },
    { label: 'CTA', value: (result.structured.cta || result.structured.boilerplate) ? '✓' : '✗', ideal: '✓' },
    { label: 'Social', value: result.structured.socialOptimized ? '✓' : '○', ideal: '✓' }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Banner */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Pressemitteilung erfolgreich erstellt!</h3>
            <p className="text-sm text-green-700 mt-1">
              Die Inhalte werden automatisch in die entsprechenden Felder übernommen.
            </p>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-indigo-600">{metric.value}</div>
            <div className="text-xs text-gray-600">{metric.label}</div>
            <div className="text-xs text-gray-400">Ideal: {metric.ideal}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('preview')}
          className={clsx(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
            activeTab === 'preview'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <EyeIcon className="h-4 w-4 inline mr-2" />
          Vorschau
        </button>
        <button
          onClick={() => setActiveTab('structured')}
          className={clsx(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
            activeTab === 'structured'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <DocumentTextIcon className="h-4 w-4 inline mr-2" />
          Strukturiert
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {activeTab === 'preview' && (
          <div>
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">
                {result.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()}
              </h1>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: result.htmlContent }}
              />
            </div>
          </div>
        )}

        {activeTab === 'structured' && result.structured && (
          <div className="p-6 max-h-[500px] overflow-y-auto space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Headline</h4>
              <p className="text-lg font-bold text-gray-900">
                {result.structured.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lead-Absatz</h4>
              <p className="text-gray-700 bg-yellow-50 p-3 rounded">{result.structured.leadParagraph}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Haupttext</h4>
              <div className="space-y-3">
                {result.structured.bodyParagraphs.map((para, index) => (
                  <p key={index} className="text-gray-700">{para}</p>
                ))}
              </div>
            </div>

            {result.structured.quote && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Zitat</h4>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <blockquote className="italic text-gray-800">
                    &ldquo;{result.structured.quote.text}&rdquo;
                  </blockquote>
                  <p className="text-sm text-gray-600 mt-2">
                    — {result.structured.quote.person}, {result.structured.quote.role}
                    {result.structured.quote.company && ` bei ${result.structured.quote.company}`}
                  </p>
                </div>
              </div>
            )}

            {(result.structured.cta || result.structured.boilerplate) && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Call-to-Action</h4>
                <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
                  <p className="font-bold text-indigo-900">
                    {result.structured.cta || result.structured.boilerplate}
                  </p>
                  <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1.5">
                    <LightBulbIcon className="h-4 w-4" />
                    Wird als CTA-Element für bessere SEO-Scores formatiert
                  </p>
                </div>
              </div>
            )}

            {result.structured.hashtags && result.structured.hashtags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Social Media Hashtags
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.structured.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 flex items-center gap-1.5">
                    <CheckBadgeIcon className="h-4 w-4" />
                    {result.structured.socialOptimized ? 'Optimiert für Twitter/LinkedIn Sharing' : 'Geeignet für Social Media'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ReviewStep);
