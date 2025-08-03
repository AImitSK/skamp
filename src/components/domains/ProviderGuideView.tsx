// src/components/domains/ProviderGuideView.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlayCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentTextIcon
} from '@heroicons/react/20/solid';
import { ProviderGuide } from '@/lib/domain-providers/provider-guides';
import { DnsRecord } from '@/types/email-domains';
import { DnsRecordsList } from './DnsRecordsList';

interface ProviderGuideViewProps {
  provider: ProviderGuide;
  dnsRecords: DnsRecord[];
}

export function ProviderGuideView({ provider, dnsRecords }: ProviderGuideViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const step = provider.steps[currentStep];

  return (
    <div className="space-y-6">
      {/* Provider Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {provider.logo && (
            <img 
              src={provider.logo} 
              alt={provider.name}
              className="h-8"
            />
          )}
          <h3 className="text-lg font-semibold">
            Anleitung für {provider.name}
          </h3>
        </div>
        
        {provider.videoUrl && (
          <Button
            plain
            onClick={() => setShowVideo(!showVideo)}
            className="whitespace-nowrap"
          >
            <PlayCircleIcon className="w-4 h-4 mr-1" />
            Video-Tutorial
          </Button>
        )}
      </div>

      {/* Video Embed */}
      {showVideo && provider.videoUrl && (
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
          <iframe
            src={provider.videoUrl}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      {/* DNS Records */}
      <div>
        <Text className="font-medium mb-3">Diese Einträge benötigen Sie:</Text>
        <DnsRecordsList records={dnsRecords} compact />
      </div>

      {/* Step Navigation */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Text className="text-sm text-gray-600">
            Schritt {currentStep + 1} von {provider.steps.length}
          </Text>
          <div className="flex gap-1">
            {provider.steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-[#005fab]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Step */}
        <div className="space-y-3">
          <h4 className="font-medium">{step.title}</h4>
          
          <Text className="text-sm whitespace-pre-line">
            {step.description}
          </Text>

          {step.screenshots && step.screenshots.length > 0 && (
            <div className="mt-3">
              <img
                src={step.screenshots[0]}
                alt={step.title}
                className="rounded border border-gray-200 max-w-full"
                onError={(e) => {
                  // Fallback wenn Screenshot nicht existiert
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {step.warning && (
            <div className="flex gap-2 p-3 bg-amber-50 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
              <Text className="text-sm text-amber-800">{step.warning}</Text>
            </div>
          )}

          {step.tip && (
            <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
              <LightBulbIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <Text className="text-sm text-blue-800">{step.tip}</Text>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4">
          <Button
            plain
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="whitespace-nowrap"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Zurück
          </Button>
          <Button
            plain
            onClick={() => setCurrentStep(Math.min(provider.steps.length - 1, currentStep + 1))}
            disabled={currentStep === provider.steps.length - 1}
            className="whitespace-nowrap"
          >
            Weiter
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Common Issues */}
      {provider.commonIssues.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            Häufige Probleme & Lösungen
          </h4>
          <div className="space-y-3">
            {provider.commonIssues.map((issue, index) => (
              <details key={index} className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-gray-200 group-open:bg-[#005fab] text-gray-600 group-open:text-white flex items-center justify-center text-xs font-medium transition-colors">
                      ?
                    </div>
                    <Text className="font-medium">{issue.problem}</Text>
                  </div>
                </summary>
                <div className="mt-2 ml-7 p-3 bg-gray-50 rounded text-sm">
                  {issue.solution}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Support Link */}
      {provider.supportUrl && (
        <div className="text-center pt-4 border-t">
          <Text className="text-sm text-gray-600 mb-2">
            Benötigen Sie weitere Hilfe?
          </Text>
          <Button
            plain
            onClick={() => window.open(provider.supportUrl, '_blank')}
            className="whitespace-nowrap"
          >
            {provider.name} Support-Artikel öffnen
          </Button>
        </div>
      )}
    </div>
  );
}