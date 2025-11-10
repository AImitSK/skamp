// src/components/campaigns/ApprovalSettings.tsx - VEREINFACHTE Customer-Only Freigabe-Einstellungen
"use client";

import { useState, useEffect } from 'react';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { Textarea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { CustomerContactSelector } from './CustomerContactSelector';
import { FeedbackChatView } from '../freigabe/FeedbackChatView';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// VEREINFACHTE ApprovalData nur für Customer
interface SimplifiedApprovalData {
  customerApprovalRequired: boolean;
  customerContact?: any; // CustomerContact type
  customerApprovalMessage?: string;
}

interface SimplifiedApprovalSettingsProps {
  value: SimplifiedApprovalData;
  onChange: (data: SimplifiedApprovalData) => void;
  organizationId: string;
  clientId?: string;
  clientName?: string;
  previousFeedback?: any[]; // Bisheriger Feedback-Verlauf
  currentApproval?: any; // Aktuelle Freigabe für Historie-Modal
}

export function ApprovalSettings({
  value,
  onChange,
  organizationId,
  clientId,
  clientName,
  previousFeedback = [],
  currentApproval
}: SimplifiedApprovalSettingsProps) {
  
  const [localData, setLocalData] = useState<SimplifiedApprovalData>(value);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Sync local state with props
  useEffect(() => {
    setLocalData(value);
  }, [value]);

  // Lade TeamMember-Daten beim Öffnen des Modals
  useEffect(() => {
    if (showHistoryModal && organizationId && teamMembers.length === 0) {
      const loadTeamMembers = async () => {
        try {
          const members = await teamMemberService.getByOrganization(organizationId);
          setTeamMembers(members);
        } catch (error) {
          console.error('Fehler beim Laden der TeamMember-Daten:', error);
        }
      };
      loadTeamMembers();
    }
  }, [showHistoryModal, organizationId, teamMembers.length]);

  const handleDataChange = (updates: Partial<SimplifiedApprovalData>) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    onChange(newData);
  };

  const handleCustomerApprovalToggle = (enabled: boolean) => {
    handleDataChange({
      customerApprovalRequired: enabled,
      // Reset contact wenn deaktiviert
      customerContact: enabled ? localData.customerContact : undefined,
      customerApprovalMessage: enabled ? localData.customerApprovalMessage : ''
    });
  };

  return (
    <div className="space-y-6">
      
      {/* NUR NOCH: Kunden-Freigabe */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            Kundenfreigabe erforderlich
          </h4>
          <Text className="text-sm text-gray-600 mt-1">
            Kampagne muss vom Kunden freigegeben werden
          </Text>
        </div>
        <SimpleSwitch
          checked={value.customerApprovalRequired}
          onChange={handleCustomerApprovalToggle}
        />
      </div>

      {/* Customer-Kontakt Auswahl */}
      {value.customerApprovalRequired && (
        <div className="ml-6 space-y-4">
          {clientId ? (
            <>
              <CustomerContactSelector
                selectedContact={value.customerContact?.contactId}
                onContactChange={(contact) => onChange({
                  ...value,
                  customerContact: contact
                })}
                clientId={clientId}
              />

              {/* Warnung wenn kein Kontakt ausgewählt */}
              {!value.customerContact?.contactId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Text className="text-sm text-amber-800 font-medium">
                      Kontakt erforderlich
                    </Text>
                    <Text className="text-xs text-amber-700 mt-1">
                      Bitte wählen Sie einen Kontakt aus. Die Kampagne kann erst gespeichert werden, wenn ein Freigabe-Kontakt ausgewählt wurde.
                    </Text>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <Text className="text-sm text-yellow-800">
                Bitte wählen Sie zuerst einen Kunden aus, um Kontakte für die Freigabe festzulegen.
              </Text>
            </div>
          )}
          
          {/* Customer-Nachricht */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Neue Nachricht an den Kunden (optional)
            </label>
            <Textarea
              value={value.customerApprovalMessage || ''}
              onChange={(e) => onChange({
                ...value,
                customerApprovalMessage: e.target.value
              })}
              rows={2}
              placeholder="Neue Nachricht für die erneute Freigabe-Anfrage..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Diese Nachricht wird als erste im Feedback-Chat angezeigt.
            </p>
          </div>

          {/* Chat-Historie Button */}
          {(previousFeedback?.length > 0 || currentApproval?.history?.length > 0) && (
            <div className="mt-3">
              <Button
                color="secondary"
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 text-sm px-3 py-1.5"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Chat-Verlauf anzeigen
              </Button>
            </div>
          )}
        </div>
      )}
      {/* Chat-Historie Modal - Neuer FeedbackChatView */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Chat-Verlauf</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <FeedbackChatView
                communications={(() => {
                  // Konvertiere currentApproval.history zu CommunicationItem Format
                  // FALLBACK: Wenn currentApproval undefined ist, nutze previousFeedback
                  if (!currentApproval?.history) {
                    if (!previousFeedback || previousFeedback.length === 0) return [];
                    
                    // Konvertiere previousFeedback zu CommunicationItem Format
                    return previousFeedback
                      .sort((a, b) => {
                        const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt).getTime());
                        const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt).getTime());
                        return aTime - bTime; // Älteste zuerst
                      })
                      .map((feedback, index) => {
                        // Da action undefined ist, erkenne Kunde anhand des Namens
                        const isCustomer = feedback.author === clientName || feedback.author?.includes('Kühneee');
                        const senderName = isCustomer 
                          ? (feedback.author || clientName || 'Kunde')
                          : (feedback.author || 'Teammitglied');
                        
                        const senderAvatar = isCustomer
                          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                          : (() => {
                              // Suche das Teammitglied für echtes Avatar
                              const member = teamMembers.find(m => 
                                m.displayName === senderName || 
                                `${m.firstName} ${m.lastName}`.trim() === senderName
                              );
                              return member?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
                            })();

                        return {
                          id: `legacy-${index}`,
                          type: 'feedback' as const,
                          content: feedback.comment || '',
                          message: feedback.comment || '',
                          sender: {
                            id: 'unknown',
                            name: senderName,
                            email: '',
                            role: isCustomer ? 'customer' as const : 'agency' as const
                          },
                          senderName: senderName,
                          senderAvatar: senderAvatar,
                          createdAt: feedback.requestedAt?.toDate ? feedback.requestedAt.toDate() : (feedback.requestedAt instanceof Date ? feedback.requestedAt : new Date(feedback.requestedAt)),
                          isRead: true,
                          campaignId: '',
                          organizationId: organizationId || '',
                          manualApproval: false // Legacy feedback hat keine manuelle Freigabe
                        };
                      });
                  }
                  
                  return currentApproval.history
                    .filter((h: any) => h.details?.comment) // Nur Einträge mit Kommentaren
                    .sort((a: any, b: any) => {
                      const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                      const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                      return aTime - bTime; // Älteste zuerst
                    })
                    .map((historyEntry: any, index: number) => {
                      const isCustomer = historyEntry.action === 'changes_requested';
                      const senderName = isCustomer 
                        ? (currentApproval.recipients?.[0]?.name || historyEntry.actorName || 'Kunde')
                        : (historyEntry.actorName || 'Teammitglied');
                      
                      const senderAvatar = isCustomer
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;

                      return {
                        id: historyEntry.id || `history-${index}`,
                        type: 'feedback' as const,
                        content: historyEntry.details?.comment || '',
                        message: historyEntry.details?.comment || '',
                        sender: {
                          id: 'unknown',
                          name: senderName,
                          email: historyEntry.actorEmail || '',
                          role: isCustomer ? 'customer' as const : 'agency' as const
                        },
                        senderName: senderName,
                        senderAvatar: senderAvatar,
                        createdAt: historyEntry.timestamp?.seconds
                          ? new Date(historyEntry.timestamp.seconds * 1000)
                          : new Date(historyEntry.timestamp),
                        isRead: true,
                        campaignId: currentApproval.campaignId || '',
                        organizationId: organizationId || '',
                        manualApproval: historyEntry.details?.manualApproval || false,
                        manualChangesRequested: historyEntry.details?.manualChangesRequested || false
                      };
                    });
                })()}
                latestMessage={(() => {
                  // Finde die neueste Nachricht für das Latest-Banner
                  // FALLBACK: Wenn currentApproval undefined ist, nutze previousFeedback
                  if (!currentApproval?.history) {
                    if (!previousFeedback || previousFeedback.length === 0) return undefined;
                    
                    // Finde neueste Nachricht aus previousFeedback
                    const sortedFeedback = previousFeedback.sort((a, b) => {
                      const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt).getTime());
                      const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt).getTime());
                      return bTime - aTime; // Neueste zuerst
                    });
                    
                    const latest = sortedFeedback[0];
                    const isCustomer = latest.author === clientName || latest.author?.includes('Kühneee');
                    const senderName = isCustomer 
                      ? (latest.author || clientName || 'Kunde')
                      : (latest.author || 'Teammitglied');
                    
                    const senderAvatar = isCustomer
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                      : (() => {
                          // Suche das Teammitglied für echtes Avatar
                          const member = teamMembers.find(m => 
                            m.displayName === senderName || 
                            `${m.firstName} ${m.lastName}`.trim() === senderName
                          );
                          return member?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
                        })();

                    return {
                      id: 'legacy-latest',
                      type: 'feedback' as const,
                      content: latest.comment || '',
                      message: latest.comment || '',
                      sender: {
                        id: 'unknown',
                        name: senderName,
                        email: '',
                        role: isCustomer ? 'customer' as const : 'agency' as const
                      },
                      senderName: senderName,
                      senderAvatar: senderAvatar,
                      createdAt: latest.requestedAt?.toDate ? latest.requestedAt.toDate() : (latest.requestedAt instanceof Date ? latest.requestedAt : new Date(latest.requestedAt)),
                      isRead: true,
                      campaignId: '',
                      organizationId: organizationId || '',
                      manualApproval: false // Legacy feedback hat keine manuelle Freigabe
                    };
                  }
                  
                  const feedbackEntries = currentApproval.history
                    .filter((h: any) => h.details?.comment)
                    .sort((a: any, b: any) => {
                      const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                      const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                      return bTime - aTime; // Neueste zuerst
                    });
                    
                  if (feedbackEntries.length === 0) return undefined;
                  
                  const latest = feedbackEntries[0];
                  const isCustomer = latest.action === 'changes_requested';
                  const senderName = isCustomer 
                    ? (currentApproval.recipients?.[0]?.name || latest.actorName || 'Kunde')
                    : (latest.actorName || 'Teammitglied');
                  
                  const senderAvatar = isCustomer
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;

                  return {
                    id: latest.id || 'latest',
                    type: 'feedback' as const,
                    content: latest.details?.comment || '',
                    message: latest.details?.comment || '',
                    sender: {
                      id: 'unknown',
                      name: senderName,
                      email: latest.actorEmail || '',
                      role: isCustomer ? 'customer' as const : 'agency' as const
                    },
                    senderName: senderName,
                    senderAvatar: senderAvatar,
                    createdAt: latest.timestamp?.seconds
                      ? new Date(latest.timestamp.seconds * 1000)
                      : new Date(latest.timestamp),
                    isRead: true,
                    campaignId: currentApproval.campaignId || '',
                    organizationId: organizationId || '',
                    manualApproval: latest.details?.manualApproval || false,
                    manualChangesRequested: latest.details?.manualChangesRequested || false
                  };
                })()}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// LEGACY-SUPPORT: Export für bestehende Imports
export default ApprovalSettings;