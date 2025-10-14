// src/app/dashboard/library/editors/components/shared/__tests__/Alert.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Alert from '../Alert';

describe('Alert Component', () => {
  it('renders info alert with title and message', () => {
    render(<Alert type="info" title="Info Title" message="Info message" />);

    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('renders success alert', () => {
    render(<Alert type="success" title="Success" message="Operation successful" />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders warning alert', () => {
    render(<Alert type="warning" title="Warning" message="Be careful" />);

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Be careful')).toBeInTheDocument();
  });

  it('renders error alert', () => {
    render(<Alert type="error" title="Error" message="Something went wrong" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders without message', () => {
    render(<Alert type="info" title="Title only" />);

    expect(screen.getByText('Title only')).toBeInTheDocument();
  });

  it('renders with action button and handles click', () => {
    const handleAction = jest.fn();

    render(
      <Alert
        type="info"
        title="Action Alert"
        message="Click the action"
        action={{ label: 'Retry', onClick: handleAction }}
      />
    );

    const actionButton = screen.getByText('Retry');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('defaults to info type when not specified', () => {
    render(<Alert title="Default Type" message="Should be info" />);

    expect(screen.getByText('Default Type')).toBeInTheDocument();
  });

  it('applies correct styling for different alert types', () => {
    const { rerender, container } = render(
      <Alert type="info" title="Info" />
    );

    let alertDiv = container.querySelector('.bg-blue-50');
    expect(alertDiv).toBeInTheDocument();

    rerender(<Alert type="success" title="Success" />);
    alertDiv = container.querySelector('.bg-green-50');
    expect(alertDiv).toBeInTheDocument();

    rerender(<Alert type="warning" title="Warning" />);
    alertDiv = container.querySelector('.bg-yellow-50');
    expect(alertDiv).toBeInTheDocument();

    rerender(<Alert type="error" title="Error" />);
    alertDiv = container.querySelector('.bg-red-50');
    expect(alertDiv).toBeInTheDocument();
  });
});
