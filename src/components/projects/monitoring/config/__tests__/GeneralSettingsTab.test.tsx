import { render, screen, fireEvent } from '@testing-library/react';
import GeneralSettingsTab from '../GeneralSettingsTab';
import { MonitoringConfig, DEFAULT_MONITORING_CONFIG } from '../types';

describe('GeneralSettingsTab', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    config: DEFAULT_MONITORING_CONFIG,
    onChange: mockOnChange
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all monitoring period options', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    expect(screen.getByText('30 Tage')).toBeInTheDocument();
    expect(screen.getByText('90 Tage')).toBeInTheDocument();
    expect(screen.getByText('1 Jahr')).toBeInTheDocument();
  });

  it('should highlight selected monitoring period', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    const button90Days = screen.getByText('90 Tage').parentElement;
    expect(button90Days).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700');
  });

  it('should call onChange when period is selected', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    const button30Days = screen.getByText('30 Tage');
    fireEvent.click(button30Days);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      monitoringPeriod: 30
    });
  });

  it('should render auto transition toggle', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    expect(screen.getByText('Automatischer Übergang')).toBeInTheDocument();
    expect(screen.getByText(/automatisch zu "Abgeschlossen" wechseln/)).toBeInTheDocument();
  });

  it('should toggle auto transition', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      autoTransition: false
    });
  });

  it('should render report schedule select', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    expect(screen.getByText('Berichts-Zeitplan')).toBeInTheDocument();
    const select = screen.getByDisplayValue('Wöchentlich');
    expect(select).toBeInTheDocument();
  });

  it('should change report schedule', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    const select = screen.getByDisplayValue('Wöchentlich');
    fireEvent.change(select, { target: { value: 'daily' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      reportSchedule: 'daily'
    });
  });

  it('should display all report schedule options', () => {
    render(<GeneralSettingsTab {...defaultProps} />);

    expect(screen.getByText('Täglich')).toBeInTheDocument();
    expect(screen.getByText('Wöchentlich')).toBeInTheDocument();
    expect(screen.getByText('Monatlich')).toBeInTheDocument();
  });
});
