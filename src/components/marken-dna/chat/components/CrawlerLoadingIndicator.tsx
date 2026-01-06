'use client';

interface CrawlerLoadingIndicatorProps {
  url: string;
}

/**
 * Crawler Loading Indicator
 *
 * Zeigt den Fortschritt beim Analysieren einer Webseite:
 * - Grün pulsierende Bubble + URL
 * - Wird ausgeblendet wenn isLoading false wird
 *
 * @example
 * ```tsx
 * <CrawlerLoadingIndicator url="https://www.example.com" />
 * ```
 */
export function CrawlerLoadingIndicator({ url }: CrawlerLoadingIndicatorProps) {
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
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-strong-pulse" />
          <span className="text-zinc-700">
            Durchsuche die Webseite:
          </span>
        </div>

        {/* URL-Zeile mit Einrückung */}
        <div className="flex items-baseline ml-4 mt-1">
          <span className="text-zinc-400 mr-1.5 font-mono text-sm">└──</span>
          <span className="text-zinc-500 text-sm truncate max-w-md">
            {displayUrl}
          </span>
        </div>
      </div>
    </div>
  );
}
