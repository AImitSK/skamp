import { render, screen, fireEvent } from '@testing-library/react';
import { AISequenzButton } from '../AISequenzButton';
import { Timestamp } from 'firebase/firestore';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('AISequenzButton', () => {
  const mockDNASynthese = {
    id: 'synthese-123',
    content: '<p>DNA Synthese</p>',
    plainText: 'DNA Synthese Plaintext',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockKernbotschaft = {
    id: 'kernbotschaft-123',
    content: '<p>Kernbotschaft Inhalt</p>',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const defaultProps = {
    projectId: 'project-123',
    dnaSynthese: mockDNASynthese,
    kernbotschaft: mockKernbotschaft,
    onGenerate: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('rendert den Header mit AI Sequenz Titel', () => {
      render(<AISequenzButton {...defaultProps} />);

      expect(screen.getByText('AI Sequenz')).toBeInTheDocument();
    });

    it('rendert die Beschreibung', () => {
      render(<AISequenzButton {...defaultProps} />);

      expect(
        screen.getByText(
          /Generiere die strategische Text-Matrix aus DNA Synthese und Kernbotschaft/
        )
      ).toBeInTheDocument();
    });

    it('rendert die Erklärung', () => {
      render(<AISequenzButton {...defaultProps} />);

      expect(screen.getByText(/Was passiert:/)).toBeInTheDocument();
      expect(
        screen.getByText(/Die AI Sequenz kombiniert die DNA Synthese/)
      ).toBeInTheDocument();
    });

    it('rendert den "AI Sequenz starten" Button', () => {
      render(<AISequenzButton {...defaultProps} />);

      expect(screen.getByText('AI Sequenz starten')).toBeInTheDocument();
    });
  });

  describe('Button Interaktion', () => {
    it('ruft onGenerate auf bei Button-Klick', () => {
      const onGenerate = jest.fn();
      render(<AISequenzButton {...defaultProps} onGenerate={onGenerate} />);

      const button = screen.getByText('AI Sequenz starten');
      fireEvent.click(button);

      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it('deaktiviert Button während isLoading=true', () => {
      render(<AISequenzButton {...defaultProps} isLoading={true} />);

      const button = screen.getByText('Generiere...');
      expect(button).toBeDisabled();
    });

    it('zeigt "Generiere..." Text während isLoading=true', () => {
      render(<AISequenzButton {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Generiere...')).toBeInTheDocument();
      expect(screen.queryByText('AI Sequenz starten')).not.toBeInTheDocument();
    });

    it('zeigt "AI Sequenz starten" Text wenn isLoading=false', () => {
      render(<AISequenzButton {...defaultProps} isLoading={false} />);

      expect(screen.getByText('AI Sequenz starten')).toBeInTheDocument();
      expect(screen.queryByText('Generiere...')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('zeigt Loading-Spinner während isLoading=true', () => {
      render(<AISequenzButton {...defaultProps} isLoading={true} />);

      expect(
        screen.getByText('Text-Matrix wird generiert...')
      ).toBeInTheDocument();

      // Spinner hat animate-spin Klasse
      const { container } = render(
        <AISequenzButton {...defaultProps} isLoading={true} />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('zeigt KEINEN Loading-Spinner wenn isLoading=false', () => {
      render(<AISequenzButton {...defaultProps} isLoading={false} />);

      expect(
        screen.queryByText('Text-Matrix wird generiert...')
      ).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('verwendet SparklesIcon im Header', () => {
      const { container } = render(<AISequenzButton {...defaultProps} />);

      // SparklesIcon hat text-blue-600 Klasse
      const icon = container.querySelector('.text-blue-600');
      expect(icon).toBeInTheDocument();
    });

    it('verwendet SparklesIcon im Button', () => {
      const { container } = render(<AISequenzButton {...defaultProps} />);

      // Button enthält Icon mit h-4 w-4 mr-2
      const button = screen.getByText('AI Sequenz starten').closest('button');
      const icon = button?.querySelector('.h-4.w-4.mr-2');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Props Validierung', () => {
    it('rendert korrekt mit allen Required Props', () => {
      const { container } = render(<AISequenzButton {...defaultProps} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText('AI Sequenz')).toBeInTheDocument();
    });

    it('verwendet default-Wert isLoading=false', () => {
      render(
        <AISequenzButton
          projectId="test"
          dnaSynthese={mockDNASynthese}
          kernbotschaft={mockKernbotschaft}
        />
      );

      expect(screen.getByText('AI Sequenz starten')).toBeInTheDocument();
      expect(screen.getByText('AI Sequenz starten')).not.toBeDisabled();
    });
  });
});
