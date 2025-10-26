// src/components/projects/distribution/components/__tests__/ListStatsBar.test.tsx

import { render, screen } from '@testing-library/react';
import ListStatsBar from '../ListStatsBar';

describe('ListStatsBar', () => {
  it('should render filtered count and total count with default label', () => {
    render(<ListStatsBar filteredCount={5} totalCount={10} />);

    expect(screen.getByText('5 von 10 Listen')).toBeInTheDocument();
  });

  it('should render with custom item label', () => {
    render(<ListStatsBar filteredCount={3} totalCount={7} itemLabel="Kontakte" />);

    expect(screen.getByText('3 von 7 Kontakte')).toBeInTheDocument();
  });

  it('should render correctly when filtered count equals total count', () => {
    render(<ListStatsBar filteredCount={10} totalCount={10} />);

    expect(screen.getByText('10 von 10 Listen')).toBeInTheDocument();
  });

  it('should render correctly when filtered count is zero', () => {
    render(<ListStatsBar filteredCount={0} totalCount={10} />);

    expect(screen.getByText('0 von 10 Listen')).toBeInTheDocument();
  });

  it('should render correctly when both counts are zero', () => {
    render(<ListStatsBar filteredCount={0} totalCount={0} />);

    expect(screen.getByText('0 von 0 Listen')).toBeInTheDocument();
  });
});
