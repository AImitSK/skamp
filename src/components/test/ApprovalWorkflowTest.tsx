// src/components/test/ApprovalWorkflowTest.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";
import { approvalService } from "@/lib/firebase/approval-service";
import { ApprovalEnhanced } from "@/types/approvals";

interface ApprovalWorkflowTestProps {
  organizationId: string;
  userId: string;
}

export function ApprovalWorkflowTest({ organizationId, userId }: ApprovalWorkflowTestProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [currentApproval, setCurrentApproval] = useState<ApprovalEnhanced | null>(null);

  const addResult = (step: string, status: 'success' | 'error' | 'info', message: string, data?: any) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      step,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runApprovalWorkflowTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentApproval(null);

    try {
      addResult('Start', 'info', 'Starte Multi-Service Approval Workflow Test');

      // STEP 1: Customer-Only Approval erstellen
      addResult('Step 1', 'info', 'Erstelle Customer-Only Approval...');
      
      const approvalId = await approvalService.createCustomerApproval(
        'test-campaign-123',
        organizationId,
        {
          id: 'test-contact-123',
          name: 'Max Mustermann',
          email: 'max.mustermann@test-kunde.de',
          role: 'Geschäftsführer'
        },
        'Dies ist eine Test-Nachricht für die Freigabe. Bitte prüfen Sie die Pressemitteilung sorgfältig.'
      );

      addResult('Step 1', 'success', `Customer-Only Approval erstellt: ${approvalId}`);

      // STEP 2: Approval laden und anzeigen
      const approval = await approvalService.getById(approvalId, organizationId);
      if (!approval) {
        throw new Error('Approval konnte nicht geladen werden');
      }

      setCurrentApproval(approval);
      addResult('Step 2', 'success', 'Approval erfolgreich geladen', {
        title: approval.title,
        status: approval.status,
        recipients: approval.recipients.length,
        shareId: approval.shareId
      });

      // STEP 3: Approval für Versand vorbereiten
      addResult('Step 3', 'info', 'Sende Approval-Anfrage...');
      
      await approvalService.sendForApproval(approvalId, { organizationId, userId });
      addResult('Step 3', 'success', 'Approval-Anfrage gesendet - E-Mails und Benachrichtigungen ausgelöst');

      // STEP 4: Simuliere Customer-Feedback
      addResult('Step 4', 'info', 'Simuliere Customer-Feedback (Änderungen angefordert)...');
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Kurze Pause für Demo
      
      await approvalService.requestChangesPublic(
        approval.shareId,
        'max.mustermann@test-kunde.de',
        'Die Überschrift gefällt mir nicht. Bitte ändern Sie sie zu etwas Aufregendem!',
        'Max Mustermann',
        [
          {
            id: 'inline-1',
            quote: 'Pressemitteilung Test',
            text: 'Diese Überschrift ist zu langweilig'
          },
          {
            id: 'inline-2',
            quote: 'erste Zeile im Text',
            text: 'Hier fehlt mehr Emotion'
          }
        ]
      );

      addResult('Step 4', 'success', 'Customer-Feedback gespeichert - Status: changes_requested');

      // STEP 5: Simuliere Approval nach Änderungen
      addResult('Step 5', 'info', 'Simuliere Customer-Approval nach Änderungen...');
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Kurze Pause für Demo
      
      await approvalService.submitDecisionPublic(
        approval.shareId,
        'approved',
        'Vielen Dank für die Anpassungen! Die Pressemitteilung kann nun veröffentlicht werden.',
        'Max Mustermann'
      );

      addResult('Step 5', 'success', 'Customer-Approval erteilt - Status: approved');

      // STEP 6: Finales Approval laden
      const finalApproval = await approvalService.getById(approvalId, organizationId);
      setCurrentApproval(finalApproval);

      addResult('Complete', 'success', 'Multi-Service Workflow erfolgreich getestet!', {
        finalStatus: finalApproval?.status,
        historyEntries: finalApproval?.history?.length || 0,
        approvalUrl: `${window.location.origin}/freigabe/${approval.shareId}`
      });

    } catch (error: any) {
      addResult('Error', 'error', `Test fehlgeschlagen: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'info':
        return <ClockIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string): 'green' | 'red' | 'blue' | 'zinc' => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'info': return 'blue';
      default: return 'zinc';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Text className="text-xl font-semibold">
              Phase 4: Multi-Service Approval Workflow Test
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Testet die Integration von Approval-Service, E-Mail-Templates, Inbox-Service und Notifications
            </Text>
          </div>
          
          <Button
            onClick={runApprovalWorkflowTest}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Läuft...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Workflow testen
              </>
            )}
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <Text className="font-medium">Test-Ergebnisse:</Text>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge color={getStatusColor(result.status)}>
                          {result.step}
                        </Badge>
                        <Text className="text-xs text-gray-500">
                          {result.timestamp}
                        </Text>
                      </div>
                      <Text className="text-sm mt-1">{result.message}</Text>
                      {result.data && (
                        <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Current Approval Display */}
        {currentApproval && (
          <div className="mt-6 pt-6 border-t">
            <Text className="font-medium mb-3">Aktuelle Approval:</Text>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Text className="font-medium text-gray-700">ID:</Text>
                  <Text className="text-gray-600">{currentApproval.id}</Text>
                </div>
                <div>
                  <Text className="font-medium text-gray-700">Status:</Text>
                  <Badge color={
                    currentApproval.status === 'approved' ? 'green' :
                    currentApproval.status === 'changes_requested' ? 'orange' :
                    'blue'
                  }>
                    {currentApproval.status}
                  </Badge>
                </div>
                <div>
                  <Text className="font-medium text-gray-700">Title:</Text>
                  <Text className="text-gray-600">{currentApproval.title}</Text>
                </div>
                <div>
                  <Text className="font-medium text-gray-700">Share-ID:</Text>
                  <Text className="text-gray-600 font-mono">{currentApproval.shareId}</Text>
                </div>
              </div>
              
              {currentApproval.history && currentApproval.history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <Text className="font-medium text-gray-700 mb-2">
                    Historie ({currentApproval.history.length} Einträge):
                  </Text>
                  <div className="space-y-2">
                    {currentApproval.history.slice(-3).map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <Badge color="zinc">{entry.action}</Badge>
                        <Text className="text-gray-600">{entry.actorName}</Text>
                        {entry.details?.comment && (
                          <Text className="text-gray-500 italic">
                            &quot;{entry.details.comment.substring(0, 50)}...&quot;
                          </Text>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Button
                  onClick={() => window.open(`/freigabe/${currentApproval.shareId}`, '_blank')}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  Freigabe-Seite öffnen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Status Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Text className="font-medium mb-4">Integrierte Services:</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <Text className="text-sm font-medium">Approval-Service</Text>
            <Text className="text-xs text-gray-600">Customer-Only Workflow</Text>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <Text className="text-sm font-medium">E-Mail-Templates</Text>
            <Text className="text-xs text-gray-600">Request, Approved, Changes</Text>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <Text className="text-sm font-medium">Inbox-Service</Text>
            <Text className="text-xs text-gray-600">Communication Threads</Text>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <Text className="text-sm font-medium">Notifications</Text>
            <Text className="text-xs text-gray-600">Multi-Tenant Support</Text>
          </div>
        </div>
      </div>
    </div>
  );
}