// src/components/campaigns/pr-seo/components/KeywordInput.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { KeywordInput } from './KeywordInput';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'placeholder': 'Keyword hinzufügen...',
      'add': 'Hinzufügen',
    };

    if (key === 'maxReached' && params?.max) {
      return `Maximum ${params.max} Keywords erreicht`;
    }

    return translations[key] || key;
  },
}));

describe('KeywordInput', () => {
  const mockOnAddKeyword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render input field and button', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    expect(screen.getByPlaceholderText('Keyword hinzufügen...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hinzufügen/i })).toBeInTheDocument();
  });

  it('should call onAddKeyword when button is clicked', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...');
    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.click(button);

    expect(mockOnAddKeyword).toHaveBeenCalledWith('Innovation');
  });

  it('should call onAddKeyword when Enter key is pressed', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...');

    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnAddKeyword).toHaveBeenCalledWith('Innovation');
  });

  it('should clear input after adding keyword', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.click(button);

    expect(input.value).toBe('');
  });

  it('should trim whitespace from keyword', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...');
    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.change(input, { target: { value: '  Innovation  ' } });
    fireEvent.click(button);

    expect(mockOnAddKeyword).toHaveBeenCalledWith('Innovation');
  });

  it('should not add empty keyword', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.click(button);

    expect(mockOnAddKeyword).not.toHaveBeenCalled();
  });

  it('should not add duplicate keyword', () => {
    render(<KeywordInput keywords={['Innovation']} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...');
    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.click(button);

    expect(mockOnAddKeyword).not.toHaveBeenCalled();
  });

  it('should disable input when max keywords reached', () => {
    render(<KeywordInput keywords={['Keyword1', 'Keyword2']} onAddKeyword={mockOnAddKeyword} maxKeywords={2} />);

    const input = screen.getByPlaceholderText(/maximum 2 keywords erreicht/i);

    expect(input).toBeDisabled();
  });

  it('should show max keywords message when limit reached', () => {
    render(<KeywordInput keywords={['Keyword1', 'Keyword2']} onAddKeyword={mockOnAddKeyword} maxKeywords={2} />);

    expect(screen.getByPlaceholderText('Maximum 2 Keywords erreicht')).toBeInTheDocument();
  });

  it('should not call onAddKeyword when max keywords reached', () => {
    render(<KeywordInput keywords={['Keyword1', 'Keyword2']} onAddKeyword={mockOnAddKeyword} maxKeywords={2} />);

    const button = screen.getByRole('button', { name: /hinzufügen/i });

    fireEvent.click(button);

    expect(mockOnAddKeyword).not.toHaveBeenCalled();
  });

  it('should use custom maxKeywords prop', () => {
    render(<KeywordInput keywords={['K1', 'K2', 'K3']} onAddKeyword={mockOnAddKeyword} maxKeywords={3} />);

    const input = screen.getByPlaceholderText(/maximum 3 keywords erreicht/i);

    expect(input).toBeDisabled();
  });

  it('should update input value as user types', () => {
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAddKeyword} />);

    const input = screen.getByPlaceholderText('Keyword hinzufügen...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Test' } });

    expect(input.value).toBe('Test');
  });
});
