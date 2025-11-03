// src/components/campaigns/pr-seo/components/RecommendationsList.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationsList } from './RecommendationsList';

describe('RecommendationsList', () => {
  it('should render nothing when recommendations is empty', () => {
    const { container } = render(<RecommendationsList recommendations={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render recommendations header with count', () => {
    const recommendations = ['Empfehlung 1', 'Empfehlung 2'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText('Empfehlungen: (2)')).toBeInTheDocument();
  });

  it('should render first 3 recommendations by default', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3', 'Emp 4', 'Emp 5'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText('• Emp 1')).toBeInTheDocument();
    expect(screen.getByText('• Emp 2')).toBeInTheDocument();
    expect(screen.getByText('• Emp 3')).toBeInTheDocument();
    expect(screen.queryByText('• Emp 4')).not.toBeInTheDocument();
    expect(screen.queryByText('• Emp 5')).not.toBeInTheDocument();
  });

  it('should show expand button when more than 3 recommendations', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3', 'Emp 4'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText(/1 weitere anzeigen/)).toBeInTheDocument();
  });

  it('should not show expand button when 3 or fewer recommendations', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.queryByText(/weitere anzeigen/)).not.toBeInTheDocument();
  });

  it('should expand to show all recommendations when expand button is clicked', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3', 'Emp 4', 'Emp 5'];
    render(<RecommendationsList recommendations={recommendations} />);

    const expandButton = screen.getByText(/2 weitere anzeigen/);
    fireEvent.click(expandButton);

    expect(screen.getByText('• Emp 4')).toBeInTheDocument();
    expect(screen.getByText('• Emp 5')).toBeInTheDocument();
  });

  it('should show collapse button after expanding', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3', 'Emp 4'];
    render(<RecommendationsList recommendations={recommendations} />);

    const expandButton = screen.getByText(/1 weitere anzeigen/);
    fireEvent.click(expandButton);

    expect(screen.getByText(/weniger anzeigen/)).toBeInTheDocument();
  });

  it('should collapse when collapse button is clicked', () => {
    const recommendations = ['Emp 1', 'Emp 2', 'Emp 3', 'Emp 4', 'Emp 5'];
    render(<RecommendationsList recommendations={recommendations} />);

    const expandButton = screen.getByText(/2 weitere anzeigen/);
    fireEvent.click(expandButton);

    const collapseButton = screen.getByText(/weniger anzeigen/);
    fireEvent.click(collapseButton);

    expect(screen.queryByText('• Emp 4')).not.toBeInTheDocument();
    expect(screen.queryByText('• Emp 5')).not.toBeInTheDocument();
  });

  it('should strip [KI] prefix from recommendation text', () => {
    const recommendations = ['[KI] Empfehlung mit KI'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText('• Empfehlung mit KI')).toBeInTheDocument();
    expect(screen.queryByText('[KI]')).not.toBeInTheDocument();
  });

  it('should show KI badge for recommendations starting with [KI]', () => {
    const recommendations = ['[KI] Empfehlung mit KI'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText('KI')).toBeInTheDocument();
  });

  it('should not show KI badge for regular recommendations', () => {
    const recommendations = ['Normale Empfehlung'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.queryByText('KI')).not.toBeInTheDocument();
  });

  it('should calculate correct count for expand button', () => {
    const recommendations = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];
    render(<RecommendationsList recommendations={recommendations} />);

    expect(screen.getByText('4 weitere anzeigen')).toBeInTheDocument();
  });

  it('should prevent event bubbling on button click', () => {
    const parentClickHandler = jest.fn();
    const recommendations = ['E1', 'E2', 'E3', 'E4'];

    const { container } = render(
      <div onClick={parentClickHandler}>
        <RecommendationsList recommendations={recommendations} />
      </div>
    );

    const expandButton = screen.getByText(/1 weitere anzeigen/);
    fireEvent.click(expandButton);

    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
