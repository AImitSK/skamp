// src/components/domains/DnsStatusCard.tsx
"use client";

import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { DnsCheckResult } from '@/types/email-domains-enhanced';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/20/solid';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';

interface DnsStatusCardProps {
  results: DnsCheckResult[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DnsStatusCard({ results, onRefresh, isRefreshing }: DnsStatusCardProps) {
  // Calculate summary
  const validCount = results.filter(r => r.valid).length;
  const totalCount = results.length;
  const allValid = validCount === totalCount;
  const percentage = Math.round((validCount / totalCount) * 100);

  // Get last check time
  const lastCheckTime = results[0]?.checkedAt?.toDate();
  const timeAgo = lastCheckTime 
    ? formatDistanceToNow(lastCheckTime, { addSuffix: true, locale: de })
    : 'noch nie';

  const getRecordLabel = (result: DnsCheckResult, index: number): string => {
    switch (result.recordType) {
      case 'CNAME':
        if (index === 0) return 'Mail Server (CNAME)';
        if (index === 1) return 'DKIM 1 (CNAME)';
        if (index === 2) return 'DKIM 2 (CNAME)';
        return `${result.recordType} Record`;
      default:
        return `${result.recordType} Record`;
    }
  };

  const getStatusIcon = (valid: boolean) => {
    if (valid) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
    return <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (valid: boolean) => {
    if (valid) {
      return <Badge color="green" className="whitespace-nowrap">Korrekt</Badge>;
    }
    return <Badge color="red" className="whitespace-nowrap">Fehlerhaft</Badge>;
  };

  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            DNS-Status Überprüfung
            {allValid ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            )}
          </h4>
          <Text className="text-sm text-gray-600 mt-1">
            {allValid 
              ? 'Alle DNS-Einträge sind korrekt konfiguriert' 
              : `${validCount} von ${totalCount} DNS-Einträgen sind korrekt (${percentage}%)`
            }
          </Text>
          <Text className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Zuletzt geprüft: {timeAgo}
          </Text>
        </div>
        <Button
          plain
          onClick={onRefresh}
          disabled={isRefreshing}
          className="shrink-0"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Prüfe...' : 'Erneut prüfen'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            allValid ? 'bg-green-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* DNS Records Details */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg border ${
              result.valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(result.valid)}
                <span className="font-medium text-gray-900">
                  {getRecordLabel(result, index)}
                </span>
                {getStatusBadge(result.valid)}
              </div>
            </div>

            <div className="ml-7 space-y-2">
              {/* Host */}
              <div>
                <Text className="text-xs text-gray-500 uppercase">Host</Text>
                <code className="text-sm font-mono text-gray-700 break-all">
                  {result.host}
                </code>
              </div>

              {/* Expected Value */}
              <div>
                <Text className="text-xs text-gray-500 uppercase">Erwarteter Wert</Text>
                <code className="text-sm font-mono text-gray-700 break-all">
                  {result.expected}
                </code>
              </div>

              {/* Actual Value */}
              <div>
                <Text className="text-xs text-gray-500 uppercase">Gefundener Wert</Text>
                {result.actual ? (
                  <code className={`text-sm font-mono break-all ${
                    result.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.actual}
                  </code>
                ) : (
                  <Text className="text-sm text-red-600 italic">
                    {result.error || 'Kein Eintrag gefunden'}
                  </Text>
                )}
              </div>

              {/* Error Details */}
              {result.error && (
                <div className="mt-2 p-2 bg-red-100 rounded">
                  <div className="flex gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <Text className="text-sm text-red-800">{result.error}</Text>
                  </div>
                </div>
              )}

              {/* Help Text for Common Issues */}
              {!result.valid && !result.error && (
                <div className="mt-2 p-2 bg-yellow-100 rounded">
                  <div className="flex gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <Text className="text-sm text-yellow-800 font-medium">
                        Mögliche Ursachen:
                      </Text>
                      <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                        <li>DNS-Änderungen brauchen Zeit (bis zu 48 Stunden)</li>
                        <li>Tippfehler beim Eintragen der Werte</li>
                        <li>Fehlende oder falsche Subdomain</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* General Help */}
      {!allValid && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <Text className="text-sm font-medium text-blue-900">
                Tipps zur Fehlerbehebung:
              </Text>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• Prüfen Sie, ob Sie die Werte korrekt kopiert haben</li>
                <li>• Achten Sie auf Groß-/Kleinschreibung</li>
                <li>• Entfernen Sie eventuelle Leerzeichen am Anfang/Ende</li>
                <li>• Bei manchen Providern muss die Domain ohne "www" eingetragen werden</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}