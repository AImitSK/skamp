// src/components/domains/DnsStatusCard.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/20/solid';
import { DnsCheckResult } from '@/types/email-domains';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';

interface DnsStatusCardProps {
  results: DnsCheckResult[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DnsStatusCard({ results, onRefresh, isRefreshing = false }: DnsStatusCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const validCount = results.filter(r => r.isValid).length;
  const totalCount = results.length;
  const allValid = validCount === totalCount;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Text className="font-medium">DNS-Status</Text>
          <Badge 
            color={allValid ? 'green' : validCount > 0 ? 'yellow' : 'red'} 
            className="whitespace-nowrap"
          >
            {validCount}/{totalCount} konfiguriert
          </Badge>
        </div>
        <Button
          plain
          onClick={onRefresh}
          disabled={isRefreshing}
          className="whitespace-nowrap"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Prüfen
        </Button>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${
              result.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {result.isValid ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Text className="font-mono text-sm break-all">{result.hostname}</Text>
                  <Badge 
                    color={result.isValid ? 'green' : 'red'}
                    className="whitespace-nowrap"
                  >
                    {result.recordType}
                  </Badge>
                </div>
                
                {!result.isValid && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-start gap-2">
                      <Text className="text-xs text-gray-600 shrink-0">Erwartet:</Text>
                      <div className="flex items-center gap-1 flex-1">
                        <code className="text-xs bg-white px-2 py-0.5 rounded break-all">
                          {result.expectedValue}
                        </code>
                        <button
                          onClick={() => handleCopy(result.expectedValue, index * 2)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                        >
                          {copiedIndex === index * 2 ? (
                            <CheckIcon className="w-3 h-3 text-green-500" />
                          ) : (
                            <ClipboardDocumentIcon className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {result.actualValue && (
                      <div className="flex items-start gap-2">
                        <Text className="text-xs text-gray-600 shrink-0">Gefunden:</Text>
                        <code className="text-xs bg-white px-2 py-0.5 rounded text-red-600 break-all">
                          {result.actualValue}
                        </code>
                      </div>
                    )}
                    
                    {result.error && (
                      <Text className="text-xs text-red-600 mt-1">
                        {result.error}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allValid && (
        <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
          <div className="flex gap-2">
            <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <Text className="text-sm text-amber-800 font-medium">
                DNS-Einträge noch nicht vollständig
              </Text>
              <Text className="text-xs text-amber-700 mt-1">
                Es kann bis zu 48 Stunden dauern, bis DNS-Änderungen weltweit 
                verbreitet sind. Normalerweise sind sie jedoch innerhalb von 
                5-15 Minuten aktiv.
              </Text>
            </div>
          </div>
        </div>
      )}

      {results[0]?.checkedAt && (
        <Text className="text-xs text-gray-500 mt-3">
          Zuletzt geprüft {formatDistanceToNow(results[0].checkedAt.toDate(), {
            addSuffix: true,
            locale: de
          })}
        </Text>
      )}
    </div>
  );
}