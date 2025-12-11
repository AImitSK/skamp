// src/components/domains/DnsRecordsList.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { DnsRecord } from '@/types/email-domains';
import type { DnsRecordsListProps } from '@/types/email-domains-enhanced';

export function DnsRecordsList({ records, compact = false }: DnsRecordsListProps) {
  const t = useTranslations('settings.domain.dnsRecords');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
    }
  };

  const handleCopyAll = async () => {
    const allRecords = records.map(r => 
      `${r.type}\t${r.host}\t${r.data}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(allRecords);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            onClick={handleCopyAll}
            className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
          >
            {copiedIndex === -1 ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="w-4 h-4" />
            )}
            {t('copyAll')}
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {records.map((record, index) => (
            <div key={index} className="font-mono text-xs">
              <span className="text-gray-500">{record.type}:</span>{' '}
              <span className="text-gray-700">{record.host}</span>{' → '}
              <span className="text-gray-900">{record.data}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text className="text-sm text-gray-600">
          {t('instruction')}
        </Text>
        <button
          onClick={handleCopyAll}
          className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
        >
          {copiedIndex === -1 ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <ClipboardDocumentIcon className="w-4 h-4" />
          )}
          {t('copyAll')}
        </button>
      </div>

      <div className="space-y-3">
        {records.map((record, index) => (
          <div 
            key={index}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  {t('type')}
                </Text>
                <Text className="font-medium">{record.type}</Text>
              </div>

              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  {t('hostname')}
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm break-all">
                    {record.host}
                  </Text>
                  <button
                    onClick={() => handleCopy(record.host, index * 2)}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {copiedIndex === index * 2 ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  {t('value')}
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm break-all">
                    {record.data}
                  </Text>
                  <button
                    onClick={() => handleCopy(record.data, index * 2 + 1)}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {copiedIndex === index * 2 + 1 ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
        <Text className="text-sm text-blue-800">
          <strong>{t('importantLabel')}</strong> {t('providerHint')}
        </Text>
      </div>
    </div>
  );
}