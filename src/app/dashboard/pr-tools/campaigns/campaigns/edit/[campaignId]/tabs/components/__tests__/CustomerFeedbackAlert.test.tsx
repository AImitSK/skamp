// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/__tests__/CustomerFeedbackAlert.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerFeedbackAlert } from '../CustomerFeedbackAlert';

describe('CustomerFeedbackAlert', () => {
  describe('Rendering', () => {
    it('rendert nichts wenn feedback-Array leer ist', () => {
      const { container } = render(<CustomerFeedbackAlert feedback={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('rendert nichts wenn kein Kunden-Feedback vorhanden ist', () => {
      const feedback = [
        {
          author: 'Admin',
          comment: 'Internes Feedback',
          requestedAt: {
            toDate: () => new Date('2025-01-15T10:00:00')
          }
        }
      ];

      const { container } = render(<CustomerFeedbackAlert feedback={feedback} />);
      expect(container.firstChild).toBeNull();
    });

    it('zeigt das letzte Kunden-Feedback an', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Bitte Titel ändern',
          requestedAt: {
            toDate: () => new Date('2025-01-15T10:00:00')
          }
        },
        {
          author: 'Admin',
          comment: 'Internes Feedback',
          requestedAt: {
            toDate: () => new Date('2025-01-15T11:00:00')
          }
        },
        {
          author: 'Kunde',
          comment: 'Bitte auch Datum ändern',
          requestedAt: {
            toDate: () => new Date('2025-01-15T12:00:00')
          }
        }
      ];

      render(<CustomerFeedbackAlert feedback={feedback} />);

      expect(screen.getByText('Letzte Änderungsanforderung vom Kunden')).toBeInTheDocument();
      expect(screen.getByText('Bitte auch Datum ändern')).toBeInTheDocument();
      expect(screen.queryByText('Bitte Titel ändern')).not.toBeInTheDocument();
    });
  });

  describe('Datum-Formatierung', () => {
    it('formatiert das Datum korrekt im deutschen Format', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Test-Feedback',
          requestedAt: {
            toDate: () => new Date('2025-01-15T14:30:00')
          }
        }
      ];

      render(<CustomerFeedbackAlert feedback={feedback} />);

      // Deutsches Format: TT.MM.JJJJ, HH:MM
      expect(screen.getByText(/15\.01\.2025.*14:30/)).toBeInTheDocument();
    });

    it('zeigt kein Datum wenn requestedAt fehlt', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Test-Feedback ohne Datum'
        }
      ];

      render(<CustomerFeedbackAlert feedback={feedback} />);

      expect(screen.getByText('Test-Feedback ohne Datum')).toBeInTheDocument();
      // Prüft, dass kein Datum-Text sichtbar ist (nur der Kommentar)
      const dateElements = screen.queryByText(/\d{2}\.\d{2}\.\d{4}/);
      expect(dateElements).not.toBeInTheDocument();
    });
  });

  describe('Styling und Struktur', () => {
    it('verwendet gelbe Warnfarben für die Alert-Box', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Test-Feedback'
        }
      ];

      const { container } = render(<CustomerFeedbackAlert feedback={feedback} />);

      const alertBox = container.querySelector('.bg-yellow-50');
      expect(alertBox).toBeInTheDocument();
    });

    it('zeigt das Warning-Icon an', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Test-Feedback'
        }
      ];

      const { container } = render(<CustomerFeedbackAlert feedback={feedback} />);

      // ExclamationTriangleIcon hat die Klasse text-yellow-600
      const icon = container.querySelector('.text-yellow-600');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handhabt mehrere Kunden-Feedbacks korrekt und zeigt nur das neueste', () => {
      const feedback = [
        {
          author: 'Kunde',
          comment: 'Altes Feedback 1',
          requestedAt: {
            toDate: () => new Date('2025-01-10T10:00:00')
          }
        },
        {
          author: 'Kunde',
          comment: 'Altes Feedback 2',
          requestedAt: {
            toDate: () => new Date('2025-01-11T10:00:00')
          }
        },
        {
          author: 'Kunde',
          comment: 'Neuestes Feedback',
          requestedAt: {
            toDate: () => new Date('2025-01-15T10:00:00')
          }
        }
      ];

      render(<CustomerFeedbackAlert feedback={feedback} />);

      expect(screen.getByText('Neuestes Feedback')).toBeInTheDocument();
      expect(screen.queryByText('Altes Feedback 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Altes Feedback 2')).not.toBeInTheDocument();
    });

    it('funktioniert wenn feedback undefined ist', () => {
      // @ts-expect-error - Testing undefined edge case
      const { container } = render(<CustomerFeedbackAlert feedback={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
