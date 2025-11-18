import { render, screen, fireEvent } from '@testing-library/react';
import { PDFExportButton } from '../PDFExportButton';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '@/context/AuthContext';

jest.mock('../../context/MonitoringContext');
jest.mock('@/context/AuthContext');

const mockUseMonitoring = useMonitoring as jest.MockedFunction<typeof useMonitoring>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('PDFExportButton', () => {
  const mockHandlePDFExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render PDF export button with correct text', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      render(<PDFExportButton />);

      expect(screen.getByText('PDF-Report')).toBeInTheDocument();
    });

    it('should render with DocumentArrowDownIcon', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      const { container } = render(<PDFExportButton />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show generating text when PDF is being generated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: true,
      } as any);

      render(<PDFExportButton />);

      expect(screen.getByText('Generiere PDF...')).toBeInTheDocument();
    });

    it('should disable button when PDF is being generated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: true,
      } as any);

      render(<PDFExportButton />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should enable button when PDF is not being generated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      render(<PDFExportButton />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('click handler', () => {
    it('should call handlePDFExport with userId when clicked', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      render(<PDFExportButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockHandlePDFExport).toHaveBeenCalledWith('user-123');
    });

    it('should not call handlePDFExport when user is not logged in', () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      render(<PDFExportButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockHandlePDFExport).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-123' },
      } as any);

      mockUseMonitoring.mockReturnValue({
        handlePDFExport: mockHandlePDFExport,
        isPDFGenerating: false,
      } as any);

      render(<PDFExportButton />);

      expect(PDFExportButton.type).toBeDefined();
    });
  });
});
