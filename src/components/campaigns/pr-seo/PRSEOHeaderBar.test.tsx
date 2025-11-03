// src/components/campaigns/pr-seo/PRSEOHeaderBar.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PRSEOHeaderBar } from './PRSEOHeaderBar';
import { useKeywordAnalysis } from './hooks/useKeywordAnalysis';
import { usePRScoreCalculation } from './hooks/usePRScoreCalculation';

// Mock hooks
jest.mock('./hooks/useKeywordAnalysis');
jest.mock('./hooks/usePRScoreCalculation');

describe('PRSEOHeaderBar', () => {
  const mockOnKeywordsChange = jest.fn();
  const mockAddKeyword = jest.fn();
  const mockRemoveKeyword = jest.fn();
  const mockRefreshAnalysis = jest.fn();

  const defaultKeywordMetrics = [
    {
      keyword: 'Innovation',
      density: 1.5,
      occurrences: 3,
      inHeadline: true,
      inFirstParagraph: true,
      distribution: 'gut' as const,
      semanticRelevance: 85,
      contextQuality: 80
    }
  ];

  const defaultScoreBreakdown = {
    headline: 85,
    keywords: 80,
    structure: 75,
    relevance: 70,
    concreteness: 65,
    engagement: 80,
    social: 60
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: [],
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 0,
      scoreBreakdown: {
        headline: 0,
        keywords: 0,
        structure: 0,
        relevance: 0,
        concreteness: 0,
        engagement: 0,
        social: 0
      },
      keywordScoreData: null,
      recommendations: []
    });
  });

  it('should render component title', () => {
    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText('PR-SEO Analyse')).toBeInTheDocument();
  });

  it('should render custom title when provided', () => {
    render(
      <PRSEOHeaderBar
        title="Custom Title"
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render PR-Score badge', () => {
    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 75,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: []
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText('PR-Score: 75/100')).toBeInTheDocument();
  });

  it('should show zinc badge color when no keywords and score is 0', () => {
    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const badge = screen.getByText(/PR-Score: 0\/100/).closest('span');
    expect(badge).toHaveClass('bg-zinc-600/10');
  });

  it('should show green badge color for high scores (>= 76)', () => {
    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 85,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: []
    });

    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const badge = screen.getByText(/PR-Score: 85\/100/).closest('span');
    expect(badge).toHaveClass('bg-green-500/15');
  });

  it('should show yellow badge color for medium scores (51-75)', () => {
    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 65,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: []
    });

    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const badge = screen.getByText(/PR-Score: 65\/100/).closest('span');
    expect(badge).toHaveClass('bg-yellow-400/20');
  });

  it('should show red badge color for low scores (< 51)', () => {
    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 40,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: []
    });

    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const badge = screen.getByText(/PR-Score: 40\/100/).closest('span');
    expect(badge).toHaveClass('bg-red-500/15');
  });

  it('should render KeywordInput component', () => {
    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByPlaceholderText(/keyword hinzufügen/i)).toBeInTheDocument();
  });

  it('should render keyword metrics when keywords exist', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText('Innovation')).toBeInTheDocument();
  });

  it('should show refresh button when keywords exist', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const refreshButton = screen.getByTitle('KI-Analyse aktualisieren');
    expect(refreshButton).toBeInTheDocument();
  });

  it('should not show refresh button when no keywords', () => {
    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const refreshButton = screen.queryByTitle('KI-Analyse aktualisieren');
    expect(refreshButton).not.toBeInTheDocument();
  });

  it('should call refreshAnalysis when refresh button is clicked', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const refreshButton = screen.getByTitle('KI-Analyse aktualisieren');
    fireEvent.click(refreshButton);

    expect(mockRefreshAnalysis).toHaveBeenCalledTimes(1);
  });

  it('should show spinning icon when analyzing', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: true
    });

    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const icon = container.querySelector('.animate-spin');
    expect(icon).toBeInTheDocument();
  });

  it('should disable refresh button when analyzing', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: true
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    const refreshButton = screen.getByTitle('KI-Analyse aktualisieren');
    expect(refreshButton).toBeDisabled();
  });

  it('should render ScoreBreakdownGrid when keywords exist', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 75,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: []
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText(/Headline: 85/)).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 80/)).toBeInTheDocument();
  });

  it('should show global KI analysis box when AI data available', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: [
        {
          ...defaultKeywordMetrics[0],
          targetAudience: 'B2B',
          tonality: 'Sachlich'
        }
      ],
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 75,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: {
        baseScore: 50,
        aiBonus: 30,
        totalScore: 80,
        hasAIAnalysis: true,
        breakdown: {
          keywordPosition: 15,
          keywordDistribution: 15,
          keywordVariations: 10,
          naturalFlow: 5,
          contextRelevance: 5,
          aiRelevanceBonus: 30,
          fallbackBonus: 0
        }
      },
      recommendations: []
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText(/Zielgruppe:/)).toBeInTheDocument();
    expect(screen.getByText('B2B')).toBeInTheDocument();
    expect(screen.getByText(/Tonalität:/)).toBeInTheDocument();
    expect(screen.getByText('Sachlich')).toBeInTheDocument();
  });

  it('should render recommendations list when available', () => {
    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    (usePRScoreCalculation as jest.Mock).mockReturnValue({
      prScore: 75,
      scoreBreakdown: defaultScoreBreakdown,
      keywordScoreData: null,
      recommendations: ['Empfehlung 1', 'Empfehlung 2']
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
      />
    );

    expect(screen.getByText('Empfehlungen: (2)')).toBeInTheDocument();
  });

  it('should call onSeoScoreChange callback when provided', () => {
    const mockOnSeoScoreChange = jest.fn();

    (useKeywordAnalysis as jest.Mock).mockReturnValue({
      keywordMetrics: defaultKeywordMetrics,
      addKeyword: mockAddKeyword,
      removeKeyword: mockRemoveKeyword,
      refreshAnalysis: mockRefreshAnalysis,
      isAnalyzing: false
    });

    render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={['Innovation']}
        onKeywordsChange={mockOnKeywordsChange}
        onSeoScoreChange={mockOnSeoScoreChange}
      />
    );

    expect(usePRScoreCalculation).toHaveBeenCalledWith(
      'Test content',
      '',
      ['Innovation'],
      defaultKeywordMetrics,
      mockOnSeoScoreChange
    );
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PRSEOHeaderBar
        content="Test content"
        keywords={[]}
        onKeywordsChange={mockOnKeywordsChange}
        className="custom-class"
      />
    );

    const component = container.firstChild;
    expect(component).toHaveClass('custom-class');
  });
});
