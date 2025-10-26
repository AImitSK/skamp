// src/components/projects/distribution/components/__tests__/ListFilterButton.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListFilterButton from '../ListFilterButton';

describe('ListFilterButton', () => {
  const mockCategoryOptions = [
    { value: 'press', label: 'Presse' },
    { value: 'customers', label: 'Kunden' },
  ];

  const mockTypeOptions = [
    { value: 'linked', label: 'Verknüpft' },
    { value: 'custom', label: 'Projekt' },
  ];

  const mockProps = {
    categoryOptions: mockCategoryOptions,
    typeOptions: mockTypeOptions,
    selectedCategories: [],
    selectedTypes: [],
    onCategoryChange: jest.fn(),
    onTypeChange: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter button', () => {
    render(<ListFilterButton {...mockProps} />);

    const button = screen.getByLabelText('Filter');
    expect(button).toBeInTheDocument();
  });

  it('should show active filter count badge when filters are selected', () => {
    render(
      <ListFilterButton
        {...mockProps}
        selectedCategories={['press']}
        selectedTypes={['linked']}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should not show badge when no filters are selected', () => {
    render(<ListFilterButton {...mockProps} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should open popover when clicking filter button', async () => {
    render(<ListFilterButton {...mockProps} />);

    const button = screen.getByLabelText('Filter');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('Typ')).toBeInTheDocument();
      expect(screen.getByText('Kategorie')).toBeInTheDocument();
    });
  });

  it('should render all type options as checkboxes', async () => {
    render(<ListFilterButton {...mockProps} />);

    fireEvent.click(screen.getByLabelText('Filter'));

    await waitFor(() => {
      expect(screen.getByText('Verknüpft')).toBeInTheDocument();
      expect(screen.getByText('Projekt')).toBeInTheDocument();
    });
  });

  it('should render all category options as checkboxes', async () => {
    render(<ListFilterButton {...mockProps} />);

    fireEvent.click(screen.getByLabelText('Filter'));

    await waitFor(() => {
      expect(screen.getByText('Presse')).toBeInTheDocument();
      expect(screen.getByText('Kunden')).toBeInTheDocument();
    });
  });

  it('should show reset button when filters are active', async () => {
    render(
      <ListFilterButton
        {...mockProps}
        selectedCategories={['press']}
      />
    );

    fireEvent.click(screen.getByLabelText('Filter'));

    await waitFor(() => {
      expect(screen.getByText('Zurücksetzen')).toBeInTheDocument();
    });
  });

  it('should not show reset button when no filters are active', async () => {
    render(<ListFilterButton {...mockProps} />);

    fireEvent.click(screen.getByLabelText('Filter'));

    await waitFor(() => {
      expect(screen.queryByText('Zurücksetzen')).not.toBeInTheDocument();
    });
  });

  it('should call onReset when clicking reset button', async () => {
    render(
      <ListFilterButton
        {...mockProps}
        selectedCategories={['press']}
      />
    );

    fireEvent.click(screen.getByLabelText('Filter'));

    await waitFor(() => {
      const resetButton = screen.getByText('Zurücksetzen');
      fireEvent.click(resetButton);
    });

    expect(mockProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('should apply active styles when filters are selected', () => {
    render(
      <ListFilterButton
        {...mockProps}
        selectedCategories={['press']}
      />
    );

    const button = screen.getByLabelText('Filter');
    expect(button).toHaveClass('border-primary');
  });

  it('should apply default styles when no filters are selected', () => {
    render(<ListFilterButton {...mockProps} />);

    const button = screen.getByLabelText('Filter');
    expect(button).toHaveClass('border-gray-300');
  });
});
