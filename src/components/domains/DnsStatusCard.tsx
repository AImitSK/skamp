// src/components/domains/DnsStatusCard.tsx
"use client";

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DnsCheckResult, DnsStatusCardProps } from '@/types/email-domains-enhanced';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

export function DnsStatusCard({ results, onRefresh, isRefreshing }: DnsStatusCardProps) {
  const t = useTranslations('domains.dnsStatus');

  // Calculate summary
  const validCount = results.filter(r => r.valid).length;
  const totalCount = results.length;
  const allValid = validCount === totalCount;
  const percentage = Math.round((validCount / totalCount) * 100);

  // Get last check time
  const lastCheckTime = results[0]?.checkedAt?.toDate();
  const timeAgo = lastCheckTime
    ? formatDistanceToNow(lastCheckTime, { addSuffix: true, locale: de })
    : t('neverChecked');

  const getRecordLabel = (result: DnsCheckResult, index: number): string => {
    switch (result.recordType) {
      case 'CNAME':
        if (index === 0) return t('records.mailServer');
        if (index === 1) return t('records.dkim1');
        if (index === 2) return t('records.dkim2');
        return `${result.recordType} ${t('records.record')}`;
      default:
        return `${result.recordType} ${t('records.record')}`;
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
      return <Badge color="green" className="whitespace-nowrap">{t('badges.correct')}</Badge>;
    }
    return <Badge color="red" className="whitespace-nowrap">{t('badges.faulty')}</Badge>;
  };

  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            {t('title')}
            {allValid ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            )}
          </h4>
          <Text className="text-sm text-gray-600 mt-1">
            {allValid
              ? t('allConfigured')
              : t('partiallyConfigured', { valid: validCount, total: totalCount, percentage })
            }
          </Text>
          <Text className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {t('lastChecked')}: {timeAgo}
          </Text>
        </div>
        <Button
          plain
          onClick={onRefresh}
          disabled={isRefreshing}
          className="shrink-0"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t('checking') : t('checkAgain')}
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
                <Text className="text-xs text-gray-500 uppercase">{t('fields.host')}</Text>
                <code className="text-sm font-mono text-gray-700 break-all">
                  {result.host}
                </code>
              </div>

              {/* Expected Value */}
              <div>
                <Text className="text-xs text-gray-500 uppercase">{t('fields.expectedValue')}</Text>
                <code className="text-sm font-mono text-gray-700 break-all">
                  {result.expected}
                </code>
              </div>

              {/* Actual Value */}
              <div>
                <Text className="text-xs text-gray-500 uppercase">{t('fields.foundValue')}</Text>
                {result.actual ? (
                  <code className={`text-sm font-mono break-all ${
                    result.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.actual}
                  </code>
                ) : (
                  <Text className="text-sm text-red-600 italic">
                    {result.error || t('noEntryFound')}
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
                        {t('help.possibleCauses.title')}
                      </Text>
                      <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                        <li>{t('help.possibleCauses.propagation')}</li>
                        <li>{t('help.possibleCauses.typos')}</li>
                        <li>{t('help.possibleCauses.subdomain')}</li>
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
                {t('help.troubleshooting.title')}
              </Text>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• {t('help.troubleshooting.checkValues')}</li>
                <li>• {t('help.troubleshooting.caseSensitive')}</li>
                <li>• {t('help.troubleshooting.whitespace')}</li>
                <li>• {t('help.troubleshooting.domainFormat')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}