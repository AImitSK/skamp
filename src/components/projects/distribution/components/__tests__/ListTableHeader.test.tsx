// src/components/projects/distribution/components/__tests__/ListTableHeader.test.tsx

import { render, screen } from '@testing-library/react';
import ListTableHeader from '../ListTableHeader';

describe('ListTableHeader', () => {
  const mockColumns = [
    { label: 'Name', width: 'w-[35%]' },
    { label: 'Kategorie', width: 'w-[15%]' },
    { label: 'Typ', width: 'w-[15%]' },
    { label: 'Kontakte', width: 'w-[12%]' },
  ];

  it('should render all column headers', () => {
    render(<ListTableHeader columns={mockColumns} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Kategorie')).toBeInTheDocument();
    expect(screen.getByText('Typ')).toBeInTheDocument();
    expect(screen.getByText('Kontakte')).toBeInTheDocument();
  });

  it('should apply correct width classes to columns', () => {
    const { container } = render(<ListTableHeader columns={mockColumns} />);

    const nameColumn = screen.getByText('Name');
    expect(nameColumn).toHaveClass('w-[35%]');

    const kategorieColumn = screen.getByText('Kategorie');
    expect(kategorieColumn).toHaveClass('w-[15%]');
  });

  it('should render with empty columns array', () => {
    const { container } = render(<ListTableHeader columns={[]} />);

    const header = container.querySelector('.flex.items-center');
    expect(header).toBeInTheDocument();
    expect(header?.children.length).toBe(0);
  });

  it('should render columns in correct order', () => {
    const { container } = render(<ListTableHeader columns={mockColumns} />);

    const columns = container.querySelectorAll('.flex.items-center > div');
    expect(columns[0]).toHaveTextContent('Name');
    expect(columns[1]).toHaveTextContent('Kategorie');
    expect(columns[2]).toHaveTextContent('Typ');
    expect(columns[3]).toHaveTextContent('Kontakte');
  });
});
