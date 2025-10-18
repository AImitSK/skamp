import { render, screen } from '@testing-library/react';
import NoActiveProjectsState from '../NoActiveProjectsState';
import NoArchivedProjectsState from '../NoArchivedProjectsState';
import NoFiltersSelectedState from '../NoFiltersSelectedState';
import NoProjectsAtAllState from '../NoProjectsAtAllState';

describe('Empty State Components', () => {
  describe('NoActiveProjectsState', () => {
    it('should render without errors', () => {
      render(<NoActiveProjectsState />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should display correct heading', () => {
      render(<NoActiveProjectsState />);
      expect(screen.getByRole('heading')).toHaveTextContent('Keine aktiven Projekte');
    });

    it('should display correct message', () => {
      render(<NoActiveProjectsState />);
      expect(screen.getByText(/Erstelle dein erstes Projekt oder aktiviere den Archiv-Filter/i)).toBeInTheDocument();
    });

    it('should have correct container styling', () => {
      const { container } = render(<NoActiveProjectsState />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'p-8', 'text-center');
    });

    it('should render RocketLaunchIcon', () => {
      const { container } = render(<NoActiveProjectsState />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('mx-auto', 'h-12', 'w-12', 'text-zinc-400');
    });
  });

  describe('NoArchivedProjectsState', () => {
    it('should render without errors', () => {
      render(<NoArchivedProjectsState />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should display correct heading', () => {
      render(<NoArchivedProjectsState />);
      expect(screen.getByRole('heading')).toHaveTextContent('Keine archivierten Projekte');
    });

    it('should display correct message', () => {
      render(<NoArchivedProjectsState />);
      expect(screen.getByText(/Archivierte Projekte werden hier angezeigt/i)).toBeInTheDocument();
    });

    it('should have correct container styling', () => {
      const { container } = render(<NoArchivedProjectsState />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'p-8', 'text-center');
    });

    it('should render FolderIcon', () => {
      const { container } = render(<NoArchivedProjectsState />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('mx-auto', 'h-12', 'w-12', 'text-zinc-400');
    });
  });

  describe('NoFiltersSelectedState', () => {
    it('should render without errors', () => {
      render(<NoFiltersSelectedState />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should display correct heading', () => {
      render(<NoFiltersSelectedState />);
      expect(screen.getByRole('heading')).toHaveTextContent('Keine Filter ausgewählt');
    });

    it('should display correct message', () => {
      render(<NoFiltersSelectedState />);
      expect(screen.getByText(/Wähle "Aktiv" oder "Archiv" im Filter-Menü aus/i)).toBeInTheDocument();
    });

    it('should have correct container styling', () => {
      const { container } = render(<NoFiltersSelectedState />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'p-8', 'text-center');
    });

    it('should render FunnelIcon', () => {
      const { container } = render(<NoFiltersSelectedState />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('mx-auto', 'h-12', 'w-12', 'text-zinc-400');
    });
  });

  describe('NoProjectsAtAllState', () => {
    it('should render without errors', () => {
      render(<NoProjectsAtAllState />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should display correct heading', () => {
      render(<NoProjectsAtAllState />);
      expect(screen.getByRole('heading')).toHaveTextContent('Keine Projekte vorhanden');
    });

    it('should display correct message', () => {
      render(<NoProjectsAtAllState />);
      expect(screen.getByText(/Erstelle dein erstes Projekt mit dem Wizard/i)).toBeInTheDocument();
    });

    it('should have correct container styling', () => {
      const { container } = render(<NoProjectsAtAllState />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'p-8', 'text-center');
    });

    it('should render FolderIcon', () => {
      const { container } = render(<NoProjectsAtAllState />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('mx-auto', 'h-12', 'w-12', 'text-zinc-400');
    });
  });

  describe('Consistency Tests', () => {
    it('all empty states should use same container styles', () => {
      const { container: container1 } = render(<NoActiveProjectsState />);
      const { container: container2 } = render(<NoArchivedProjectsState />);
      const { container: container3 } = render(<NoFiltersSelectedState />);
      const { container: container4 } = render(<NoProjectsAtAllState />);

      const classes = ['bg-white', 'rounded-lg', 'shadow-sm', 'p-8', 'text-center'];

      [container1, container2, container3, container4].forEach(container => {
        const mainDiv = container.firstChild as HTMLElement;
        classes.forEach(cls => {
          expect(mainDiv).toHaveClass(cls);
        });
      });
    });

    it('all empty states should use same icon styles', () => {
      const { container: container1 } = render(<NoActiveProjectsState />);
      const { container: container2 } = render(<NoArchivedProjectsState />);
      const { container: container3 } = render(<NoFiltersSelectedState />);
      const { container: container4 } = render(<NoProjectsAtAllState />);

      const iconClasses = ['mx-auto', 'h-12', 'w-12', 'text-zinc-400'];

      [container1, container2, container3, container4].forEach(container => {
        const svg = container.querySelector('svg');
        iconClasses.forEach(cls => {
          expect(svg).toHaveClass(cls);
        });
      });
    });

    it('all empty states should have heading and message', () => {
      const components = [
        <NoActiveProjectsState key="1" />,
        <NoArchivedProjectsState key="2" />,
        <NoFiltersSelectedState key="3" />,
        <NoProjectsAtAllState key="4" />,
      ];

      components.forEach(component => {
        const { container } = render(component);

        // Should have exactly one h3 heading
        const headings = container.querySelectorAll('h3');
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveClass('mt-2', 'text-sm', 'font-medium', 'text-zinc-900');

        // Should have exactly one p message
        const messages = container.querySelectorAll('p');
        expect(messages).toHaveLength(1);
        expect(messages[0]).toHaveClass('mt-1', 'text-sm', 'text-zinc-500');
      });
    });
  });
});
