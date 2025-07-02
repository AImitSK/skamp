// src/components/calendar/EventDetailsModal.tsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CalendarEvent, EVENT_COLORS, EVENT_ICONS } from '@/types/calendar';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import Link from 'next/link';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  if (!event) return null;

  const getStatusBadge = () => {
    switch (event.status) {
      case 'completed':
        return <Badge color="green">Abgeschlossen</Badge>;
      case 'overdue':
        return <Badge color="red">Überfällig</Badge>;
      case 'pending':
        return <Badge color="yellow">Ausstehend</Badge>;
      default:
        return null;
    }
  };

  const getActionButton = () => {
    switch (event.type) {
      case 'campaign_scheduled':
      case 'campaign_sent':
        return (
          <Link href={`/dashboard/pr/campaigns/${event.campaignId}`}>
            <Button>Kampagne anzeigen</Button>
          </Link>
        );
      case 'approval_pending':
      case 'approval_overdue':
        return (
          <Link href="/dashboard/freigaben">
            <Button>Zur Freigabe</Button>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Schließen</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0" 
                       style={{ backgroundColor: EVENT_COLORS[event.type] + '20' }}>
                    <span className="text-2xl">{EVENT_ICONS[event.type]}</span>
                  </div>
                  
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {event.title}
                    </Dialog.Title>
                    
                    <div className="mt-2 space-y-3">
                      {/* Status */}
                      {event.status && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Status:</span>
                          {getStatusBadge()}
                        </div>
                      )}
                      
                      {/* Datum */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Datum:</span>
                        <span className="text-sm">
                          {event.date.toLocaleDateString('de-DE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      {/* Client */}
                      {event.metadata?.clientName && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Kunde:</span>
                          <span className="text-sm font-medium">{event.metadata.clientName}</span>
                        </div>
                      )}
                      
                      {/* Empfänger */}
                      {event.metadata?.recipientCount && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Empfänger:</span>
                          <span className="text-sm">{event.metadata.recipientCount}</span>
                        </div>
                      )}
                      
                      {/* Überfällig seit */}
                      {event.metadata?.daysOverdue && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Überfällig seit:</span>
                          <span className="text-sm text-red-600 font-medium">
                            {event.metadata.daysOverdue} Tagen
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                  {getActionButton()}
                  <Button plain onClick={onClose}>
                    Schließen
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}