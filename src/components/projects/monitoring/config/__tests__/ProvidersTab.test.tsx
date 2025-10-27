import { render, screen, fireEvent } from '@testing-library/react';
import ProvidersTab from '../ProvidersTab';
import { MonitoringConfig, DEFAULT_MONITORING_CONFIG } from '../types';

describe('ProvidersTab', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    config: DEFAULT_MONITORING_CONFIG,
    onChange: mockOnChange
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render provider selection description', () => {
    render(<ProvidersTab {...defaultProps} />);

    expect(screen.getByText(/Wählen Sie die Monitoring-Anbieter aus/)).toBeInTheDocument();
  });

  it('should render all providers', () => {
    render(<ProvidersTab {...defaultProps} />);

    expect(screen.getByText('landau')).toBeInTheDocument();
  });

  it('should display provider API endpoint', () => {
    render(<ProvidersTab {...defaultProps} />);

    expect(screen.getByText('https://api.landau.com')).toBeInTheDocument();
  });

  it('should display provider supported metrics', () => {
    render(<ProvidersTab {...defaultProps} />);

    expect(screen.getByText('reach, sentiment, mentions')).toBeInTheDocument();
  });

  it('should toggle provider enabled state', () => {
    render(<ProvidersTab {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      providers: [
        {
          ...DEFAULT_MONITORING_CONFIG.providers[0],
          isEnabled: false
        }
      ]
    });
  });

  it('should handle multiple providers', () => {
    const configWithMultipleProviders: MonitoringConfig = {
      ...DEFAULT_MONITORING_CONFIG,
      providers: [
        DEFAULT_MONITORING_CONFIG.providers[0],
        {
          name: 'pmg',
          apiEndpoint: 'https://api.pmg.com',
          isEnabled: false,
          supportedMetrics: ['reach', 'social']
        }
      ]
    };

    render(
      <ProvidersTab
        config={configWithMultipleProviders}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('landau')).toBeInTheDocument();
    expect(screen.getByText('pmg')).toBeInTheDocument();
  });
});
