// src/__tests__/campaigns/Alert.test.tsx
import { render, screen, fireEvent } from '../test-utils';
import { Alert } from '@/components/common/Alert';

describe('Alert Component', () => {
  it('renders info alert by default', () => {
    render(<Alert title="Test Title" message="Test message" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders different alert types with correct styling', () => {
    const types = ['info', 'success', 'warning', 'error'] as const;

    types.forEach(type => {
      const { unmount } = render(<Alert type={type} title={`${type} alert`} message="Test message" />);
      expect(screen.getByText(`${type} alert`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders action button when provided', () => {
    const mockAction = jest.fn();

    render(
      <Alert
        title="Test Title"
        message="Test message"
        action={{ label: 'Click me', onClick: mockAction }}
      />
    );

    const actionButton = screen.getByText('Click me');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('renders without title when not provided', () => {
    render(<Alert message="Message only" />);

    expect(screen.getByText('Message only')).toBeInTheDocument();
  });
});