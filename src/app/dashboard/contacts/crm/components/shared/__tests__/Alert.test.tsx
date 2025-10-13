// src/app/dashboard/contacts/crm/components/shared/__tests__/Alert.test.tsx
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders with title and message', () => {
    render(<Alert type="info" title="Test Title" message="Test Message" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('renders correct colors for different types', () => {
    const { rerender } = render(<Alert type="success" title="Success" />);
    expect(screen.getByText('Success')).toHaveClass('text-green-700');

    rerender(<Alert type="error" title="Error" />);
    expect(screen.getByText('Error')).toHaveClass('text-red-700');

    rerender(<Alert type="warning" title="Warning" />);
    expect(screen.getByText('Warning')).toHaveClass('text-yellow-700');
  });
});
