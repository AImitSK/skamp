import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from '../TabNavigation';
import { useMonitoring } from '../../context/MonitoringContext';

jest.mock('../../context/MonitoringContext');

const mockUseMonitoring = useMonitoring as jest.MockedFunction<typeof useMonitoring>;

describe('TabNavigation', () => {
  const mockOnChange = jest.fn();

  const createMockContext = (overrides = {}) => ({
    clippings: [],
    suggestions: [],
    campaign: null,
    sends: [],
    isLoadingData: false,
    isLoadingPDFs: false,
    error: null,
    reloadData: jest.fn(),
    handlePDFExport: jest.fn(),
    isPDFGenerating: false,
    analysisPDFs: [],
    analysenFolderLink: null,
    handleDeletePDF: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering all tabs', () => {
    it('should render all 5 tabs', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      expect(screen.getByText(/Analytics/)).toBeInTheDocument();
      expect(screen.getByText(/E-Mail Performance/)).toBeInTheDocument();
      expect(screen.getByText(/Empfänger & Veröffentlichungen/)).toBeInTheDocument();
      expect(screen.getByText(/Clipping-Archiv/)).toBeInTheDocument();
      expect(screen.getByText(/Auto-Funde/)).toBeInTheDocument();
    });

    it('should render tab icons', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      const { container } = render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('active tab styling', () => {
    it('should highlight active tab', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      const analyticsTab = screen.getByText(/Analytics/).closest('button');
      expect(analyticsTab).toHaveClass('text-[#005fab]');
      expect(analyticsTab).toHaveClass('border-[#005fab]');
    });

    it('should not highlight inactive tabs', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      const performanceTab = screen.getByText(/E-Mail Performance/).closest('button');
      expect(performanceTab).toHaveClass('text-gray-500');
      expect(performanceTab).not.toHaveClass('text-[#005fab]');
    });
  });

  describe('tab switching', () => {
    it('should call onChange when tab is clicked', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      const performanceTab = screen.getByText('E-Mail Performance');
      fireEvent.click(performanceTab);

      expect(mockOnChange).toHaveBeenCalledWith('performance');
    });

    it('should call onChange for each tab', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      fireEvent.click(screen.getByText(/Analytics/));
      expect(mockOnChange).toHaveBeenCalledWith('dashboard');

      fireEvent.click(screen.getByText(/E-Mail Performance/));
      expect(mockOnChange).toHaveBeenCalledWith('performance');

      fireEvent.click(screen.getByText(/Empfänger & Veröffentlichungen/));
      expect(mockOnChange).toHaveBeenCalledWith('recipients');

      fireEvent.click(screen.getByText(/Clipping-Archiv/));
      expect(mockOnChange).toHaveBeenCalledWith('clippings');

      fireEvent.click(screen.getByText(/Auto-Funde/));
      expect(mockOnChange).toHaveBeenCalledWith('suggestions');
    });
  });

  describe('counts display', () => {
    it('should show clippings count', () => {
      mockUseMonitoring.mockReturnValue(createMockContext({
        clippings: [{ id: '1' }, { id: '2' }, { id: '3' }],
      }) as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      expect(screen.getByText(/Clipping-Archiv/)).toHaveTextContent('(3)');
    });

    it('should show pending suggestions count', () => {
      mockUseMonitoring.mockReturnValue(createMockContext({
        suggestions: [
          { id: '1', status: 'pending' },
          { id: '2', status: 'pending' },
          { id: '3', status: 'confirmed' },
        ],
      }) as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      expect(screen.getByText(/Auto-Funde/)).toHaveTextContent('(2)');
    });

    it('should not show count for tabs without count', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      const analyticsTab = screen.getByText(/Analytics/);
      expect(analyticsTab.textContent).not.toContain('(');
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      mockUseMonitoring.mockReturnValue(createMockContext() as any);

      render(<TabNavigation activeTab="dashboard" onChange={mockOnChange} />);

      expect(TabNavigation.type).toBeDefined();
    });
  });
});
