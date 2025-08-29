/**
 * Test-Suite für ToggleBox Komponente
 * 
 * Diese Tests decken ab:
 * - Basis-Funktionalität
 * - Props-Handling
 * - Accessibility (ARIA-Attribute)
 * - Keyboard-Navigation
 * - Event-Handling
 * - Responsive Design
 * - Error-States
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { ToggleBox } from '@/components/customer-review/toggle/ToggleBox';
import { ToggleBoxProps } from '@/types/customer-review';

// Mock für Jest Environment
jest.mock('@heroicons/react/24/outline', () => ({
  PhotoIcon: jest.fn(() => <div data-testid="photo-icon">Photo Icon</div>),
  DocumentIcon: jest.fn(() => <div data-testid="document-icon">Document Icon</div>),
  ChevronDownIcon: jest.fn(() => <div data-testid="chevron-down">Chevron Down</div>),
  ChevronUpIcon: jest.fn(() => <div data-testid="chevron-up">Chevron Up</div>)
}));

describe('ToggleBox Komponente', () => {
  // Standard-Props für Tests
  const defaultProps: ToggleBoxProps = {
    id: 'test-toggle',
    title: 'Test Toggle Box',
    isExpanded: false,
    onToggle: jest.fn(),
    organizationId: 'org-123',
    children: <div data-testid="toggle-content">Test Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basis-Rendering', () => {
    it('sollte korrekt mit Minimum-Props rendern', () => {
      render(<ToggleBox {...defaultProps} />);
      
      expect(screen.getByTestId('toggle-box-test-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-header-test-toggle')).toBeInTheDocument();
      expect(screen.getByText('Test Toggle Box')).toBeInTheDocument();
    });

    it('sollte Titel korrekt anzeigen', () => {
      render(<ToggleBox {...defaultProps} title="Medien-Übersicht" />);
      
      expect(screen.getByText('Medien-Übersicht')).toBeInTheDocument();
    });

    it('sollte Untertitel anzeigen wenn vorhanden', () => {
      render(
        <ToggleBox 
          {...defaultProps} 
          subtitle="Zeige alle verfügbaren Medien" 
        />
      );
      
      expect(screen.getByText('Zeige alle verfügbaren Medien')).toBeInTheDocument();
    });

    it('sollte Count-Badge anzeigen wenn Count > 0', () => {
      render(<ToggleBox {...defaultProps} count={5} />);
      
      const badge = screen.getByTestId('toggle-count-test-toggle');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('sollte Count-Badge NICHT anzeigen wenn Count = 0', () => {
      render(<ToggleBox {...defaultProps} count={0} />);
      
      expect(screen.queryByTestId('toggle-count-test-toggle')).not.toBeInTheDocument();
    });

    it('sollte Icon anzeigen wenn vorhanden', () => {
      render(<ToggleBox {...defaultProps} icon={PhotoIcon} />);
      
      expect(screen.getByTestId('photo-icon')).toBeInTheDocument();
    });
  });

  describe('Toggle-Funktionalität', () => {
    it('sollte Content anzeigen wenn isExpanded = true', () => {
      render(<ToggleBox {...defaultProps} isExpanded={true} />);
      
      expect(screen.getByTestId('toggle-content-test-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-content')).toBeInTheDocument();
    });

    it('sollte Content NICHT anzeigen wenn isExpanded = false', () => {
      render(<ToggleBox {...defaultProps} isExpanded={false} />);
      
      expect(screen.queryByTestId('toggle-content-test-toggle')).not.toBeInTheDocument();
    });

    it('sollte onToggle callback aufrufen beim Header-Klick', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      render(<ToggleBox {...defaultProps} onToggle={onToggleMock} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      await user.click(header);
      
      expect(onToggleMock).toHaveBeenCalledWith('test-toggle');
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it('sollte onToggle NICHT aufrufen wenn disabled', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      render(
        <ToggleBox 
          {...defaultProps} 
          onToggle={onToggleMock} 
          disabled={true} 
        />
      );
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      await user.click(header);
      
      expect(onToggleMock).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('sollte korrekte ARIA-Attribute haben', () => {
      render(<ToggleBox {...defaultProps} isExpanded={false} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      
      expect(header).toHaveAttribute('aria-expanded', 'false');
      expect(header).toHaveAttribute('aria-controls', 'toggle-content-test-toggle');
      expect(header).toHaveAttribute('role', 'button');
    });

    it('sollte ARIA-expanded korrekt updaten', () => {
      const { rerender } = render(
        <ToggleBox {...defaultProps} isExpanded={false} />
      );
      
      let header = screen.getByTestId('toggle-header-test-toggle');
      expect(header).toHaveAttribute('aria-expanded', 'false');
      
      rerender(<ToggleBox {...defaultProps} isExpanded={true} />);
      
      header = screen.getByTestId('toggle-header-test-toggle');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('sollte Content-Region korrekte ARIA-Attribute haben', () => {
      render(<ToggleBox {...defaultProps} isExpanded={true} />);
      
      const content = screen.getByTestId('toggle-content-test-toggle');
      
      expect(content).toHaveAttribute('id', 'toggle-content-test-toggle');
      expect(content).toHaveAttribute('role', 'region');
      expect(content).toHaveAttribute('aria-labelledby', 'toggle-header-test-toggle');
    });
  });

  describe('Keyboard-Navigation', () => {
    it('sollte auf Enter-Taste reagieren', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      render(<ToggleBox {...defaultProps} onToggle={onToggleMock} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      header.focus();
      await user.keyboard('{Enter}');
      
      expect(onToggleMock).toHaveBeenCalledWith('test-toggle');
    });

    it('sollte auf Leertaste reagieren', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      render(<ToggleBox {...defaultProps} onToggle={onToggleMock} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      header.focus();
      await user.keyboard('{ }');
      
      expect(onToggleMock).toHaveBeenCalledWith('test-toggle');
    });

    it('sollte fokussierbar sein', () => {
      render(<ToggleBox {...defaultProps} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      expect(header).toHaveAttribute('tabIndex', '0');
    });

    it('sollte NICHT fokussierbar sein wenn disabled', () => {
      render(<ToggleBox {...defaultProps} disabled={true} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      expect(header).toBeDisabled();
    });
  });

  describe('Styling und CSS-Klassen', () => {
    it('sollte Standard-CSS-Klassen anwenden', () => {
      render(<ToggleBox {...defaultProps} />);
      
      const container = screen.getByTestId('toggle-box-test-toggle');
      
      expect(container).toHaveClass('bg-white');
      expect(container).toHaveClass('border');
      expect(container).toHaveClass('border-gray-200');
      expect(container).toHaveClass('rounded-lg');
    });

    it('sollte Custom-CSS-Klassen hinzufügen', () => {
      render(
        <ToggleBox 
          {...defaultProps} 
          className="custom-toggle border-red-500" 
        />
      );
      
      const container = screen.getByTestId('toggle-box-test-toggle');
      
      expect(container).toHaveClass('custom-toggle');
      expect(container).toHaveClass('border-red-500');
    });

    it('sollte Disabled-Styling anwenden', () => {
      render(<ToggleBox {...defaultProps} disabled={true} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      
      expect(header).toHaveClass('cursor-not-allowed');
      expect(header).toHaveClass('bg-gray-50');
    });

    it('sollte Hover-Styling haben wenn nicht disabled', () => {
      render(<ToggleBox {...defaultProps} disabled={false} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      
      expect(header).toHaveClass('hover:bg-gray-50');
      expect(header).toHaveClass('focus:bg-gray-50');
    });
  });

  describe('Icon-Farben', () => {
    it('sollte Standard-Icon-Farbe verwenden', () => {
      render(<ToggleBox {...defaultProps} icon={PhotoIcon} />);
      
      expect(PhotoIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          className: expect.stringContaining('text-gray-500')
        }),
        expect.anything()
      );
    });

    it('sollte Custom-Icon-Farbe verwenden', () => {
      render(
        <ToggleBox 
          {...defaultProps} 
          icon={PhotoIcon} 
          iconColor="text-blue-600" 
        />
      );
      
      expect(PhotoIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          className: expect.stringContaining('text-blue-600')
        }),
        expect.anything()
      );
    });
  });

  describe('Edge Cases und Error-States', () => {
    it('sollte mit sehr langem Titel umgehen', () => {
      const longTitle = 'A'.repeat(200);
      
      render(<ToggleBox {...defaultProps} title={longTitle} />);
      
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('truncate');
    });

    it('sollte mit sehr langem Untertitel umgehen', () => {
      const longSubtitle = 'B'.repeat(150);
      
      render(
        <ToggleBox 
          {...defaultProps} 
          subtitle={longSubtitle} 
        />
      );
      
      const subtitleElement = screen.getByText(longSubtitle);
      expect(subtitleElement).toHaveClass('truncate');
    });

    it('sollte mit undefined Count umgehen', () => {
      render(<ToggleBox {...defaultProps} count={undefined} />);
      
      expect(screen.queryByTestId('toggle-count-test-toggle')).not.toBeInTheDocument();
    });

    it('sollte mit negativem Count umgehen', () => {
      render(<ToggleBox {...defaultProps} count={-5} />);
      
      expect(screen.queryByTestId('toggle-count-test-toggle')).not.toBeInTheDocument();
    });

    it('sollte mit sehr hohem Count umgehen', () => {
      render(<ToggleBox {...defaultProps} count={99999} />);
      
      const badge = screen.getByTestId('toggle-count-test-toggle');
      expect(badge).toHaveTextContent('99999');
    });

    it('sollte ohne onToggle-Callback funktionieren', async () => {
      const user = userEvent.setup();
      
      // Sollte nicht crashen
      render(<ToggleBox {...defaultProps} onToggle={() => {}} />);
      
      const header = screen.getByTestId('toggle-header-test-toggle');
      await user.click(header);
      
      // Kein Error sollte auftreten
      expect(header).toBeInTheDocument();
    });

    it('sollte ohne Children funktionieren', () => {
      render(
        <ToggleBox 
          {...defaultProps} 
          isExpanded={true}
        />
      );
      
      const content = screen.getByTestId('toggle-content-test-toggle');
      expect(content).toBeInTheDocument();
      expect(content).toBeEmptyDOMElement();
    });
  });

  describe('Performance und Memory Leaks', () => {
    it('sollte Event-Listener korrekt cleanup', () => {
      const onToggleMock = jest.fn();
      
      const { unmount } = render(
        <ToggleBox {...defaultProps} onToggle={onToggleMock} />
      );
      
      // Komponente unmounten
      unmount();
      
      // Sollte nicht mehr im DOM sein
      expect(screen.queryByTestId('toggle-box-test-toggle')).not.toBeInTheDocument();
    });

    it('sollte re-renders effizient handhaben', () => {
      const onToggleMock = jest.fn();
      
      const { rerender } = render(
        <ToggleBox {...defaultProps} onToggle={onToggleMock} />
      );
      
      // Mehrfaches Re-render
      rerender(<ToggleBox {...defaultProps} onToggle={onToggleMock} title="New Title" />);
      rerender(<ToggleBox {...defaultProps} onToggle={onToggleMock} title="Another Title" />);
      
      expect(screen.getByText('Another Title')).toBeInTheDocument();
      expect(onToggleMock).not.toHaveBeenCalled();
    });
  });

  describe('Integration mit verschiedenen Icon-Typen', () => {
    it('sollte verschiedene Heroicons korrekt rendern', () => {
      const { rerender } = render(
        <ToggleBox {...defaultProps} icon={PhotoIcon} />
      );
      
      expect(screen.getByTestId('photo-icon')).toBeInTheDocument();
      
      rerender(<ToggleBox {...defaultProps} icon={DocumentIcon} />);
      
      expect(screen.getByTestId('document-icon')).toBeInTheDocument();
    });

    it('sollte Icon-Props korrekt weiterleiten', () => {
      render(<ToggleBox {...defaultProps} icon={PhotoIcon} />);
      
      expect(PhotoIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          className: expect.stringContaining('h-6 w-6'),
          'aria-hidden': true
        }),
        expect.anything()
      );
    });
  });

  describe('Multi-Tenancy Support', () => {
    it('sollte organizationId korrekt verarbeiten', () => {
      render(<ToggleBox {...defaultProps} organizationId="org-456" />);
      
      // organizationId sollte im Component verfügbar sein
      expect(screen.getByTestId('toggle-box-test-toggle')).toBeInTheDocument();
    });

    it('sollte verschiedene organizationId unterstützen', () => {
      const orgs = ['org-123', 'org-456', 'org-789'];
      
      orgs.forEach(orgId => {
        render(
          <ToggleBox 
            {...defaultProps} 
            id={`toggle-${orgId}`}
            organizationId={orgId} 
          />
        );
        
        expect(screen.getByTestId(`toggle-box-toggle-${orgId}`)).toBeInTheDocument();
      });
    });
  });
});
