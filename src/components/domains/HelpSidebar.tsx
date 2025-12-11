// src/components/domains/HelpSidebar.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  XMarkIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import type { HelpSidebarProps, FAQItem, GuideStep } from '@/types/email-domains-enhanced';

export function HelpSidebar({ onClose, currentStep = 'start' }: HelpSidebarProps) {
  const t = useTranslations('domains.help');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('guides');

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Context-specific content
  const getGuideSteps = (): GuideStep[] => {
    switch (currentStep) {
      case 'start':
        return [
          {
            title: t('guides.start.step1.title'),
            description: t('guides.start.step1.description'),
            tip: t('guides.start.step1.tip')
          },
          {
            title: t('guides.start.step2.title'),
            description: t('guides.start.step2.description'),
            tip: t('guides.start.step2.tip')
          },
          {
            title: t('guides.start.step3.title'),
            description: t('guides.start.step3.description'),
            tip: t('guides.start.step3.tip')
          },
          {
            title: t('guides.start.step4.title'),
            description: t('guides.start.step4.description'),
            tip: t('guides.start.step4.tip')
          }
        ];
      
      case 'dns':
        return [
          {
            title: t('guides.dns.step1.title'),
            description: t('guides.dns.step1.description'),
            tip: t('guides.dns.step1.tip')
          },
          {
            title: t('guides.dns.step2.title'),
            description: t('guides.dns.step2.description'),
            tip: t('guides.dns.step2.tip')
          },
          {
            title: t('guides.dns.step3.title'),
            description: t('guides.dns.step3.description'),
            tip: t('guides.dns.step3.tip')
          }
        ];
      
      case 'verify':
        return [
          {
            title: t('guides.verify.step1.title'),
            description: t('guides.verify.step1.description'),
            tip: t('guides.verify.step1.tip')
          },
          {
            title: t('guides.verify.step2.title'),
            description: t('guides.verify.step2.description'),
            tip: t('guides.verify.step2.tip')
          },
          {
            title: t('guides.verify.step3.title'),
            description: t('guides.verify.step3.description'),
            tip: t('guides.verify.step3.tip')
          }
        ];

      default:
        return [
          {
            title: t('guides.default.step1.title'),
            description: t('guides.default.step1.description'),
            tip: t('guides.default.step1.tip')
          },
          {
            title: t('guides.default.step2.title'),
            description: t('guides.default.step2.description'),
            tip: t('guides.default.step2.tip')
          },
          {
            title: t('guides.default.step3.title'),
            description: t('guides.default.step3.description'),
            tip: t('guides.default.step3.tip')
          }
        ];
    }
  };

  const faqs: FAQItem[] = [
    {
      question: t('faq.authenticate.question'),
      answer: t('faq.authenticate.answer'),
      category: t('faq.categories.basics')
    },
    {
      question: t('faq.duration.question'),
      answer: t('faq.duration.answer'),
      category: t('faq.categories.verification')
    },
    {
      question: t('faq.dnsRecords.question'),
      answer: t('faq.dnsRecords.answer'),
      category: t('faq.categories.technical')
    },
    {
      question: t('faq.multipleDomains.question'),
      answer: t('faq.multipleDomains.answer'),
      category: t('faq.categories.management')
    },
    {
      question: t('faq.inboxTest.question'),
      answer: t('faq.inboxTest.answer'),
      category: t('faq.categories.tests')
    },
    {
      question: t('faq.failed.question'),
      answer: t('faq.failed.answer'),
      category: t('faq.categories.troubleshooting')
    }
  ];

  const currentFAQs = faqs.filter(faq => {
    if (currentStep === 'start') return faq.category === t('faq.categories.basics');
    if (currentStep === 'dns' || currentStep === 'verify') return faq.category === t('faq.categories.verification') || faq.category === t('faq.categories.technical');
    return true;
  });

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-5 h-5 text-blue-500" />
          {t('title')}
        </h3>
        <Button plain onClick={onClose} className="p-1">
          <XMarkIcon className="w-5 h-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 space-y-2">
        <Button
          plain
          className="w-full justify-start gap-2 text-left"
          onClick={() => window.open('https://help.celeropress.de/domains', '_blank')}
        >
          <PlayCircleIcon className="w-5 h-5 text-blue-500" />
          {t('actions.watchVideo')}
        </Button>
        <Button
          plain
          className="w-full justify-start gap-2 text-left"
          onClick={() => window.open('https://docs.celeropress.de/email/domains', '_blank')}
        >
          <DocumentTextIcon className="w-5 h-5 text-gray-500" />
          {t('actions.readDocs')}
        </Button>
      </div>

      {/* Step-by-Step Guide */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('guides')}
          className="w-full flex items-center justify-between mb-3 text-left"
        >
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <LightBulbIcon className="w-4 h-4 text-yellow-500" />
            {t('sections.stepByStep')}
          </h4>
          {expandedSection === 'guides' ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSection === 'guides' && (
          <div className="space-y-3">
            {getGuideSteps().map((step, index) => (
              <div key={index} className="relative pl-7">
                <div className="absolute left-0 top-1">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                </div>
                <div>
                  <Text className="font-medium text-gray-900 text-sm">{step.title}</Text>
                  <Text className="text-sm text-gray-600 mt-1">{step.description}</Text>
                  {step.tip && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 flex gap-1">
                      <LightBulbIcon className="w-3 h-3 shrink-0 mt-0.5" />
                      {step.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQs */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('faq')}
          className="w-full flex items-center justify-between mb-3 text-left"
        >
          <h4 className="font-medium text-gray-900">{t('sections.faq')}</h4>
          {expandedSection === 'faq' ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSection === 'faq' && (
          <div className="space-y-2">
            {currentFAQs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full p-3 text-left flex items-start justify-between gap-2 hover:bg-gray-50"
                >
                  <Text className="text-sm font-medium text-gray-900">{faq.question}</Text>
                  {expandedFAQ === index ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-3 pb-3">
                    <Text className="text-sm text-gray-600">{faq.answer}</Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Common Issues */}
      {(currentStep === 'dns' || currentStep === 'verify') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <Text className="text-sm font-medium text-amber-900">{t('commonIssues.title')}</Text>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>• {t('commonIssues.whitespace')}</li>
                <li>• {t('commonIssues.missingDots')}</li>
                <li>• {t('commonIssues.wrongSubdomain')}</li>
                <li>• {t('commonIssues.ttlTooHigh')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Support Contact */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Text className="text-sm text-gray-600 text-center">
          {t('support.needHelp')}
        </Text>
        <Button
          plain
          className="w-full mt-2 justify-center"
          onClick={() => window.open('mailto:support@celeropress.de?subject=Domain-Authentifizierung', '_blank')}
        >
          {t('support.contact')}
        </Button>
      </div>
    </div>
  );
}