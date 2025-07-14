// src/components/domains/HelpSidebar.tsx
"use client";

import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/20/solid';
import { Text } from '@/components/text';
import { Button } from '@/components/button';

interface HelpSidebarProps {
  onClose: () => void;
  currentStep: 'start' | 'manage' | 'trouble';
}

export function HelpSidebar({ onClose, currentStep }: HelpSidebarProps) {
  const helpContent = {
    start: {
      title: 'Erste Schritte',
      items: [
        {
          icon: PlayCircleIcon,
          title: '5-Minuten Video-Tutorial',
          description: 'Sehen Sie, wie einfach die Einrichtung ist',
          action: () => window.open('https://help.skamp.de/domain-setup-video', '_blank')
        },
        {
          icon: DocumentTextIcon,
          title: 'Warum eigene Domain?',
          description: 'Erfahren Sie, warum dies wichtig ist',
          action: () => window.open('https://help.skamp.de/why-domain', '_blank')
        },
        {
          icon: ChatBubbleLeftRightIcon,
          title: 'Live-Support',
          description: 'Wir helfen Ihnen bei der Einrichtung',
          action: () => window.open('https://app.skamp.de/support/chat', '_blank')
        }
      ]
    },
    manage: {
      title: 'Domain verwalten',
      items: [
        {
          icon: QuestionMarkCircleIcon,
          title: 'Häufige Probleme',
          description: 'Lösungen für typische Fehler',
          action: () => window.open('https://help.skamp.de/domain-troubleshooting', '_blank')
        },
        {
          icon: DocumentTextIcon,
          title: 'Best Practices',
          description: 'Tipps für optimale Zustellbarkeit',
          action: () => window.open('https://help.skamp.de/email-best-practices', '_blank')
        },
        {
          icon: ChatBubbleLeftRightIcon,
          title: 'Support kontaktieren',
          description: 'Bei Fragen sind wir für Sie da',
          action: () => window.open('https://app.skamp.de/support/ticket', '_blank')
        }
      ]
    },
    trouble: {
      title: 'Problembehebung',
      items: [
        {
          icon: ChatBubbleLeftRightIcon,
          title: 'Support kontaktieren',
          description: 'Direkter Kontakt zu unserem Team',
          action: () => window.open('https://app.skamp.de/support/ticket', '_blank')
        }
      ]
    }
  };

  const content = helpContent[currentStep];

  return (
    <div className="w-80 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{content.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        {content.items.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-[#005fab] hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <item.icon className="h-5 w-5 text-gray-400 group-hover:text-[#005fab] mt-0.5" />
              <div className="flex-1">
                <Text className="font-medium text-sm">{item.title}</Text>
                <Text className="text-xs text-gray-600 mt-0.5">
                  {item.description}
                </Text>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <Text className="text-sm text-blue-800">
          <strong>Tipp:</strong> Die meisten Probleme entstehen durch Tippfehler 
          in den DNS-Einträgen. Prüfen Sie jeden Buchstaben genau!
        </Text>
      </div>

      {currentStep === 'start' && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <Text className="text-sm text-green-800">
            <strong>Gut zu wissen:</strong> Die Einrichtung dauert meist nur 10-15 Minuten. 
            Wir haben schon über 1.000 Kunden erfolgreich durch den Prozess geführt.
          </Text>
        </div>
      )}
    </div>
  );
}