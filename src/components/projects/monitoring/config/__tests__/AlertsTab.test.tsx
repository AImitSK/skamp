import { render, screen, fireEvent } from '@testing-library/react';
import AlertsTab from '../AlertsTab';
import { DEFAULT_MONITORING_CONFIG } from '../types';

describe('AlertsTab', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    config: DEFAULT_MONITORING_CONFIG,
    onChange: mockOnChange
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alerts tab header', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText('Benachrichtigungs-Schwellenwerte')).toBeInTheDocument();
  });

  it('should render min reach input with label', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText('Mindest-Reichweite (täglich)')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('1000');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(1000);
  });

  it('should update min reach threshold', () => {
    render(<AlertsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText('1000');
    fireEvent.change(input, { target: { value: '2000' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      alertThresholds: {
        ...DEFAULT_MONITORING_CONFIG.alertThresholds,
        minReach: 2000
      }
    });
  });

  it('should render sentiment alert input with label', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText('Sentiment-Warnschwelle')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('-0.3');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(-0.3);
  });

  it('should update sentiment threshold', () => {
    render(<AlertsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText('-0.3');
    fireEvent.change(input, { target: { value: '-0.5' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      alertThresholds: {
        ...DEFAULT_MONITORING_CONFIG.alertThresholds,
        sentimentAlert: -0.5
      }
    });
  });

  it('should render competitor mentions input with label', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText('Wettbewerber-Erwähnungen')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('5');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(5);
  });

  it('should update competitor mentions threshold', () => {
    render(<AlertsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText('5');
    fireEvent.change(input, { target: { value: '10' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      alertThresholds: {
        ...DEFAULT_MONITORING_CONFIG.alertThresholds,
        competitorMentions: 10
      }
    });
  });

  it('should display help text for min reach', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText(/Warnung wenn tägliche Reichweite unter diesem Wert liegt/)).toBeInTheDocument();
  });

  it('should display help text for sentiment', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText(/Warnung wenn Sentiment unter diesem Wert fällt/)).toBeInTheDocument();
  });

  it('should display help text for competitor mentions', () => {
    render(<AlertsTab {...defaultProps} />);

    expect(screen.getByText(/Warnung wenn Wettbewerber häufiger erwähnt werden/)).toBeInTheDocument();
  });

  it('should handle invalid numeric input for minReach', () => {
    render(<AlertsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText('1000');
    fireEvent.change(input, { target: { value: 'invalid' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      alertThresholds: {
        ...DEFAULT_MONITORING_CONFIG.alertThresholds,
        minReach: 0
      }
    });
  });
});
