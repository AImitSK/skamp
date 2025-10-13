// src/app/dashboard/contacts/crm/components/shared/__tests__/FlagIcon.test.tsx
import { render, waitFor } from '@testing-library/react';
import { FlagIcon } from '../FlagIcon';

describe('FlagIcon', () => {
  it('renders nothing when no country code provided', () => {
    const { container } = render(<FlagIcon />);
    expect(container.firstChild).toBeNull();
  });

  it('loads flag dynamically for valid country code', async () => {
    const { container } = render(<FlagIcon countryCode="DE" />);

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
