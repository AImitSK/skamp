// src/__tests__/components/email/Step3Preview-pipeline.test.tsx
// Tests für Step3Preview automatische Stage-Transitions (Plan 4/9)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step3Preview from '@/components/pr/email/Step3Preview';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation } from '@/types/email-composer';
import { Timestamp } from 'firebase/firestore';

// Mock Dependencies
const mockProjectService = {
  updateStage: jest.fn()
};

const mockEmailCampaignService = {
  sendPRCampaign: jest.fn()
};

const mockEmailService = {
  sendTestEmail: jest.fn(),
  scheduleEmail: jest.fn(),
  generatePreview: jest.fn(() => ({
    html: '<p>Test Preview</p>',
    text: 'Test Preview',
    subject: 'Test Subject',
    recipient: { email: 'test@example.com', name: 'Test User' }
  }))
};

const mockEmailComposerService = {
  mergeEmailFields: jest.fn(() => ({
    subject: 'Test Subject',
    greeting: 'Sehr geehrter {{firstName}} {{lastName}},',
    introduction: 'Test introduction',
    pressReleaseHtml: '<p>Press release content</p>',
    closing: 'Mit freundlichen Grüßen',
    signature: '{{senderName}}\n{{senderTitle}}'
  }))
};

const mockEmailLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: mockProjectService
}));

jest.mock('@/lib/firebase/email-campaign-service', () => ({
  emailCampaignService: mockEmailCampaignService
}));

jest.mock('@/lib/email/email-service', () => ({
  emailService: mockEmailService
}));

jest.mock('@/lib/email/email-composer-service', () => ({
  emailComposerService: mockEmailComposerService
}));

jest.mock('@/utils/emailLogger', () => ({
  emailLogger: mockEmailLogger
}));

jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 }))
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

const mockOnSchedulingChange = jest.fn();
const mockOnSent = jest.fn();
const mockOnPipelineComplete = jest.fn();

