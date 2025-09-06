// src/__tests__/components/email/EmailComposer-pipeline.test.tsx
// Tests für EmailComposer Pipeline-Integration (Plan 4/9)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailComposer from '@/components/pr/email/EmailComposer';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock Dependencies
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user-123',
      email: 'test@example.com'
    }
  })
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'test-org-456',
      name: 'Test Organization'
    }
  })
}));

jest.mock('@/lib/firebase/email-campaign-service', () => ({
  emailCampaignService: {
    sendPRCampaign: jest.fn()
  }
}));

jest.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendTestEmail: jest.fn(),
    scheduleEmail: jest.fn(),
    generatePreview: jest.fn(() => ({
      html: '<p>Preview HTML</p>',
      text: 'Preview Text',
      subject: 'Preview Subject',
      recipient: {
        email: 'test@example.com',
        name: 'Test User'
      }
    }))
  }
}));

jest.mock('@/lib/email/email-composer-service', () => ({
  emailComposerService: {
    saveDraft: jest.fn(() => Promise.resolve({ success: true })),
    loadDraft: jest.fn(() => Promise.resolve(null)),
    mergeEmailFields: jest.fn(() => ({
      subject: 'Test Subject',
      greeting: 'Sehr geehrter {{firstName}} {{lastName}},',
      introduction: 'Test introduction',
      pressReleaseHtml: '<p>Press release content</p>',
      closing: 'Mit freundlichen Grüßen',
      signature: '{{senderName}}\n{{senderTitle}}'
    }))
  }
}));

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    updateStage: jest.fn(() => Promise.resolve({ success: true }))
  }
}));

jest.mock('@/utils/emailLogger', () => ({
  emailLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    draftSaved: jest.fn()
  }
}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 }))
}));

const mockOnClose = jest.fn();
const mockOnSent = jest.fn();
const mockOnPipelineComplete = jest.fn();

