// src/components/domains/HelpSidebar.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
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
} from '@heroicons/react/20/solid';

interface HelpSidebarProps {
  onClose: () => void;
  currentStep?: 'start' | 'manage' | 'verify' | 'dns';
}

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

interface GuideStep {
  title: string;
  description: string;
  tip?: string;
}

export function HelpSidebar({ onClose, currentStep = 'start' }: HelpSidebarProps) {
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
            title: '1. Domain auswählen',
            description: 'Wählen Sie die Domain aus, von der Sie E-Mails versenden möchten.',
            tip: 'Verwenden Sie Ihre Haupt-Domain für beste Ergebnisse'
          },
          {
            title: '2. Provider angeben',
            description: 'Teilen Sie uns mit, wo Ihre Domain registriert ist.',
            tip: 'Die meisten Domains sind bei Namecheap, GoDaddy oder Cloudflare'
          },
          {
            title: '3. DNS-Einträge hinzufügen',
            description: 'Kopieren Sie die angezeigten DNS-Einträge in Ihre Domain-Verwaltung.',
            tip: 'Die Einträge müssen exakt kopiert werden, inklusive Punkte'
          },
          {
            title: '4. Verifizierung abwarten',
            description: 'Nach dem Hinzufügen dauert es 5-30 Minuten bis zur Verifizierung.',
            tip: 'In seltenen Fällen kann es bis zu 48 Stunden dauern'
          }
        ];
      
      case 'dns':
        return [
          {
            title: 'DNS-Einträge lokalisieren',
            description: 'Loggen Sie sich bei Ihrem Domain-Provider ein und navigieren Sie zu den DNS-Einstellungen.',
            tip: 'Suchen Sie nach "DNS", "Zone Editor" oder "Advanced DNS"'
          },
          {
            title: 'CNAME-Einträge hinzufügen',
            description: 'Fügen Sie die drei CNAME-Einträge exakt wie angezeigt hinzu.',
            tip: 'Achten Sie auf Groß-/Kleinschreibung und Punkte am Ende'
          },
          {
            title: 'TTL auf niedrig setzen',
            description: 'Setzen Sie die TTL (Time To Live) auf 300 oder 600 Sekunden.',
            tip: 'Dies beschleunigt die Propagierung der Änderungen'
          }
        ];
      
      case 'verify':
        return [
          {
            title: 'Automatische Überprüfung',
            description: 'Klicken Sie auf "DNS prüfen" um den Status zu aktualisieren.',
            tip: 'Die Prüfung kann alle 5 Minuten wiederholt werden'
          },
          {
            title: 'Fehlerbehebung',
            description: 'Bei roten Einträgen prüfen Sie die kopierten Werte.',
            tip: 'Häufigster Fehler: Leerzeichen am Anfang oder Ende'
          },
          {
            title: 'Geduld haben',
            description: 'DNS-Änderungen brauchen Zeit zur Verbreitung.',
            tip: 'Nach 48 Stunden kontaktieren Sie den Support'
          }
        ];
        
      default:
        return [
          {
            title: 'Domains verwalten',
            description: 'Hier sehen Sie alle Ihre konfigurierten Domains.',
            tip: 'Verifizierte Domains haben ein grünes Häkchen'
          },
          {
            title: 'Inbox-Tests durchführen',
            description: 'Testen Sie die Zustellbarkeit Ihrer E-Mails.',
            tip: 'Führen Sie regelmäßig Tests durch'
          },
          {
            title: 'Weitere Domains hinzufügen',
            description: 'Sie können beliebig viele Domains authentifizieren.',
            tip: 'Jede Domain verbessert die Zustellbarkeit für diese spezifische Domain'
          }
        ];
    }
  };

  const faqs: FAQItem[] = [
    {
      question: 'Warum muss ich meine Domain authentifizieren?',
      answer: 'Ohne Authentifizierung werden Ihre E-Mails von einer fremden Domain versendet, was die Wahrscheinlichkeit erhöht, dass sie im Spam landen. Mit eigener Domain steigt die Zustellrate auf über 95%.',
      category: 'Grundlagen'
    },
    {
      question: 'Wie lange dauert die Verifizierung?',
      answer: 'In den meisten Fällen 5-30 Minuten. DNS-Änderungen können jedoch bis zu 48 Stunden dauern, bis sie weltweit propagiert sind.',
      category: 'Verifizierung'
    },
    {
      question: 'Was bedeuten die verschiedenen DNS-Einträge?',
      answer: 'Mail CNAME: Haupteintrag für E-Mail-Versand. DKIM 1 & 2: Digitale Signaturen, die beweisen, dass E-Mails wirklich von Ihrer Domain kommen.',
      category: 'Technisch'
    },
    {
      question: 'Kann ich mehrere Domains hinzufügen?',
      answer: 'Ja, Sie können beliebig viele Domains authentifizieren. Jede Domain funktioniert unabhängig voneinander.',
      category: 'Verwaltung'
    },
    {
      question: 'Was ist ein Inbox-Test?',
      answer: 'Ein Test, bei dem wir E-Mails an verschiedene Provider senden, um zu prüfen, ob sie im Posteingang oder Spam landen.',
      category: 'Tests'
    },
    {
      question: 'Meine Domain wird als "Fehlgeschlagen" angezeigt',
      answer: 'Überprüfen Sie: 1) Wurden alle DNS-Einträge korrekt kopiert? 2) Sind keine Leerzeichen enthalten? 3) Wurde die TTL niedrig gesetzt? Nach Korrekturen dauert es wieder bis zu 30 Minuten.',
      category: 'Fehlerbehebung'
    }
  ];

  const currentFAQs = faqs.filter(faq => {
    if (currentStep === 'start') return faq.category === 'Grundlagen';
    if (currentStep === 'dns' || currentStep === 'verify') return faq.category === 'Verifizierung' || faq.category === 'Technisch';
    return true;
  });

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-5 h-5 text-blue-500" />
          Hilfe & Anleitungen
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
          onClick={() => window.open('https://help.skamp.de/domains', '_blank')}
        >
          <PlayCircleIcon className="w-5 h-5 text-blue-500" />
          Video-Tutorial ansehen
        </Button>
        <Button
          plain
          className="w-full justify-start gap-2 text-left"
          onClick={() => window.open('https://docs.skamp.de/email/domains', '_blank')}
        >
          <DocumentTextIcon className="w-5 h-5 text-gray-500" />
          Dokumentation lesen
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
            Schritt-für-Schritt
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
          <h4 className="font-medium text-gray-900">Häufige Fragen</h4>
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
              <Text className="text-sm font-medium text-amber-900">Häufige Fehler</Text>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>• Leerzeichen in DNS-Werten</li>
                <li>• Fehlende Punkte am Ende</li>
                <li>• Falsche Subdomain verwendet</li>
                <li>• TTL zu hoch eingestellt</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Support Contact */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Text className="text-sm text-gray-600 text-center">
          Weitere Hilfe benötigt?
        </Text>
        <Button
          plain
          className="w-full mt-2 justify-center"
          onClick={() => window.open('mailto:support@skamp.de?subject=Domain-Authentifizierung', '_blank')}
        >
          Support kontaktieren
        </Button>
      </div>
    </div>
  );
}