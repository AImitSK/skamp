import { render, screen, fireEvent } from '@testing-library/react';
import MonitoringConfigPanel from '../MonitoringConfigPanel';
import { DEFAULT_MONITORING_CONFIG } from '../config/types';

describe('MonitoringConfigPanel', () => {
  const mockOnSave = jest.fn();
  const mockOnStart = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    projectId: 'project-123',
    organizationId: 'org-456',
    onSave: mockOnSave,
    onStart: mockOnStart,
    onCancel: mockOnCancel
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render panel header', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    expect(screen.getByText('Monitoring Konfiguration')).toBeInTheDocument();
  });

  it('should render save and start buttons', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    expect(screen.getByText('Speichern')).toBeInTheDocument();
    expect(screen.getByText('Monitoring starten')).toBeInTheDocument();
  });

  it('should render all tab options', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    expect(screen.getByText('Allgemein')).toBeInTheDocument();
    expect(screen.getByText('Anbieter')).toBeInTheDocument();
    expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
  });

  it('should display general tab by default', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    expect(screen.getByText('Überwachungszeitraum')).toBeInTheDocument();
  });

  it('should switch to providers tab', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const providersTab = screen.getByText('Anbieter');
    fireEvent.click(providersTab);

    expect(screen.getByText(/Wählen Sie die Monitoring-Anbieter aus/)).toBeInTheDocument();
  });

  it('should switch to alerts tab', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const alertsTab = screen.getByText('Benachrichtigungen');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Benachrichtigungs-Schwellenwerte')).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(DEFAULT_MONITORING_CONFIG);
  });

  it('should call onStart with enabled config when start button is clicked', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const startButton = screen.getByText('Monitoring starten');
    fireEvent.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      isEnabled: true
    });
  });

  it('should use provided config as initial state', () => {
    const customConfig = {
      ...DEFAULT_MONITORING_CONFIG,
      monitoringPeriod: 30 as const
    };

    render(
      <MonitoringConfigPanel
        {...defaultProps}
        config={customConfig}
      />
    );

    const button30Days = screen.getByText('30 Tage').parentElement;
    expect(button30Days).toHaveClass('border-blue-500');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MonitoringConfigPanel
        {...defaultProps}
        className="custom-class"
      />
    );

    const panel = container.firstChild;
    expect(panel).toHaveClass('custom-class');
  });

  it('should highlight active tab', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const generalTab = screen.getByText('Allgemein');
    expect(generalTab).toHaveClass('border-blue-500', 'text-blue-600');

    const providersTab = screen.getByText('Anbieter');
    expect(providersTab).toHaveClass('border-transparent', 'text-gray-500');
  });

  it('should update config when settings change', () => {
    render(<MonitoringConfigPanel {...defaultProps} />);

    const button30Days = screen.getByText('30 Tage');
    fireEvent.click(button30Days);

    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      ...DEFAULT_MONITORING_CONFIG,
      monitoringPeriod: 30
    });
  });
});