describe('EmailComposer Pipeline-Integration Tests', () => {
  const baseCampaign: PRCampaign = {
    id: 'test-campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    title: 'Test Campaign',
    contentHtml: '<p>Test campaign content</p>',
    status: 'draft',
    distributionListId: 'default-list',
    distributionListName: 'Default List',
    recipientCount: 10,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pipeline-Mode Aktivierung', () => {
    it('sollte Pipeline-Mode korrekt aktivieren', () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-789',
        projectTitle: 'Test Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Prüfe ob Pipeline-Banner angezeigt wird
      expect(screen.getByText(/Pipeline-Distribution für Projekt/)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText(/automatisch zur Monitoring-Phase/)).toBeInTheDocument();
    });

    it('sollte Pipeline-Banner nicht anzeigen wenn kein Pipeline-Mode', () => {
      render(
        <EmailComposer
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={false}
        />
      );

      // Prüfe dass kein Pipeline-Banner angezeigt wird
      expect(screen.queryByText(/Pipeline-Distribution/)).not.toBeInTheDocument();
    });

    it('sollte distributionConfig Pre-Population korrekt durchführen', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-789',
        projectTitle: 'Pre-Population Test Project',
        pipelineStage: 'distribution',
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['pipeline-list-1', 'pipeline-list-2'],
          manualRecipients: [
            {
              email: 'pipeline@example.com',
              firstName: 'Pipeline',
              lastName: 'User',
              companyName: 'Pipeline Corp'
            }
          ],
          senderConfig: {
            contactId: 'pipeline-contact-123',
            email: 'pipeline-sender@company.com',
            name: 'Pipeline Sender'
          },
          emailSubject: 'Pipeline Test Subject',
          emailPreheader: 'Pipeline test preheader',
          personalizedContent: true,
          variables: {
            'projectName': 'Pre-Population Test Project'
          }
        }
      };

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Warte auf Pre-Population
      await waitFor(() => {
        expect(screen.getByDisplayValue('Pipeline Test Subject')).toBeInTheDocument();
      });

      // Navigate zu Step 2 um Recipients zu prüfen
      const step2Button = screen.getByRole('button', { name: /Weiter/ });
      fireEvent.click(step2Button);

      await waitFor(() => {
        expect(screen.getByText(/pipeline@example.com/)).toBeInTheDocument();
      });
    });
  });

  describe('Pipeline-Status-Anzeige', () => {
    it('sollte distributionStatus im Banner anzeigen', () => {
      const campaignWithStatus: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-status',
        projectTitle: 'Status Test Project',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.now(),
          recipientCount: 150,
          successCount: 148,
          failureCount: 2,
          distributionId: 'dist_test_123'
        }
      };

      render(
        <EmailComposer
          campaign={campaignWithStatus}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByText('Versendet')).toBeInTheDocument();
      expect(screen.getByText(/Status Test Project/)).toBeInTheDocument();
    });

    it('sollte verschiedene Distribution-Status korrekt anzeigen', () => {
      const statusTests = [
        { status: 'pending' as const, expectedText: 'Ausstehend' },
        { status: 'sending' as const, expectedText: 'Versende...' },
        { status: 'failed' as const, expectedText: 'Fehler' }
      ];

      statusTests.forEach(({ status, expectedText }) => {
        const campaignWithStatus: PRCampaign = {
          ...baseCampaign,
          projectId: 'project-multi-status',
          projectTitle: 'Multi Status Project',
          pipelineStage: 'distribution',
          distributionStatus: {
            status,
            recipientCount: 100,
            successCount: status === 'sending' ? 100 : 0,
            failureCount: status === 'failed' ? 100 : 0,
            distributionId: `dist_${status}_123`
          }
        };

        const { unmount } = render(
          <EmailComposer
            campaign={campaignWithStatus}
            onClose={mockOnClose}
            onSent={mockOnSent}
            projectMode={true}
            onPipelineComplete={mockOnPipelineComplete}
          />
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });

    it('sollte Datum der Distribution anzeigen', () => {
      const sentDate = new Date('2025-01-15T10:30:00Z');
      const campaignWithSentDate: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-date',
        projectTitle: 'Date Test Project',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.fromDate(sentDate),
          recipientCount: 50,
          successCount: 50,
          failureCount: 0,
          distributionId: 'dist_date_test'
        }
      };

      render(
        <EmailComposer
          campaign={campaignWithSentDate}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Prüfe ob Datum angezeigt wird (Format wird durch toLocaleString bestimmt)
      expect(screen.getByText(/15\.1\.2025/)).toBeInTheDocument();
    });
  });

  describe('Pipeline-Props Weiterleitung', () => {
    it('sollte Pipeline-Props an Step3Preview weiterleiten', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-props',
        projectTitle: 'Props Test Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Navigate zu Step 3
      const step2Button = screen.getByRole('button', { name: /Weiter/ });
      fireEvent.click(step2Button);
      
      await waitFor(() => {
        const step3Button = screen.getByRole('button', { name: /Weiter/ });
        fireEvent.click(step3Button);
      });

      // Step3Preview sollte jetzt geladen sein mit Pipeline-Props
      await waitFor(() => {
        // Implicit Check: Component renders without errors with pipeline props
        expect(screen.getByText(/Vorschau & Versand/)).toBeInTheDocument();
      });
    });

    it('sollte onPipelineComplete Callback korrekt setzen', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-callback',
        projectTitle: 'Callback Test Project',
        pipelineStage: 'distribution'
      };

      const mockCallback = jest.fn();

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockCallback}
        />
      );

      // Der Callback sollte an Step3Preview weitergeleitet werden
      // Dies wird im nächsten Test (Step3Preview) genauer getestet
      expect(mockCallback).toHaveBeenCalledTimes(0); // Noch nicht aufgerufen
    });
  });

  describe('Pipeline-Mode State Management', () => {
    it('sollte pipelineDistribution State korrekt setzen', () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-state',
        projectTitle: 'State Test Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Pipeline-Banner sollte sichtbar sein (impliziert dass pipelineDistribution=true)
      expect(screen.getByText(/Pipeline-Distribution/)).toBeInTheDocument();
      expect(screen.getByText(/automatisch zur Monitoring-Phase/)).toBeInTheDocument();
    });

    it('sollte autoTransitionAfterSend korrekt aktivieren', () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-auto-transition',
        projectTitle: 'Auto Transition Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Text über automatische Weiterleitung sollte sichtbar sein
      expect(screen.getByText(/automatisch zur Monitoring-Phase weitergeleitet/)).toBeInTheDocument();
    });
  });

  describe('Distribution Config Integration', () => {
    it('sollte manuelle Recipients korrekt aus distributionConfig laden', async () => {
      const campaignWithManualRecipients: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-manual',
        projectTitle: 'Manual Recipients Project',
        pipelineStage: 'distribution',
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [
            {
              email: 'manual1@example.com',
              firstName: 'Manual',
              lastName: 'One',
              companyName: 'Company 1'
            },
            {
              email: 'manual2@example.com',
              firstName: 'Manual',
              lastName: 'Two'
            }
          ],
          senderConfig: {
            email: 'sender@test.com',
            name: 'Test Sender'
          },
          emailSubject: 'Manual Recipients Test',
          personalizedContent: false,
          variables: {}
        }
      };

      render(
        <EmailComposer
          campaign={campaignWithManualRecipients}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Navigate zu Step 2
      const step2Button = screen.getByRole('button', { name: /Weiter/ });
      fireEvent.click(step2Button);

      // Prüfe dass manuelle Recipients geladen wurden
      await waitFor(() => {
        expect(screen.getByText('manual1@example.com')).toBeInTheDocument();
        expect(screen.getByText('manual2@example.com')).toBeInTheDocument();
      });
    });

    it('sollte E-Mail-Metadaten aus distributionConfig pre-populieren', async () => {
      const campaignWithMetadata: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-metadata',
        projectTitle: 'Metadata Test Project',
        pipelineStage: 'distribution',
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'metadata@test.com',
            name: 'Metadata Sender'
          },
          emailSubject: 'Pre-populated Subject Line',
          emailPreheader: 'Pre-populated preheader text',
          personalizedContent: true,
          variables: {}
        }
      };

      render(
        <EmailComposer
          campaign={campaignWithMetadata}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Navigate zu Step 2 um Metadata zu prüfen
      const step2Button = screen.getByRole('button', { name: /Weiter/ });
      fireEvent.click(step2Button);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-populated Subject Line')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Pre-populated preheader text')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Tenancy Pipeline Tests', () => {
    it('sollte organizationId in Pipeline-Operationen berücksichtigen', async () => {
      const multiTenantCampaign: PRCampaign = {
        ...baseCampaign,
        organizationId: 'pipeline-org-789',
        projectId: 'pipeline-project-123',
        projectTitle: 'Multi-Tenant Pipeline Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={multiTenantCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Pipeline sollte mit korrekter organizationId funktionieren
      expect(screen.getByText(/Multi-Tenant Pipeline Project/)).toBeInTheDocument();
      expect(screen.getByText(/Pipeline-Distribution/)).toBeInTheDocument();
    });

    it('sollte Pipeline-Features ohne organizationId handhaben', () => {
      const campaignWithoutOrg: PRCampaign = {
        ...baseCampaign,
        organizationId: undefined,
        projectId: 'project-no-org',
        projectTitle: 'No Org Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={campaignWithoutOrg}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Sollte trotzdem funktionieren (mit Fallback auf userId)
      expect(screen.getByText(/No Org Project/)).toBeInTheDocument();
    });
  });

  describe('Error Handling Pipeline Tests', () => {
    it('sollte Pipeline-Fehler graceful behandeln', async () => {
      const campaignWithError: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-error',
        projectTitle: 'Error Test Project',
        pipelineStage: 'distribution',
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['invalid-list'],
          manualRecipients: [],
          senderConfig: {
            email: 'error@test.com',
            name: 'Error Sender'
          },
          emailSubject: 'Error Test',
          personalizedContent: false,
          variables: {}
        }
      };

      // Mock Service-Fehler
      const { emailComposerService } = require('@/lib/email/email-composer-service');
      emailComposerService.loadDraft.mockRejectedValueOnce(new Error('Load draft failed'));

      render(
        <EmailComposer
          campaign={campaignWithError}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Component sollte trotz Fehler laden
      await waitFor(() => {
        expect(screen.getByText(/E-Mail-Versand: Error Test Project/)).toBeInTheDocument();
      });
    });

    it('sollte fehlende projectId in Pipeline-Mode handhaben', () => {
      const campaignMissingProject: PRCampaign = {
        ...baseCampaign,
        // projectId fehlt
        projectTitle: 'Missing Project ID',
        pipelineStage: 'distribution'
      };

      render(
        <EmailComposer
          campaign={campaignMissingProject}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Pipeline-Banner sollte nicht angezeigt werden ohne projectId
      expect(screen.queryByText(/Pipeline-Distribution/)).not.toBeInTheDocument();
    });

    it('sollte falsche pipelineStage in Pipeline-Mode handhaben', () => {
      const campaignWrongStage: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-wrong-stage',
        projectTitle: 'Wrong Stage Project',
        pipelineStage: 'ideas_planning' // Nicht 'distribution'
      };

      render(
        <EmailComposer
          campaign={campaignWrongStage}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Pipeline-Distribution sollte nicht aktiviert werden
      expect(screen.queryByText(/Pipeline-Distribution/)).not.toBeInTheDocument();
    });
  });
});