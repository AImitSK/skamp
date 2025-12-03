// src/__tests__/campaigns/StatusBadge.test.tsx
import { render, screen } from '../test-utils';
import { StatusBadge } from '@/components/campaigns/StatusBadge';
import { PRCampaignStatus } from '@/types/pr';

describe('StatusBadge', () => {
  it('renders draft status correctly', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
  });

  it('renders with description when requested', () => {
    render(<StatusBadge status="draft" showDescription={true} />);
    expect(screen.getByText('Die Kampagne ist noch in Bearbeitung')).toBeInTheDocument();
  });

  it('renders all status types', () => {
    const statuses: PRCampaignStatus[] = [
      'draft', 'generating_preview', 'in_review', 'changes_requested', 'approved',
      'scheduled', 'sending', 'sent', 'archived'
    ];

    // Erwartete Labels fuer jeden Status (aus campaignStatus.ts)
    const expectedLabels: Record<PRCampaignStatus, string> = {
      draft: 'Entwurf',
      generating_preview: 'Generiere Vorschau',
      in_review: 'In Prüfung',
      changes_requested: 'Änderung erbeten',
      approved: 'Freigegeben',
      scheduled: 'Geplant',
      sending: 'Wird gesendet',
      sent: 'Gesendet',
      archived: 'Archiviert'
    };

    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} />);
      // Pruefe dass das erwartete Label vorhanden ist
      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
      unmount();
    });
  });

  it('applies custom className', () => {
    render(<StatusBadge status="sent" className="custom-class" />);
    // Die className wird auf das Badge-Element angewendet (span)
    const badge = screen.getByText('Gesendet').closest('span');
    expect(badge).toHaveClass('custom-class');
  });
});