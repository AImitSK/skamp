// src/components/inbox/AIResponseSuggestions.tsx
"use client";

import { useState, useEffect } from 'react';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
import { EmailResponseSuggestion } from '@/types/ai';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import clsx from 'clsx';
import {
  SparklesIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/20/solid';

interface AIResponseSuggestionsProps {
  email: EmailMessage;
  thread: EmailThread;
  onUseSuggestion?: (responseText: string) => void;
  context?: {
    customerName?: string;
    customerHistory?: string;
    companyInfo?: string;
    threadHistory?: string[];
  };
  collapsed?: boolean;
}

export function AIResponseSuggestions({ 
  email, 
  thread,
  onUseSuggestion,
  context,
  collapsed = false
}: AIResponseSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<EmailResponseSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [selectedTone, setSelectedTone] = useState<'formal' | 'friendly' | 'professional' | 'empathetic'>('professional');
  const [responseType, setResponseType] = useState<'answer' | 'acknowledge' | 'escalate' | 'follow_up'>('answer');
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  const generateSuggestions = async () => {
    if (!email.textContent && !email.htmlContent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await firebaseAIService.generateEmailResponse({
        originalEmail: {
          subject: thread.subject,
          content: email.textContent || email.htmlContent || '',
          fromEmail: email.from.email,
          toEmail: email.to[0]?.email || ''
        },
        responseType,
        context,
        tone: selectedTone,
        language: 'de'
      });
      
      setSuggestions(result.suggestions);
      setSelectedSuggestion(0); // Auto-select first suggestion
      
    } catch (err: any) {
      console.error('AI Response generation failed:', err);
      setError(err.message || 'Response-Generierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate when component mounts
  useEffect(() => {
    if (email && !suggestions.length) {
      generateSuggestions();
    }
  }, [email]);

  const handleUseSuggestion = (suggestion: EmailResponseSuggestion) => {
    if (onUseSuggestion) {
      onUseSuggestion(suggestion.responseText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'formal': return 'bg-gray-100 text-gray-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'empathetic': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseTypeLabel = (type: string) => {
    switch (type) {
      case 'answer': return 'Antworten';
      case 'acknowledge': return 'Bestätigen';
      case 'escalate': return 'Eskalieren';
      case 'follow_up': return 'Nachfassen';
      default: return type;
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">KI-Antworten</span>
            {suggestions.length > 0 && (
              <Badge color="green" className="text-xs">
                {suggestions.length} Vorschläge
              </Badge>
            )}
          </div>
          <Button
            plain
            onClick={() => setIsCollapsed(false)}
            className="p-1"
            title="Antwort-Vorschläge anzeigen"
          >
            <EyeIcon className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-200">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-green-600" />
          <h3 className="text-sm font-medium text-green-700">KI-Antwort-Vorschläge</h3>
          {loading && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-green-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            plain
            onClick={() => setIsCollapsed(true)}
            className="p-1"
            title="Einklappen"
          >
            <EyeSlashIcon className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <div className="p-4 border-b border-green-200 bg-white bg-opacity-50">
        <div className="flex items-center gap-4 mb-3">
          <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Konfiguration</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Response Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Antwort-Typ</label>
            <select
              value={responseType}
              onChange={(e) => setResponseType(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="answer">Antworten</option>
              <option value="acknowledge">Bestätigen</option>
              <option value="escalate">Eskalieren</option>
              <option value="follow_up">Nachfassen</option>
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tonalität</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="professional">Professionell</option>
              <option value="friendly">Freundlich</option>
              <option value="formal">Förmlich</option>
              <option value="empathetic">Empathisch</option>
            </select>
          </div>
        </div>

        <Button
          onClick={generateSuggestions}
          disabled={loading}
          className="mt-3 bg-green-600 hover:bg-green-700 text-white text-sm"
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          {loading ? 'Generiere...' : 'Neue Vorschläge generieren'}
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateSuggestions}
              className="mt-2 text-xs bg-red-100 text-red-700 hover:bg-red-200"
              plain
            >
              Erneut versuchen
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600">Generiere Antwort-Vorschläge...</p>
            </div>
          </div>
        )}

        {suggestions.length > 0 && !loading && (
          <div className="space-y-4">
            {/* Suggestion Tabs */}
            <div className="flex gap-2 border-b border-green-200">
              {suggestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSuggestion(index)}
                  className={clsx(
                    "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                    selectedSuggestion === index
                      ? "border-green-600 text-green-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  Vorschlag {index + 1}
                </button>
              ))}
            </div>

            {/* Selected Suggestion */}
            {selectedSuggestion !== null && suggestions[selectedSuggestion] && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={clsx("text-xs", getToneColor(suggestions[selectedSuggestion].tone))}>
                      {suggestions[selectedSuggestion].tone}
                    </Badge>
                    <Badge color="blue" className="text-xs">
                      {Math.round(suggestions[selectedSuggestion].confidence * 100)}% Konfidenz
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      plain
                      onClick={() => copyToClipboard(suggestions[selectedSuggestion].responseText)}
                      className="p-1"
                      title="In Zwischenablage kopieren"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                      onClick={() => handleUseSuggestion(suggestions[selectedSuggestion])}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Verwenden
                    </Button>
                  </div>
                </div>

                {/* Response Text */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {suggestions[selectedSuggestion].responseText}
                  </pre>
                </div>

                {/* Key Points */}
                {suggestions[selectedSuggestion].keyPoints?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Wichtige Punkte:</h4>
                    <ul className="space-y-1">
                      {suggestions[selectedSuggestion].keyPoints.map((point: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions */}
                {suggestions[selectedSuggestion].suggestedActions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Empfohlene Aktionen:</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions[selectedSuggestion].suggestedActions.map((action: string, index: number) => (
                        <Badge key={index} color="blue" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!suggestions.length && !loading && !error && (
          <div className="text-center py-6">
            <SparklesIcon className="h-8 w-8 text-green-300 mx-auto mb-2" />
            <p className="text-sm text-green-600 mb-3">KI-Antwort-Vorschläge verfügbar</p>
            <Button
              onClick={generateSuggestions}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              Vorschläge generieren
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}