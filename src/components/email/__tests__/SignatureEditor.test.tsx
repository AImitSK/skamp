// src/components/email/__tests__/SignatureEditor.test.tsx
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SignatureEditor } from '../SignatureEditor';
import { EmailSignature } from '@/types/email-enhanced';
import { Timestamp } from 'firebase/firestore';

// Mock EmailEditor Component
jest.mock('@/components/pr/email/EmailEditor', () => {
  return function MockEmailEditor({ content, onChange, placeholder, error }: any) {
    return (
      <div data-testid="email-editor">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="email-editor-textarea"
          aria-invalid={!!error}
        />
      </div>
    );
  };
});

// Mock InfoTooltip Component
jest.mock('@/components/InfoTooltip', () => ({
  InfoTooltip: ({ content }: { content: string }) => (
    <span data-testid="info-tooltip" title={content}>ℹ️</span>
  ),
}));

describe('SignatureEditor', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const mockEmailAddresses = [
    { id: 'email-1', email: 'test@example.com', displayName: 'Test User' },
    { id: 'email-2', email: 'info@example.com', displayName: 'Info' },
  ];

  const mockSignature: EmailSignature = {
    id: 'sig-1',
    name: 'Test Signatur',
    content: '<p>Mit freundlichen Grüßen</p>',
    isDefault: false,
    emailAddressIds: ['email-1'],
    variables: {
      includeUserName: true,
      includeUserTitle: false,
      includeCompanyName: true,
      includePhone: false,
      includeWebsite: false,
      includeSocialLinks: false,
    },
    organizationId: 'test-org-123',
    userId: 'test-user-123',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render Tests', () => {
    it('sollte den Dialog für neue Signatur rendern', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByText('Neue Signatur erstellen')).toBeInTheDocument();
    });

    it('sollte den Dialog für Bearbeitung rendern', () => {
      renderWithProviders(
        <SignatureEditor
          signature={mockSignature}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByText('Signatur bearbeiten')).toBeInTheDocument();
    });

    it('sollte alle Formular-Felder anzeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByText('Name der Signatur *')).toBeInTheDocument();
      expect(screen.getByText('Signatur-Inhalt')).toBeInTheDocument();
      expect(screen.getByText('Diese Signatur verwenden für')).toBeInTheDocument();
    });

    it('sollte E-Mail-Adressen zur Auswahl anzeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('info@example.com')).toBeInTheDocument();
    });

    it('sollte nichts rendern wenn Dialog geschlossen ist', () => {
      const { container } = renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      // Dialog sollte keine sichtbaren Inhalte haben wenn geschlossen
      expect(screen.queryByText('Neue Signatur erstellen')).not.toBeInTheDocument();
    });
  });

  describe('Form Data Tests', () => {
    it('sollte existierende Signatur-Daten laden', () => {
      renderWithProviders(
        <SignatureEditor
          signature={mockSignature}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur') as HTMLInputElement;
      expect(nameInput.value).toBe('Test Signatur');

      const emailCheckbox = screen.getByRole('checkbox', { name: /test@example.com/i }) as HTMLInputElement;
      expect(emailCheckbox.checked).toBe(true);
    });

    it('sollte leeres Formular für neue Signatur zeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });

  describe('Interaction Tests', () => {
    it('sollte Name-Eingabe ermöglichen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Neue Signatur');

      expect(nameInput).toHaveValue('Neue Signatur');
    });

    it('sollte Content-Eingabe ermöglichen', async () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test Content</p>' } });

      expect(contentTextarea).toHaveValue('<p>Test Content</p>');
    });

    it('sollte E-Mail-Adresse aus-/abwählen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /test@example.com/i });

      // Auswählen
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      // Abwählen
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('sollte Dialog schließen bei Abbrechen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation Tests', () => {
    it('sollte Fehler anzeigen wenn Name leer ist', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('sollte Fehler anzeigen wenn Content leer ist', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test Signatur');

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Signatur-Inhalt ist erforderlich')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('sollte beide Fehler gleichzeitig anzeigen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Signatur-Inhalt ist erforderlich')).toBeInTheDocument();
      });
    });

    it('sollte Fehler entfernen wenn Felder ausgefüllt werden', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      // Trigger Validation
      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      });

      // Fülle Felder aus
      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      // Erneut speichern
      await user.click(saveButton);

      // Fehler sollten weg sein und onSave sollte aufgerufen werden
      await waitFor(() => {
        expect(screen.queryByText('Name ist erforderlich')).not.toBeInTheDocument();
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Save Tests', () => {
    it('sollte onSave mit korrekten Daten aufrufen', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Neue Signatur');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test Content</p>' } });

      const checkbox = screen.getByRole('checkbox', { name: /test@example.com/i });
      await user.click(checkbox);

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          name: 'Neue Signatur',
          content: '<p>Test Content</p>',
          emailAddressIds: ['email-1'],
        });
      });
    });

    it('sollte Dialog schließen nach erfolgreichem Speichern', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('sollte Fehler-Nachricht bei Save-Fehler anzeigen', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Speichern. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('sollte "Speichern..." anzeigen während des Speicherns', async () => {
      const user = userEvent.setup();

      // Mock verzögerte Promise
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      // Während des Speicherns
      expect(screen.getByRole('button', { name: /speichern\.\.\./i })).toBeInTheDocument();

      // Nach dem Speichern
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Preview Tests', () => {
    it('sollte Vorschau-Button anzeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByRole('button', { name: /vorschau/i })).toBeInTheDocument();
    });

    it('sollte Vorschau-Modal öffnen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={mockSignature}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const previewButton = screen.getByRole('button', { name: /vorschau/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Signatur-Vorschau')).toBeInTheDocument();
      });
    });

    it('sollte Vorschau-Inhalt anzeigen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Vorschau Test</p>' } });

      const previewButton = screen.getByRole('button', { name: /vorschau/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('So wird Ihre Signatur in E-Mails aussehen:')).toBeInTheDocument();
      });
    });

    it('sollte Vorschau-Modal schließen', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SignatureEditor
          signature={mockSignature}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const previewButton = screen.getByRole('button', { name: /vorschau/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Signatur-Vorschau')).toBeInTheDocument();
      });

      // Es gibt zwei "Schließen"-Buttons - wir nehmen den letzten (im Vorschau-Modal)
      const closeButtons = screen.getAllByRole('button', { name: /schließen/i });
      const closeButton = closeButtons[closeButtons.length - 1];
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Signatur-Vorschau')).not.toBeInTheDocument();
      });
    });
  });

  describe('Email Address Assignment Tests', () => {
    it('sollte mehrere E-Mail-Adressen auswählen können', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const checkbox1 = screen.getByRole('checkbox', { name: /test@example.com/i });
      const checkbox2 = screen.getByRole('checkbox', { name: /info@example.com/i });

      await user.click(checkbox1);
      await user.click(checkbox2);

      expect(checkbox1).toBeChecked();
      expect(checkbox2).toBeChecked();

      // Speichern
      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            emailAddressIds: expect.arrayContaining(['email-1', 'email-2']),
          })
        );
      });
    });

    it('sollte ohne E-Mail-Adressen speichern können', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            emailAddressIds: [],
          })
        );
      });
    });

    it('sollte keine E-Mail-Adress-Sektion anzeigen wenn keine Adressen vorhanden', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={[]}
        />
      );

      expect(screen.queryByText('Diese Signatur verwenden für')).not.toBeInTheDocument();
    });
  });

  describe('Button State Tests', () => {
    it('sollte "Signatur erstellen" für neue Signatur zeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByRole('button', { name: /signatur erstellen/i })).toBeInTheDocument();
    });

    it('sollte "Speichern" für existierende Signatur zeigen', () => {
      renderWithProviders(
        <SignatureEditor
          signature={mockSignature}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      expect(screen.getByRole('button', { name: /^speichern$/i })).toBeInTheDocument();
    });

    it('sollte Buttons während des Speicherns deaktivieren', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <SignatureEditor
          signature={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          emailAddresses={mockEmailAddresses}
        />
      );

      const nameInput = screen.getByPlaceholderText('z.B. Standard Signatur');
      await user.type(nameInput, 'Test');

      const contentTextarea = screen.getByLabelText('email-editor-textarea');
      fireEvent.change(contentTextarea, { target: { value: '<p>Test</p>' } });

      const saveButton = screen.getByRole('button', { name: /signatur erstellen/i });
      await user.click(saveButton);

      // Buttons sollten disabled sein
      expect(screen.getByRole('button', { name: /speichern\.\.\./i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
