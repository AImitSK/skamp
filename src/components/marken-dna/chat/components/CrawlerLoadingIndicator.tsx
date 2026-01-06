'use client';

import { useState, useEffect } from 'react';

interface CrawlerLoadingIndicatorProps {
  url: string;
  isComplete?: boolean;
  onHide?: () => void;
}

/**
 * Crawler Loading Indicator
 *
 * Zeigt den Fortschritt beim Analysieren einer Webseite:
 * - Während Laden: Grün pulsierende Bubble + URL (opacity 0 → 1)
 * - Nach Laden: URL fadet aus, "Fertig" erscheint kurz
 *
 * @example
 * ```tsx
 * <CrawlerLoadingIndicator
 *   url="https://www.example.com"
 *   isComplete={false}
 * />
 * ```
 */
export function CrawlerLoadingIndicator({
  url,
  isComplete = false,
  onHide
}: CrawlerLoadingIndicatorProps) {
  const [phase, setPhase] = useState<'loading' | 'complete' | 'hidden'>('loading');

  useEffect(() => {
    if (isComplete && phase === 'loading') {
      // Übergang zu "Fertig"
      setPhase('complete');

      // Nach 1.5 Sekunden ausblenden
      const timer = setTimeout(() => {
        setPhase('hidden');
        onHide?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isComplete, phase, onHide]);

  if (phase === 'hidden') return null;

  // Domain aus URL extrahieren für kompaktere Anzeige
  let displayUrl = url;
  try {
    const urlObj = new URL(url);
    displayUrl = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch {
    // URL beibehalten wenn Parsing fehlschlägt
  }

  return (
    <div className="mb-6 max-w-3xl">
      {/* Custom Keyframes für starkes Pulsieren */}
      <style jsx>{`
        @keyframes strongPulse {
          0%, 100% {
            opacity: 0.15;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-strong-pulse {
          animation: strongPulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <div className="py-2">
        {/* Hauptzeile: Bubble + Text */}
        <div className="flex items-center gap-2">
          {/* Pulsierende grüne Bubble (stark: 0% → 100% opacity) */}
          <span
            className={`
              w-2 h-2 rounded-full bg-green-500 flex-shrink-0
              ${phase === 'loading' ? 'animate-strong-pulse' : ''}
            `}
          />
          <span className="text-zinc-700">
            Durchsuche die Webseite:
          </span>
        </div>

        {/* URL-Zeile mit Einrückung */}
        <div
          className={`
            flex items-baseline ml-4 mt-1
            transition-all duration-300 ease-out
            ${phase === 'complete' ? 'opacity-0 -translate-y-1' : 'opacity-100'}
          `}
        >
          <span className="text-zinc-400 mr-1.5 font-mono text-sm">└──</span>
          <span className="text-zinc-500 text-sm truncate max-w-md">
            {displayUrl}
          </span>
        </div>

        {/* "Fertig" Anzeige */}
        <div
          className={`
            flex items-baseline ml-4 mt-1
            transition-all duration-300 ease-out delay-150
            ${phase === 'complete' ? 'opacity-100' : 'opacity-0 translate-y-1'}
          `}
        >
          <span className="text-zinc-400 mr-1.5 font-mono text-sm">└──</span>
          <span className="text-green-600 text-sm font-medium">
            Fertig
          </span>
        </div>
      </div>
    </div>
  );
}
