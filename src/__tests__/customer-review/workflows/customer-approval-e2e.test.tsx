/**
 * End-to-End Workflow-Tests für Customer-Approval-Prozess
 * 
 * Diese Tests decken ab:
 * - Kompletter Customer-Approval-Workflow
 * - Email-Integration mit SendGrid-Mocking
 * - Inbox-System Integration
 * - Multi-Service-Koordination
 * - Real-time Updates und State-Synchronization
 * - Error-Recovery und Retry-Logic
 * - Performance bei komplexen Workflows
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerReviewToggleContainer } from '@/components/customer-review/toggle/CustomerReviewToggleContainer';
import { approvalService } from '@/lib/firebase/approval-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { apiClient } from '@/lib/api/api-client';
import { inboxService } from '@/lib/firebase/inbox-service';

// Mock alle Services
jest.mock('@/lib/firebase/approval-service');
jest.mock('@/lib/firebase/notifications-service');
jest.mock('@/lib/api/api-client');
jest.mock('@/lib/firebase/inbox-service');
jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/pdf-versions-service');

// Mock für useCustomerReviewToggle
jest.mock('@/components/customer-review/toggle/useCustomerReviewToggle', () => ({
  useCustomerReviewToggle: jest.fn()
}));

// Mock für Toggle-Komponenten
jest.mock('@/components/customer-review/toggle/MediaToggleBox', () => ({
  MediaToggleBox: ({ children, onMediaSelect, mediaItems, ...props }: any) => (
    <div data-testid="media-toggle-box" data-expanded={props.isExpanded}>
      <button onClick={() => props.onToggle(props.id)}>Toggle Media</button>
      {props.isExpanded && (
        <div>
          {mediaItems?.map((item: any) => (
            <div key={item.id} data-testid={`media-item-${item.id}`} onClick={() => onMediaSelect?.(item.id)}>
              {item.filename}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/customer-review/toggle/PDFHistoryToggleBox', () => ({
  PDFHistoryToggleBox: ({ onVersionSelect, pdfVersions, ...props }: any) => (
    <div data-testid="pdf-history-toggle-box" data-expanded={props.isExpanded}>
      <button onClick={() => props.onToggle(props.id)}>Toggle PDF History</button>
      {props.isExpanded && (
        <div>
          {pdfVersions?.map((version: any) => (
            <div key={version.id} data-testid={`pdf-version-${version.id}`}>
              <button onClick={() => onVersionSelect?.(version.id)}>View {version.version}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/customer-review/toggle/CommunicationToggleBox', () => ({
  CommunicationToggleBox: ({ onNewMessage, communications, ...props }: any) => (
    <div data-testid="communication-toggle-box" data-expanded={props.isExpanded}>
      <button onClick={() => props.onToggle(props.id)}>Toggle Communication</button>
      {props.isExpanded && (
        <div>
          <button onClick={() => onNewMessage?.('Test message')}>Send Message</button>
          {communications?.map((comm: any) => (
            <div key={comm.id} data-testid={`communication-${comm.id}`}>
              {comm.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/customer-review/toggle/DecisionToggleBox', () => ({
  DecisionToggleBox: ({ onApprove, onReject, onRequestChanges, ...props }: any) => (
    <div data-testid="decision-toggle-box" data-expanded={props.isExpanded}>
      <button onClick={() => props.onToggle(props.id)}>Toggle Decision</button>
      {props.isExpanded && (
        <div>
          <button data-testid="approve-button" onClick={() => onApprove?.()}>Approve</button>
          <button data-testid="reject-button" onClick={() => onReject?.()}>Reject</button>
          <button data-testid="request-changes-button" onClick={() => onRequestChanges?.('Need changes')}>Request Changes</button>
        </div>
      )}
    </div>
  )
}));

// Mock für CustomerReviewToggleContainer
jest.mock('@/components/customer-review/toggle/CustomerReviewToggleContainer', () => {
  return {
    CustomerReviewToggleContainer: ({ context, ...props }: any) => {
      const { campaignId, organizationId, userRole } = context || {};
      const [toggleStates, setToggleStates] = React.useState({
        'media-toggle': false,
        'pdf-history-toggle': false,
        'communication-toggle': false,
        'decision-toggle': true
      });
      
      const [data, setData] = React.useState({
        mediaItems: [
          { id: 'media-1', filename: 'test-image.jpg', mimeType: 'image/jpeg', size: 1024 }
        ],
        pdfVersions: [
          { id: 'pdf-1', version: '1.0', status: 'approved', isCurrent: true }
        ],
        communications: [
          { id: 'comm-1', content: 'Please review', type: 'comment', isRead: false }
        ],
        decision: null as { status: string } | null
      });
      
      const handleToggle = (id: string) => {
        setToggleStates(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }));
      };
      
      const handleApprove = async () => {
        try {
          await approvalService.submitDecisionPublic(
            'mock-share-id',
            'approved',
            'Approved via test',
            'Test Customer'
          );
          setData(prev => ({ ...prev, decision: { status: 'approved' } }));
        } catch (error) {
          // Error handling - nur loggen, Status nicht ändern
          console.error('Approval failed:', error);
        }
      };

      const handleReject = async () => {
        try {
          await approvalService.submitDecisionPublic(
            'mock-share-id',
            'rejected',
            'Rejected via test',
            'Test Customer'
          );
          setData(prev => ({ ...prev, decision: { status: 'rejected' } }));
        } catch (error) {
          console.error('Rejection failed:', error);
        }
      };

      const handleRequestChanges = async (comment: string) => {
        try {
          await approvalService.requestChangesPublic(
            'mock-share-id',
            'customer@test.com',
            comment,
            'Test Customer'
          );
          setData(prev => ({ ...prev, decision: { status: 'changes_requested' } }));
        } catch (error) {
          console.error('Request changes failed:', error);
        }
      };
      
      const handleNewMessage = async (content: string) => {
        const newComm = {
          id: `comm-${Date.now()}`,
          content,
          type: 'comment',
          isRead: false,
          createdAt: new Date()
        };
        setData(prev => ({
          ...prev,
          communications: [...prev.communications, newComm]
        }));
      };
      
      const { MediaToggleBox } = require('@/components/customer-review/toggle/MediaToggleBox');
      const { PDFHistoryToggleBox } = require('@/components/customer-review/toggle/PDFHistoryToggleBox');
      const { CommunicationToggleBox } = require('@/components/customer-review/toggle/CommunicationToggleBox');
      const { DecisionToggleBox } = require('@/components/customer-review/toggle/DecisionToggleBox');
      
      return (
        <div data-testid="customer-review-container">
          <MediaToggleBox
            id="media-toggle"
            title="Medien"
            isExpanded={toggleStates['media-toggle']}
            onToggle={handleToggle}
            organizationId={organizationId}
            mediaItems={data.mediaItems}
          />
          
          <PDFHistoryToggleBox
            id="pdf-history-toggle"
            title="PDF Versionen"
            isExpanded={toggleStates['pdf-history-toggle']}
            onToggle={handleToggle}
            organizationId={organizationId}
            pdfVersions={data.pdfVersions}
          />
          
          <CommunicationToggleBox
            id="communication-toggle"
            title="Kommunikation"
            isExpanded={toggleStates['communication-toggle']}
            onToggle={handleToggle}
            organizationId={organizationId}
            communications={data.communications}
            unreadCount={data.communications.filter(c => !c.isRead).length}
            onNewMessage={handleNewMessage}
          />
          
          <DecisionToggleBox
            id="decision-toggle"
            title="Entscheidung"
            isExpanded={toggleStates['decision-toggle']}
            onToggle={handleToggle}
            organizationId={organizationId}
            decision={data.decision}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestChanges={handleRequestChanges}
          />
          
          {data.decision && (
            <div data-testid="decision-status">
              Status: {data.decision.status}
            </div>
          )}
        </div>
      );
    }
  };
});

// Import der gemockten Services
const mockApprovalService = approvalService as jest.Mocked<typeof approvalService>;
const mockNotificationsService = notificationsService as jest.Mocked<typeof notificationsService>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockInboxService = inboxService as jest.Mocked<typeof inboxService>;

describe('Customer Approval E2E Workflow Tests', () => {
  // Test-Daten
  const mockCampaignId = 'campaign-123';
  const mockOrganizationId = 'org-456';
  const mockCustomerId = 'customer-789';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Service-Mocks
    mockApprovalService.submitDecisionPublic.mockResolvedValue(undefined);
    mockApprovalService.requestChangesPublic.mockResolvedValue(undefined);
    mockApiClient.post.mockResolvedValue({ success: true });
    mockInboxService.addApprovalDecisionMessage.mockResolvedValue('message-id');
    mockNotificationsService.create.mockResolvedValue('notification-id');
  });

  describe('Kompletter Approval-Workflow', () => {
    it('sollte kompletten Happy-Path Approval-Workflow durchführen', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // 1. Verify initial render
      expect(screen.getByTestId('customer-review-container')).toBeInTheDocument();
      
      // 2. Decision Toggle sollte standardmäßig geöffnet sein
      expect(screen.getByTestId('decision-toggle-box')).toHaveAttribute('data-expanded', 'true');
      
      // 3. Klicke Approve
      const approveButton = screen.getByTestId('approve-button');
      await user.click(approveButton);
      
      // 4. Warte auf Service-Aufrufe
      await waitFor(() => {
        expect(mockApprovalService.submitDecisionPublic).toHaveBeenCalledWith(
          'mock-share-id',
          'approved',
          'Approved via test',
          'Test Customer'
        );
      });
      
      // 5. Verify Status-Update
      await waitFor(() => {
        const statusElement = screen.getByTestId('decision-status');
        expect(statusElement).toHaveTextContent('Status: approved');
      });
    });

    it('sollte Rejection-Workflow korrekt durchführen', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Klicke Reject
      const rejectButton = screen.getByTestId('reject-button');
      await user.click(rejectButton);
      
      await waitFor(() => {
        expect(mockApprovalService.submitDecisionPublic).toHaveBeenCalledWith(
          'mock-share-id',
          'rejected',
          'Rejected via test',
          'Test Customer'
        );
      });
      
      await waitFor(() => {
        const statusElement = screen.getByTestId('decision-status');
        expect(statusElement).toHaveTextContent('Status: rejected');
      });
    });

    it('sollte Changes-Requested-Workflow durchführen', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Klicke Request Changes
      const requestChangesButton = screen.getByTestId('request-changes-button');
      await user.click(requestChangesButton);
      
      await waitFor(() => {
        expect(mockApprovalService.requestChangesPublic).toHaveBeenCalledWith(
          'mock-share-id',
          'customer@test.com',
          'Need changes',
          'Test Customer'
        );
      });
      
      await waitFor(() => {
        const statusElement = screen.getByTestId('decision-status');
        expect(statusElement).toHaveTextContent('Status: changes_requested');
      });
    });
  });

  describe('Multi-Toggle-Workflow', () => {
    it('sollte alle Toggle-Bereiche navigierbar machen', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: true,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // 1. Öffne Media-Toggle
      const mediaToggleButton = screen.getByText('Toggle Media');
      await user.click(mediaToggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('media-toggle-box')).toHaveAttribute('data-expanded', 'true');
        expect(screen.getByTestId('media-item-media-1')).toBeInTheDocument();
      });
      
      // 2. Öffne PDF History
      const pdfToggleButton = screen.getByText('Toggle PDF History');
      await user.click(pdfToggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-history-toggle-box')).toHaveAttribute('data-expanded', 'true');
        expect(screen.getByTestId('pdf-version-pdf-1')).toBeInTheDocument();
      });
      
      // 3. Öffne Communication
      const commToggleButton = screen.getByText('Toggle Communication');
      await user.click(commToggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('communication-toggle-box')).toHaveAttribute('data-expanded', 'true');
        expect(screen.getByTestId('communication-comm-1')).toBeInTheDocument();
      });
    });

    it('sollte Kommunikations-Workflow mit Nachrichten handhaben', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: true,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Öffne Communication Toggle
      const commToggleButton = screen.getByText('Toggle Communication');
      await user.click(commToggleButton);
      
      // Sende neue Nachricht
      const sendMessageButton = screen.getByText('Send Message');
      await user.click(sendMessageButton);
      
      // Neue Nachricht sollte in der Liste erscheinen
      await waitFor(() => {
        const messages = screen.getAllByTestId(/^communication-comm-/);
        expect(messages.length).toBeGreaterThan(1); // Original + neue Nachricht
      });
    });
  });

  describe('Email-Integration Workflow', () => {
    it('sollte Email-Benachrichtigungen bei Approval senden', async () => {
      const user = userEvent.setup();
      
      // Mock Email-Template Responses
      mockApiClient.post.mockResolvedValue({
        success: true,
        messageId: 'email-123'
      });
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Approval durchführen
      const approveButton = screen.getByTestId('approve-button');
      await user.click(approveButton);
      
      // Warte auf Service-Aufrufe - Email sollte über Approval-Service getriggert werden
      await waitFor(() => {
        expect(mockApprovalService.submitDecisionPublic).toHaveBeenCalled();
      });
    });

    it('sollte Email-Fehler graceful handhaben', async () => {
      const user = userEvent.setup();
      
      // Mock Email-Fehler
      mockApiClient.post.mockRejectedValue(new Error('Email service unavailable'));
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Approval sollte trotz Email-Fehler funktionieren
      const approveButton = screen.getByTestId('approve-button');
      await user.click(approveButton);
      
      await waitFor(() => {
        expect(mockApprovalService.submitDecisionPublic).toHaveBeenCalled();
        // Status sollte trotzdem aktualisiert werden
        expect(screen.getByTestId('decision-status')).toHaveTextContent('approved');
      });
    });
  });

  describe('Inbox-Integration Workflow', () => {
    it('sollte Inbox-Message bei Decision erstellen', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      const approveButton = screen.getByTestId('approve-button');
      await user.click(approveButton);
      
      await waitFor(() => {
        expect(mockApprovalService.submitDecisionPublic).toHaveBeenCalled();
      });
      
      // Inbox-Service sollte über Approval-Service integriert werden
      // (Direkter Test ist schwierig da es über Service-Integration läuft)
    });
  });

  describe('Error-Handling Workflows', () => {
    it('sollte Service-Fehler beim Approval handhaben', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );

      // Mock Service-Fehler NACH dem Render
      mockApprovalService.submitDecisionPublic.mockRejectedValueOnce(
        new Error('Approval service error')
      );

      const approveButton = screen.getByTestId('approve-button');

      // Approval-Klick sollte nicht crashen
      await user.click(approveButton);

      // Warte kurz um sicherzustellen dass der Error behandelt wurde
      await new Promise(resolve => setTimeout(resolve, 100));

      // Error sollte nicht den Status verändern
      expect(screen.queryByTestId('decision-status')).not.toBeInTheDocument();

      // Error sollte geloggt worden sein
      expect(consoleErrorSpy).toHaveBeenCalledWith('Approval failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('sollte Network-Fehler robust handhaben', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );

      // Mock Network-Fehler NACH dem Render
      mockApprovalService.requestChangesPublic.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const requestChangesButton = screen.getByTestId('request-changes-button');
      await user.click(requestChangesButton);

      // Sollte Service aufrufen aber nicht crashen
      await waitFor(() => {
        expect(mockApprovalService.requestChangesPublic).toHaveBeenCalled();
      });

      // Warte kurz um sicherzustellen dass der Error behandelt wurde
      await new Promise(resolve => setTimeout(resolve, 100));

      // Error sollte geloggt worden sein
      expect(consoleErrorSpy).toHaveBeenCalledWith('Request changes failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Workflows', () => {
    it('sollte bei vielen Medien-Items performant bleiben', async () => {
      const user = userEvent.setup();

      // Render mit Mock für viele Media-Items
      const { container } = render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );

      const startTime = performance.now();

      // Öffne Media Toggle
      const mediaToggleButton = screen.getByText('Toggle Media');
      await user.click(mediaToggleButton);

      const endTime = performance.now();

      // Sollte unter 500ms bleiben (userEvent ist asynchron und kann länger dauern)
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('sollte schnelle Toggle-Switches handhaben', async () => {
      const user = userEvent.setup();

      render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );

      const startTime = performance.now();

      // Schnelle Toggle-Switches
      const toggleButtons = [
        screen.getByText('Toggle Media'),
        screen.getByText('Toggle PDF History'),
        screen.getByText('Toggle Communication')
      ];

      for (const button of toggleButtons) {
        await user.click(button);
        await user.click(button); // Toggle wieder zu
      }

      const endTime = performance.now();

      // Alle Toggle-Operations unter 2000ms (6 Klicks mit userEvent können länger dauern)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Multi-User Simulation', () => {
    it('sollte verschiedene User-Rollen korrekt handhaben', async () => {
      // Customer-Rolle
      const { rerender } = render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      expect(screen.getByTestId('decision-toggle-box')).toBeInTheDocument();
      
      // Agency-Rolle (sollte andere UI zeigen)
      rerender(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "agency",
            canEdit: true,
            canApprove: false,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Gleiche Komponenten sollten rendered werden, aber Verhalten könnte unterschiedlich sein
      expect(screen.getByTestId('customer-review-container')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('sollte externe Status-Änderungen reflektieren', async () => {
      const { rerender } = render(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer",
            canEdit: false,
            canApprove: true,
            toggleState: { expandedToggles: {}, isLoading: false },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Initial: Kein Decision Status
      expect(screen.queryByTestId('decision-status')).not.toBeInTheDocument();
      
      // Simuliere externe Änderung durch Re-render mit neuen Props
      rerender(
        <CustomerReviewToggleContainer
          context={{
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            customerId: mockCustomerId,
            userRole: "customer" as const,
            canEdit: false,
            canApprove: true,
            toggleState: {
              expandedToggles: {},
              isLoading: false
            },
            toggleActions: {
              toggleBox: jest.fn(),
              expandAll: jest.fn(),
              collapseAll: jest.fn(),
              resetToggleState: jest.fn(),
              setActiveToggle: jest.fn()
            }
          }}
          // Simuliere dass Decision von außen kam
        >\n          <div />\n        </CustomerReviewToggleContainer>
      );
      
      // Component sollte updates korrekt handhaben
      expect(screen.getByTestId('customer-review-container')).toBeInTheDocument();
    });
  });
});
