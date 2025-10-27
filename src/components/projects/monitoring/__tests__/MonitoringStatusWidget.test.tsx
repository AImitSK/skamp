import { render, screen, fireEvent } from '@testing-library/react';
import MonitoringStatusWidget from '../MonitoringStatusWidget';

describe('MonitoringStatusWidget', () => {
  const mockOnStart = jest.fn();
  const mockOnPause = jest.fn();
  const mockOnStop = jest.fn();

  const mockStats = {
    totalClippings: 15,
    totalReach: 5000,
    averageSentiment: 0.5,
    trending: 'up',
    lastUpdated: new Date()
  };

  const defaultProps = {
    projectId: 'project-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render monitoring status label', () => {
    render(<MonitoringStatusWidget {...defaultProps} />);

    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('should display not_started status by default', () => {
    render(<MonitoringStatusWidget {...defaultProps} status="not_started" />);

    expect(screen.getByText('Nicht gestartet')).toBeInTheDocument();
    expect(screen.getByText('Monitoring nicht gestartet')).toBeInTheDocument();
  });

  it('should display active status', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={mockStats}
      />
    );

    expect(screen.getByText('Aktiv überwacht')).toBeInTheDocument();
  });

  it('should display completed status', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="completed"
        stats={mockStats}
      />
    );

    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('should display paused status', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="paused"
        stats={mockStats}
      />
    );

    expect(screen.getByText('Pausiert')).toBeInTheDocument();
  });

  it('should display stats when status is active', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={mockStats}
      />
    );

    expect(screen.getByText('5.0K')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('+0.5')).toBeInTheDocument();
  });

  it('should format large reach numbers correctly', () => {
    const statsWithLargeReach = {
      ...mockStats,
      totalReach: 1500000
    };

    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={statsWithLargeReach}
      />
    );

    // Component formats as 1500.0K (not 1.5M)
    expect(screen.getByText('1500.0K')).toBeInTheDocument();
  });

  it('should show start button when status is not_started', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="not_started"
        onStart={mockOnStart}
      />
    );

    const startButton = screen.getByText('Starten');
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(mockOnStart).toHaveBeenCalled();
  });

  it('should show pause and stop buttons when status is active', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={mockStats}
        onPause={mockOnPause}
        onStop={mockOnStop}
      />
    );

    const pauseButton = screen.getByText('Pausieren');
    const stopButton = screen.getByText('Stoppen');

    expect(pauseButton).toBeInTheDocument();
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(pauseButton);
    expect(mockOnPause).toHaveBeenCalled();

    fireEvent.click(stopButton);
    expect(mockOnStop).toHaveBeenCalled();
  });

  it('should show resume button when status is paused', () => {
    render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="paused"
        stats={mockStats}
        onStart={mockOnStart}
      />
    );

    const resumeButton = screen.getByText('Fortsetzen');
    expect(resumeButton).toBeInTheDocument();

    fireEvent.click(resumeButton);
    expect(mockOnStart).toHaveBeenCalled();
  });

  it('should show default dashboard buttons when no action handlers provided', () => {
    render(<MonitoringStatusWidget {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MonitoringStatusWidget
        {...defaultProps}
        className="custom-class"
      />
    );

    const widget = container.firstChild;
    expect(widget).toHaveClass('custom-class');
  });

  it('should display sentiment with color coding', () => {
    const positiveStats = { ...mockStats, averageSentiment: 0.3 };
    const { rerender } = render(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={positiveStats}
      />
    );

    let sentimentElement = screen.getByText('+0.3');
    expect(sentimentElement).toHaveClass('text-green-600');

    const negativeStats = { ...mockStats, averageSentiment: -0.3 };
    rerender(
      <MonitoringStatusWidget
        {...defaultProps}
        status="active"
        stats={negativeStats}
      />
    );

    sentimentElement = screen.getByText('-0.3');
    expect(sentimentElement).toHaveClass('text-red-600');
  });
});
