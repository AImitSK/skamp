// src/components/pr/ai/HeadlineGenerator.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SparklesIcon, CheckIcon } from '@heroicons/react/20/solid';

interface HeadlineGeneratorProps {
  currentTitle: string;
  content: string;
  onTitleSelect: (title: string) => void;
}

interface HeadlineOption {
  id: string;
  title: string;
}

export function HeadlineGenerator({
  currentTitle,
  content,
  onTitleSelect
}: HeadlineGeneratorProps) {
  const [headlines, setHeadlines] = useState<HeadlineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateHeadlines = async () => {
    setLoading(true);
    setError(null);

    // Prüfe ob genug Content vorhanden ist
    const contentToAnalyze = content.trim();
    if (contentToAnalyze.length < 50) {
      setError('Bitte geben Sie zuerst etwas Inhalt in die Pressemitteilung ein, damit die KI daraus Headlines generieren kann.');
      setLoading(false);
      return;
    }

    try {
      // Nutze bestehende KI-Infrastruktur wie im FloatingAIToolbar
      const prompt = `Du bist ein erfahrener PR-Experte. Erstelle 3 professionelle Headlines für diese Pressemitteilung.

WICHTIGE REGELN:
- Jede Headline maximal 70 Zeichen
- Prägnant und aufmerksamkeitserregend
- Für deutsche Medien geeignet
- SEO-optimiert
- Keine Nummerierung, keine Anführungszeichen

${currentTitle ? `Aktuelle Headline: "${currentTitle}"\n\n` : ''}Inhalt der Pressemitteilung:\n${contentToAnalyze}\n\nGib NUR die 3 Headlines zurück, jede in einer neuen Zeile:`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          mode: 'generate'
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren der Headlines');
      }

      const data = await response.json();
      const generatedText = data.generatedText || '';
      
      // Parse Headlines aus der Antwort
      const headlineLines = generatedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\d+\./)) // Entferne Nummerierungen
        .slice(0, 3); // Maximal 3 Headlines
      
      if (headlineLines.length > 0) {
        const headlineOptions: HeadlineOption[] = headlineLines.map((title: string, index: number) => ({
          id: `headline-${index}`,
          title: title.trim().replace(/^["“”]|["“”]$/g, '') // Entferne Anführungszeichen
        }));
        
        setHeadlines(headlineOptions);
        setShowSuggestions(true);
      } else {
        setError('Keine Headlines konnten generiert werden. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Fehler beim Generieren der Headlines:', error);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHeadline = (headline: HeadlineOption) => {
    onTitleSelect(headline.title);
    setShowSuggestions(false);
    setHeadlines([]);
  };

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setHeadlines([]);
    setError(null);
  };

  return (
    <div className="relative">
      {/* Generate Button */}
      <Button
        type="button"
        onClick={generateHeadlines}
        disabled={loading}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white whitespace-nowrap text-sm"
      >
        <SparklesIcon className="h-4 w-4 mr-1" />
        {loading ? 'Generiert Headlines...' : 'KI Headlines'}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg z-10">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 mt-0.5"></div>
            <div className="text-sm text-amber-800">
              <p className="font-medium">Hinweis</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-amber-600 hover:text-amber-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Headlines Suggestions */}
      {showSuggestions && headlines.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">KI-generierte Headlines</h4>
            <button
              onClick={closeSuggestions}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            {headlines.map((headline) => (
              <button
                key={headline.id}
                onClick={() => handleSelectHeadline(headline)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#005fab] hover:bg-[#005fab]/5 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900 leading-relaxed pr-2">
                    {headline.title}
                  </p>
                  <CheckIcon className="h-4 w-4 text-gray-400 group-hover:text-[#005fab] flex-shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Klicken Sie auf eine Headline, um sie zu übernehmen
            </p>
          </div>
        </div>
      )}
    </div>
  );
}