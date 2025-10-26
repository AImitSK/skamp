// src/components/projects/distribution/components/__tests__/ListPagination.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import ListPagination from '../ListPagination';

describe('ListPagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <ListPagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when totalPages is 0', () => {
    const { container } = render(
      <ListPagination currentPage={1} totalPages={0} onPageChange={mockOnPageChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render previous and next buttons', () => {
    render(<ListPagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);

    expect(screen.getByText('Zurück')).toBeInTheDocument();
    expect(screen.getByText('Weiter')).toBeInTheDocument();
  });

  it('should disable previous button on first page', () => {
    render(<ListPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByText('Zurück');
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    render(<ListPagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByText('Weiter');
    expect(nextButton).toBeDisabled();
  });

  it('should enable both buttons on middle page', () => {
    render(<ListPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByText('Zurück');
    const nextButton = screen.getByText('Weiter');

    expect(prevButton).not.toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('should call onPageChange with previous page when clicking previous button', () => {
    render(<ListPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByText('Zurück');
    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange with next page when clicking next button', () => {
    render(<ListPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByText('Weiter');
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(4);
  });

  it('should render all page numbers when totalPages <= 7', () => {
    render(<ListPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should highlight current page', () => {
    render(<ListPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const currentPageButton = screen.getByText('3');
    expect(currentPageButton).toHaveClass('text-primary');
  });

  it('should call onPageChange with specific page when clicking page number', () => {
    render(<ListPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    const page4Button = screen.getByText('4');
    fireEvent.click(page4Button);

    expect(mockOnPageChange).toHaveBeenCalledWith(4);
  });

  it('should render maximum 7 visible pages for many pages', () => {
    render(<ListPagination currentPage={5} totalPages={20} onPageChange={mockOnPageChange} />);

    const pageButtons = screen.getAllByRole('button').filter(
      btn => !['Zurück', 'Weiter'].includes(btn.textContent || '')
    );

    expect(pageButtons.length).toBeLessThanOrEqual(7);
  });
});
