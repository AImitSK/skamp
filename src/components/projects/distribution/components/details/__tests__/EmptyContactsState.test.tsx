// src/components/projects/distribution/components/details/__tests__/EmptyContactsState.test.tsx

import { render, screen } from '@testing-library/react';
import EmptyContactsState from '../EmptyContactsState';

describe('EmptyContactsState', () => {
  it('should render dynamic list message when listType is dynamic', () => {
    render(<EmptyContactsState listType="dynamic" />);

    expect(screen.getByText('Keine Kontakte entsprechen den Filtern.')).toBeInTheDocument();
  });

  it('should render static list message when listType is static', () => {
    render(<EmptyContactsState listType="static" />);

    expect(screen.getByText('Noch keine Kontakte ausgewählt.')).toBeInTheDocument();
  });

  it('should render UsersIcon', () => {
    const { container } = render(<EmptyContactsState listType="dynamic" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-gray-300');
  });
});
