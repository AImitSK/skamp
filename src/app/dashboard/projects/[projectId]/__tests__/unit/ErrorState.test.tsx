// src/app/dashboard/projects/[projectId]/__tests__/unit/ErrorState.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorState } from '../../components/shared/ErrorState';

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ErrorState', () => {
  it('should render default error message', () => {
    render(<ErrorState />);

    expect(screen.getByText('Projekt nicht gefunden')).toBeInTheDocument();
  });

  it('should render custom error message', () => {
    render(<ErrorState message="Fehler beim Laden der Daten" />);

    expect(screen.getByText('Fehler beim Laden der Daten')).toBeInTheDocument();
    expect(screen.queryByText('Projekt nicht gefunden')).not.toBeInTheDocument();
  });

  it('should render back button with correct link', () => {
    render(<ErrorState />);

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/dashboard/projects');
    expect(screen.getByText('Zurück zur Projektübersicht')).toBeInTheDocument();
  });

  it('should render error icon', () => {
    const { container } = render(<ErrorState />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-12');
    expect(icon).toHaveClass('w-12');
  });

  it('should center content', () => {
    const { container } = render(<ErrorState />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('text-center');
    expect(wrapper).toHaveClass('py-12');
  });
});
