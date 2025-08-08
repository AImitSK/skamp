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
      'draft', 'in_review', 'changes_requested', 'approved', 
      'scheduled', 'sending', 'sent', 'archived'
    ];

    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByRole('generic')).toBeInTheDocument();
      unmount();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<StatusBadge status="sent" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});