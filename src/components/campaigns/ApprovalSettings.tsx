// src/components/campaigns/ApprovalSettings.tsx - VEREINFACHTE Customer-Only Freigabe-Einstellungen
"use client";

import { useState, useEffect } from 'react';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { Textarea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import { CustomerContactSelector } from './CustomerContactSelector';
import { 
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon
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
}

export function ApprovalSettings({
  value,
  onChange,
  organizationId,
  clientId,
  clientName,
  previousFeedback = []
}: SimplifiedApprovalSettingsProps) {
  
  const [localData, setLocalData] = useState<SimplifiedApprovalData>(value);

  // Sync local state with props
  useEffect(() => {
    setLocalData(value);
  }, [value]);

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
            <CustomerContactSelector
              selectedContact={value.customerContact?.contactId}
              onContactChange={(contact) => onChange({
                ...value,
                customerContact: contact
              })}
              clientId={clientId}
            />
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <Text className="text-sm text-yellow-800">
                Bitte wählen Sie zuerst einen Kunden aus, um Kontakte für die Freigabe festzulegen.
              </Text>
            </div>
          )}
          
          {/* Customer-Nachricht */}
          {/* Bisheriger Feedback-Verlauf im WhatsApp-Stil */}
          {previousFeedback && previousFeedback.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bisheriger Chatverlauf
              </label>
              <div className="bg-gray-100 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {[...previousFeedback].reverse().map((feedback, index) => {
                  const isAgency = feedback.author === 'Ihre Nachricht' || feedback.author === 'Agentur';
                  
                  return (
                    <div key={index} className={`flex ${isAgency ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative max-w-[75%] ${isAgency ? 'mr-2' : 'ml-2'}`}>
                        {/* Sprechblase */}
                        <div className={`
                          rounded-lg px-3 py-2 relative
                          ${isAgency 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white text-gray-800 border border-gray-200'}
                        `}>
                          {/* Sprechblasen-Spitze */}
                          <div className={`
                            absolute top-3 w-0 h-0
                            ${isAgency 
                              ? 'right-[-6px] border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-blue-500' 
                              : 'left-[-6px] border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-white'}
                          `}></div>
                          
                          {/* Author */}
                          <div className={`text-xs font-medium mb-1 ${isAgency ? 'text-blue-100' : 'text-gray-500'}`}>
                            {feedback.author}
                          </div>
                          
                          {/* Nachricht */}
                          <p className="text-sm break-words">{feedback.comment}</p>
                          
                          {/* Zeitstempel */}
                          <div className={`text-xs mt-1 ${isAgency ? 'text-blue-100' : 'text-gray-400'}`}>
                            {(() => {
                              try {
                                if (feedback.requestedAt?.toDate) {
                                  return new Date(feedback.requestedAt.toDate()).toLocaleString('de-DE', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  });
                                } else if (feedback.requestedAt) {
                                  return new Date(feedback.requestedAt).toLocaleString('de-DE', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    year: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  });
                                }
                              } catch (e) {
                                console.error('Fehler beim Formatieren des Datums:', e, feedback.requestedAt);
                              }
                              return '';
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
        </div>
      )}

      {/* VEREINFACHTE Workflow-Vorschau - nur Customer */}
      {value.customerApprovalRequired && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                📝 Freigabe-Workflow (Einstufig)
              </h4>
              <div className="text-sm text-blue-700">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Kampagne wird zur Kundenfreigabe eingereicht</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  <span>PDF wird automatisch generiert und an Kunde gesendet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Nach Freigabe kann Kampagne versendet werden</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// LEGACY-SUPPORT: Export für bestehende Imports
export default ApprovalSettings;