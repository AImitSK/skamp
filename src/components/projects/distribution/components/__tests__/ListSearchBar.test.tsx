// src/components/projects/distribution/components/__tests__/ListSearchBar.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import ListSearchBar from '../ListSearchBar';

describe('ListSearchBar', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render search input with default placeholder', () => {
    render(<ListSearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('Suchen...');
    expect(input).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    render(<ListSearchBar value="" onChange={mockOnChange} placeholder="Listen durchsuchen..." />);

    const input = screen.getByPlaceholderText('Listen durchsuchen...');
    expect(input).toBeInTheDocument();
  });

  it('should display current value', () => {
    render(<ListSearchBar value="test search" onChange={mockOnChange} />);

    const input = screen.getByDisplayValue('test search');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    render(<ListSearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'new search' } });

    expect(mockOnChange).toHaveBeenCalledWith('new search');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should show clear button when value is not empty', () => {
    render(<ListSearchBar value="test" onChange={mockOnChange} />);

    const clearButton = screen.getByLabelText('Suche zurücksetzen');
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<ListSearchBar value="" onChange={mockOnChange} />);

    const clearButton = screen.queryByLabelText('Suche zurücksetzen');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should clear search when clicking clear button', () => {
    render(<ListSearchBar value="test search" onChange={mockOnChange} />);

    const clearButton = screen.getByLabelText('Suche zurücksetzen');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should have search icon visible', () => {
    render(<ListSearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox');
    const searchIcon = input.parentElement?.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });
});