describe('Step3Preview Pipeline Stage-Transitions Tests', () => {
  const baseCampaign: PRCampaign = {
    id: 'test-campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    title: 'Test Pipeline Campaign',
    contentHtml: '<p>Test campaign content</p>',
    status: 'draft',
    distributionListId: 'pipeline-list',
    distributionListName: 'Pipeline List',
    recipientCount: 100,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    projectId: 'project-789',
    projectTitle: 'Test Pipeline Project',
    pipelineStage: 'distribution'
  };

  const baseDraft: EmailDraft = {
    campaignId: 'test-campaign-123',
    campaignTitle: 'Test Pipeline Campaign',
    content: {
      body: '<p>Test email content</p>',
      sections: {
        greeting: 'Sehr geehrter {{firstName}} {{lastName}},',
        introduction: 'Test introduction',
        closing: 'Mit freundlichen Grüßen'
      }
    },
    recipients: {
      listIds: ['pipeline-list'],
      listNames: ['Pipeline List'],
      manual: [],
      totalCount: 100,
      validCount: 100
    },
    sender: {
      type: 'manual',
      manual: {
        name: 'Test Sender',
        email: 'sender@test.com',
        title: 'Marketing Manager',
        company: 'Test Company',
        phone: '+49 123 456789'
      }
    },
    metadata: {
      subject: 'Pipeline Test Subject',
      preheader: 'Pipeline test preheader'
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const baseValidation: StepValidation['step3'] = {
    isValid: true,
    errors: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailCampaignService.sendPRCampaign.mockResolvedValue({ success: 85, failed: 15 });
    mockProjectService.updateStage.mockResolvedValue({ success: true });
  });

  describe('Pipeline-Mode Erkennung', () => {
    it('sollte Pipeline-Mode korrekt erkennen und anzeigen', () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Pipeline-spezifische UI-Elemente sollten nicht in Step3Preview sein
      // (diese sind in EmailComposer), aber der Component sollte ohne Fehler rendern
      expect(screen.getByText(/Vorschau & Versand/)).toBeInTheDocument();
    });

    it('sollte ohne Pipeline-Mode normal funktionieren', () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={false}
          autoTransitionAfterSend={false}
        />
      );

      expect(screen.getByText(/Vorschau & Versand/)).toBeInTheDocument();
    });
  });

  describe('Automatische Stage-Transition Tests', () => {
    it('sollte nach erfolgreichem Versand automatisch zur Monitoring-Phase wechseln', async () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Klick auf "Jetzt senden" Button
      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      // Bestätigungs-Dialog sollte erscheinen
      await waitFor(() => {
        expect(screen.getByText(/E-Mail jetzt versenden?/)).toBeInTheDocument();
      });

      // Bestätigen
      const confirmButton = screen.getByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Warte auf Versand und Stage-Transition
      await waitFor(() => {
        expect(mockEmailCampaignService.sendPRCampaign).toHaveBeenCalledWith(
          baseCampaign,
          expect.any(Object),
          expect.any(Object),
          expect.any(Array)
        );
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(mockProjectService.updateStage).toHaveBeenCalledWith(
          'project-789',
          'monitoring',
          expect.objectContaining({
            transitionReason: 'distribution_completed',
            transitionBy: 'user',
            transitionAt: expect.any(Object),
            distributionData: expect.objectContaining({
              recipientCount: 85,
              distributionId: expect.stringMatching(/^dist_/)
            })
          }),
          { organizationId: 'test-org-456', userId: 'user' }
        );
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(mockOnPipelineComplete).toHaveBeenCalledWith('test-campaign-123');
      }, { timeout: 5000 });
    });

    it('sollte onPipelineComplete mit korrekter Campaign-ID aufrufen', async () => {
      const campaignWithSpecialId: PRCampaign = {
        ...baseCampaign,
        id: 'special-campaign-456'
      };

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={campaignWithSpecialId}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Versand durchführen
      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Jetzt senden/ });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnPipelineComplete).toHaveBeenCalledWith('special-campaign-456');
      }, { timeout: 5000 });
    });

    it('sollte korrekte distributionData an projektService übergeben', async () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Versand durchführen
      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockProjectService.updateStage).toHaveBeenCalledWith(
          'project-789',
          'monitoring',
          expect.objectContaining({
            transitionReason: 'distribution_completed',
            transitionBy: 'user',
            distributionData: expect.objectContaining({
              recipientCount: 85, // Mock success count
              distributionId: expect.stringMatching(/^dist_\d+$/)
            })
          }),
          { organizationId: 'test-org-456', userId: 'user' }
        );
      }, { timeout: 5000 });
    });

    it('sollte Success-Message für Pipeline-Transition anzeigen', async () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Versand durchführen
      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Erwarte Pipeline-spezifische Success-Message
      await waitFor(() => {
        expect(screen.getByText(/Projekt wurde zur Monitoring-Phase weitergeleitet/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Distribution-Status Update Tests', () => {
    it('sollte Campaign-Status auf "sending" setzen vor Versand', async () => {
      const { updateDoc } = require('firebase/firestore');

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Erster updateDoc Call sollte Status auf "sending" setzen
      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            status: 'sending'
          })
        );
      });
    });

    it('sollte Campaign-Status auf "sent" setzen nach erfolgreichem Versand', async () => {
      const { updateDoc } = require('firebase/firestore');

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Zweiter updateDoc Call sollte Status auf "sent" setzen mit distributionStatus
      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            status: 'sent',
            sentAt: expect.any(Object),
            actualRecipientCount: 85,
            distributionStatus: expect.objectContaining({
              status: 'sent',
              sentAt: expect.any(Object),
              recipientCount: 100,
              successCount: 85,
              failureCount: 15,
              distributionId: expect.stringMatching(/^dist_/)
            })
          })
        );
      }, { timeout: 5000 });
    });

    it('sollte distributionStatus korrekt berechnen', async () => {
      const { updateDoc } = require('firebase/firestore');
      
      // Mock verschiedene Success/Failure Raten
      mockEmailCampaignService.sendPRCampaign.mockResolvedValueOnce({ success: 95, failed: 5 });

      render(
        <Step3Preview
          draft={{
            ...baseDraft,
            recipients: {
              ...baseDraft.recipients,
              totalCount: 100
            }
          }}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            distributionStatus: expect.objectContaining({
              recipientCount: 100,
              successCount: 95,
              failureCount: 5
            })
          })
        );
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling Pipeline Tests', () => {
    it('sollte Pipeline-Fehler graceful behandeln ohne E-Mail-Versand zu beeinträchtigen', async () => {
      // Mock Pipeline-Fehler
      mockProjectService.updateStage.mockRejectedValueOnce(new Error('Pipeline update failed'));

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // E-Mail sollte trotzdem gesendet werden
      await waitFor(() => {
        expect(mockEmailCampaignService.sendPRCampaign).toHaveBeenCalled();
      });

      // Success-Message sollte trotzdem erscheinen
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich an \d+ Empfänger gesendet/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Pipeline-Error sollte geloggt werden
      expect(mockEmailLogger.error).toHaveBeenCalledWith(
        'Pipeline auto-transition failed',
        expect.objectContaining({
          campaignId: baseCampaign.id,
          projectId: baseCampaign.projectId,
          error: expect.any(Error)
        })
      );
    });

    it('sollte E-Mail-Versand-Fehler korrekt behandeln ohne Pipeline-Transition', async () => {
      // Mock E-Mail-Versand-Fehler
      mockEmailCampaignService.sendPRCampaign.mockRejectedValueOnce(new Error('Email send failed'));

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Error-Message sollte erscheinen
      await waitFor(() => {
        expect(screen.getByText(/Versand fehlgeschlagen/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Pipeline-Transition sollte nicht aufgerufen werden
      expect(mockProjectService.updateStage).not.toHaveBeenCalled();
      expect(mockOnPipelineComplete).not.toHaveBeenCalled();
    });

    it('sollte Status zurücksetzen bei E-Mail-Versand-Fehler', async () => {
      const { updateDoc } = require('firebase/firestore');
      mockEmailCampaignService.sendPRCampaign.mockRejectedValueOnce(new Error('Send failed'));

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Status sollte zurück auf "draft" gesetzt werden
      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            status: 'draft'
          })
        );
      }, { timeout: 5000 });
    });
  });

  describe('Pipeline ohne Auto-Transition Tests', () => {
    it('sollte Pipeline-Mode ohne Auto-Transition korrekt behandeln', async () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={false}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // E-Mail sollte gesendet werden
      await waitFor(() => {
        expect(mockEmailCampaignService.sendPRCampaign).toHaveBeenCalled();
      });

      // Aber keine Pipeline-Transition
      expect(mockProjectService.updateStage).not.toHaveBeenCalled();
      expect(mockOnPipelineComplete).not.toHaveBeenCalled();

      // Standard Success-Message (ohne Pipeline-Mention)
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich an \d+ Empfänger gesendet!/)).toBeInTheDocument();
        expect(screen.queryByText(/Monitoring-Phase weitergeleitet/)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Multi-Tenancy Pipeline Tests', () => {
    it('sollte organizationId korrekt an projektService übergeben', async () => {
      const multiTenantCampaign: PRCampaign = {
        ...baseCampaign,
        organizationId: 'multi-tenant-org-789'
      };

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={multiTenantCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockProjectService.updateStage).toHaveBeenCalledWith(
          'project-789',
          'monitoring',
          expect.any(Object),
          { organizationId: 'multi-tenant-org-789', userId: 'user' }
        );
      }, { timeout: 5000 });
    });

    it('sollte ohne organizationId funktionieren', async () => {
      const campaignWithoutOrg: PRCampaign = {
        ...baseCampaign,
        organizationId: undefined
      };

      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={undefined}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={campaignWithoutOrg}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Jetzt an \d+ Empfänger senden/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Jetzt senden/ });
      fireEvent.click(confirmButton);

      // Sollte mit undefined organizationId funktionieren
      await waitFor(() => {
        expect(mockProjectService.updateStage).toHaveBeenCalledWith(
          'project-789',
          'monitoring',
          expect.any(Object),
          { organizationId: undefined, userId: 'user' }
        );
      }, { timeout: 5000 });
    });
  });

  describe('Scheduled Send Pipeline Tests', () => {
    it('sollte geplanten Versand ohne Pipeline-Transition durchführen', async () => {
      render(
        <Step3Preview
          draft={baseDraft}
          scheduling={{
            sendAt: new Date('2025-02-15T10:00:00Z'),
            timezone: 'Europe/Berlin'
          }}
          onSchedulingChange={mockOnSchedulingChange}
          validation={baseValidation}
          campaign={baseCampaign}
          onSent={mockOnSent}
          pipelineMode={true}
          autoTransitionAfterSend={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      // Wechsel zu "Versand planen"
      const scheduleRadio = screen.getByLabelText('Versand planen');
      fireEvent.click(scheduleRadio);

      const sendButton = screen.getByRole('button', { name: /Versand planen/ });
      fireEvent.click(sendButton);

      const confirmButton = await screen.findByRole('button', { name: /Versand planen/ });
      fireEvent.click(confirmButton);

      // Geplanter Versand sollte keine sofortige Pipeline-Transition auslösen
      expect(mockProjectService.updateStage).not.toHaveBeenCalled();
      expect(mockOnPipelineComplete).not.toHaveBeenCalled();
    });
  });
});