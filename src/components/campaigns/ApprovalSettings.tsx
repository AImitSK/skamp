// src/components/campaigns/ApprovalSettings.tsx - Erweiterte Freigabe-Einstellungen
"use client";

import { useState, useEffect } from 'react';
import { 
  EnhancedApprovalData, 
  ApprovalSettingsProps,
  createDefaultEnhancedApprovalData 
} from '@/types/approvals-enhanced';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { TeamMember } from '@/types/international';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { Textarea } from '@/components/ui/textarea';
import { Field, Label } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { TeamMemberSelector } from './TeamMemberSelector';
import { CustomerContactSelector } from './CustomerContactSelector';
import { 
  UserGroupIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export function ApprovalSettings({
  value,
  onChange,
  organizationId,
  clientId,
  clientName
}: ApprovalSettingsProps) {
  // Ensure we have valid enhanced approval data
  const [localData, setLocalData] = useState<EnhancedApprovalData>(() => {
    if (!value.teamApprovalRequired && !value.customerApprovalRequired) {
      return {
        ...createDefaultEnhancedApprovalData(),
        ...value
      };
    }
    return value;
  });
  
  // TeamMembers für Name-Lookup
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Lade TeamMembers
  useEffect(() => {
    if (organizationId) {
      loadTeamMembers();
    }
  }, [organizationId]);

  const loadTeamMembers = async () => {
    try {
      const members = await teamMemberService.getByOrganization(organizationId);
      setTeamMembers(members);
    } catch (error) {
      console.error('Fehler beim Laden der TeamMembers:', error);
    }
  };

  // Sync local state with props
  useEffect(() => {
    setLocalData(value);
  }, [value]);

  const handleDataChange = (updates: Partial<EnhancedApprovalData>) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    onChange(newData);
  };

  const handleTeamApprovalToggle = (enabled: boolean) => {
    handleDataChange({
      teamApprovalRequired: enabled,
      // Reset current stage if disabling team approval
      currentStage: enabled ? 'team' : (localData.customerApprovalRequired ? 'customer' : 'team')
    });
  };

  const handleCustomerApprovalToggle = (enabled: boolean) => {
    handleDataChange({
      customerApprovalRequired: enabled,
      // If only customer approval is enabled, start with customer stage
      currentStage: (!localData.teamApprovalRequired && enabled) ? 'customer' : localData.currentStage
    });
  };

  const handleTeamMembersChange = (memberIds: string[]) => {
    // Konvertiere TeamMember IDs zu TeamApprover-Objekten mit echten Daten
    const teamApprovers = memberIds.map(id => {
      const teamMember = teamMembers.find(member => member.id === id);
      return {
        userId: id,
        displayName: teamMember?.displayName || 'Unbekannt',
        email: teamMember?.email || 'unknown@company.com',
        photoUrl: teamMember?.photoUrl,
        status: 'pending' as const
      };
    });

    handleDataChange({
      teamApprovers
    });
  };

  const handleCustomerContactChange = (contactId?: string) => {
    if (!contactId) {
      handleDataChange({
        customerContact: undefined
      });
      return;
    }

    // Placeholder - would load contact details from CRM
    const customerContact = {
      contactId,
      name: `Contact ${contactId}`,
      email: `contact${contactId}@client.com`,
      companyName: clientName || 'Client Company'
    };

    handleDataChange({
      customerContact
    });
  };

  const getWorkflowStages = () => {
    const stages = [];
    
    if (localData.teamApprovalRequired) {
      stages.push({
        type: 'team',
        label: 'Team-Freigabe',
        count: localData.teamApprovers.length,
        icon: UserGroupIcon
      });
    }
    
    if (localData.customerApprovalRequired) {
      stages.push({
        type: 'customer',
        label: 'Kunden-Freigabe',
        count: localData.customerContact ? 1 : 0,
        icon: BuildingOfficeIcon
      });
    }
    
    return stages;
  };

  const workflowStages = getWorkflowStages();
  const hasAnyApproval = localData.teamApprovalRequired || localData.customerApprovalRequired;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Freigabe-Einstellungen</h3>
        <Text className="mt-1 text-gray-600">
          Konfigurieren Sie den mehrstufigen Freigabe-Workflow für diese Kampagne
        </Text>
      </div>

      {/* Switch-Optionen */}
      <div className="space-y-6">
        {/* Team-Freigabe */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              Team-Freigabe erforderlich
            </h4>
            <Text className="text-sm text-gray-600 mt-1">
              Kampagne muss von ausgewählten Team-Mitgliedern freigegeben werden
            </Text>
          </div>
          <SimpleSwitch
            checked={localData.teamApprovalRequired}
            onChange={handleTeamApprovalToggle}
          />
        </div>

        {/* Team-Mitglieder Auswahl */}
        {localData.teamApprovalRequired && (
          <div className="ml-6 space-y-4">
            <TeamMemberSelector
              selectedMembers={localData.teamApprovers.map(a => a.userId)}
              onSelectionChange={handleTeamMembersChange}
              organizationId={organizationId}
            />
            
            {/* Team-Nachricht */}
            <Field>
              <Label className="text-sm font-medium text-gray-700">
                Nachricht für Team-Mitglieder (optional)
              </Label>
              <Textarea
                value={localData.teamApprovalMessage || ''}
                onChange={(e) => handleDataChange({ teamApprovalMessage: e.target.value })}
                rows={3}
                placeholder="Besondere Hinweise für die Team-Freigabe..."
                className="mt-1"
              />
            </Field>
          </div>
        )}

        {/* Kunden-Freigabe */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              Kunden-Freigabe erforderlich
            </h4>
            <Text className="text-sm text-gray-600 mt-1">
              Kampagne muss vom Kunden freigegeben werden
            </Text>
          </div>
          <SimpleSwitch
            checked={localData.customerApprovalRequired}
            onChange={handleCustomerApprovalToggle}
          />
        </div>

        {/* Kunden-Kontakt Auswahl */}
        {localData.customerApprovalRequired && (
          <div className="ml-6 space-y-4">
            {clientId ? (
              <CustomerContactSelector
                selectedContact={localData.customerContact?.contactId}
                onContactChange={handleCustomerContactChange}
                clientId={clientId}
              />
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-amber-400 mr-2" />
                  <Text className="text-sm text-amber-800">
                    Bitte wählen Sie zuerst einen Kunden aus, um Kontakte anzuzeigen.
                  </Text>
                </div>
              </div>
            )}
            
            {/* Kunden-Nachricht */}
            <Field>
              <Label className="text-sm font-medium text-gray-700">
                Nachricht für Kunden (optional)
              </Label>
              <Textarea
                value={localData.customerApprovalMessage || ''}
                onChange={(e) => handleDataChange({ customerApprovalMessage: e.target.value })}
                rows={3}
                placeholder="Besondere Hinweise für die Kunden-Freigabe..."
                className="mt-1"
              />
            </Field>
          </div>
        )}
      </div>

      {/* Workflow-Vorschau */}
      {hasAnyApproval && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Freigabe-Workflow Vorschau
              </h4>
              
              {workflowStages.length > 0 ? (
                <div className="flex items-center space-x-3">
                  {workflowStages.map((stage, index) => {
                    const StageIcon = stage.icon;
                    return (
                      <div key={stage.type} className="flex items-center">
                        <div className="flex items-center gap-2">
                          <div className={clsx(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            stage.type === 'team' ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                          )}>
                            <StageIcon className="h-3 w-3" />
                            {stage.label}
                            {stage.count > 0 && (
                              <Badge color={stage.type === 'team' ? 'blue' : 'green'} className="ml-1">
                                {stage.count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {index < workflowStages.length - 1 && (
                          <ArrowRightIcon className="h-4 w-4 text-blue-400 mx-2" />
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex items-center">
                    <ArrowRightIcon className="h-4 w-4 text-blue-400 mx-2" />
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3" />
                      Versand freigegeben
                    </div>
                  </div>
                </div>
              ) : (
                <Text className="text-sm text-blue-700">
                  Bitte konfigurieren Sie die Freigabe-Optionen oben
                </Text>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info-Box bei keiner Freigabe */}
      {!hasAnyApproval && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <Text className="text-sm text-gray-600">
                <strong>Keine Freigabe erforderlich:</strong> Die Kampagne kann direkt versendet werden, 
                ohne dass eine Freigabe von Team-Mitgliedern oder Kunden erforderlich ist.
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}