// src/components/projects/distribution/components/details/__tests__/ListInfoHeader.test.tsx

import { render, screen } from '@testing-library/react';
import ListInfoHeader from '../ListInfoHeader';

describe('ListInfoHeader', () => {
  const defaultProps = {
    listName: 'Test Liste',
    listCategory: 'press',
    listType: 'dynamic',
    contactCount: 150,
  };

  it('should render list information', () => {
    render(<ListInfoHeader {...defaultProps} />);

    expect(screen.getByText('Kategorie')).toBeInTheDocument();
    expect(screen.getByText('Typ')).toBeInTheDocument();
    expect(screen.getByText('Kontakte')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<ListInfoHeader {...defaultProps} listDescription="Eine Testliste" />);

    expect(screen.getByText('Eine Testliste')).toBeInTheDocument();
  });

  it('should not render description section when not provided', () => {
    render(<ListInfoHeader {...defaultProps} />);

    const description = screen.queryByText('Eine Testliste');
    expect(description).not.toBeInTheDocument();
  });

  it('should display dynamic badge for dynamic list type', () => {
    render(<ListInfoHeader {...defaultProps} listType="dynamic" />);

    expect(screen.getByText('Dynamisch')).toBeInTheDocument();
  });

  it('should display static badge for static list type', () => {
    render(<ListInfoHeader {...defaultProps} listType="static" />);

    expect(screen.getByText('Statisch')).toBeInTheDocument();
  });

  it('should format contact count with locale string', () => {
    render(<ListInfoHeader {...defaultProps} contactCount={1500} />);

    expect(screen.getByText('1.500')).toBeInTheDocument();
  });

  it('should display category label', () => {
    render(<ListInfoHeader {...defaultProps} listCategory="press" />);

    const categoryBadge = screen.getByText('Presse');
    expect(categoryBadge).toBeInTheDocument();
  });
});
