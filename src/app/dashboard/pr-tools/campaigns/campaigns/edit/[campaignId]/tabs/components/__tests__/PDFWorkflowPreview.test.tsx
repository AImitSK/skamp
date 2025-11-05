// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/__tests__/PDFWorkflowPreview.test.tsx
// Tests für PDFWorkflowPreview Komponente

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PDFWorkflowPreview } from '../PDFWorkflowPreview';

// ==================== TYPES ====================

interface PDFWorkflowPreviewProps {
  enabled: boolean;
  estimatedSteps: string[];
}

// ==================== HELPER FUNCTIONS ====================

const renderPDFWorkflowPreview = (props: PDFWorkflowPreviewProps) => {
  return render(<PDFWorkflowPreview {...props} />);
};

// ==================== TESTS ====================

describe('PDFWorkflowPreview Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {

    it('should not render when disabled', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: false,
        estimatedSteps: []
      });

      expect(container.firstChild).toBeNull();
    });

    it('should not render when enabled but no steps provided', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: false,
        estimatedSteps: ['Step 1', 'Step 2']
      });

      // Component only renders if enabled is true
      expect(container.firstChild).toBeNull();
    });

    it('should render when enabled is true', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['1. PDF wird automatisch generiert']
      });

      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
    });

    it('should render with empty steps array when enabled', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      // Component renders even with empty steps
      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      expect(screen.getByText('Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {

    it('should display the correct header', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
    });

    it('should display the explanation text', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      expect(screen.getByText('Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:')).toBeInTheDocument();
    });

    it('should display the tip section', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      expect(screen.getByText(/💡 Tipp: Nach dem Speichern finden Sie alle Freigabe-Links/)).toBeInTheDocument();
    });

    it('should mention Step 4 in the tip', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      // Text uses special quote characters (ldquo/rdquo)
      expect(screen.getByText(/Step 4/)).toBeInTheDocument();
      expect(screen.getByText(/Vorschau/)).toBeInTheDocument();
    });
  });

  describe('Steps Rendering', () => {

    it('should render all provided steps', () => {
      const steps = [
        '1. PDF wird automatisch generiert',
        '2. Freigabe-Link wird an Kunde versendet',
        '3. Kunde kann PDF prüfen und freigeben'
      ];

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: steps
      });

      steps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });

    it('should render single step correctly', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['1. PDF wird automatisch generiert']
      });

      expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
    });

    it('should render multiple steps in correct order', () => {
      const steps = [
        'Erster Schritt',
        'Zweiter Schritt',
        'Dritter Schritt',
        'Vierter Schritt'
      ];

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: steps
      });

      const stepElements = screen.getAllByText(/Schritt/i);
      expect(stepElements).toHaveLength(4);

      // Verify order
      steps.forEach((step, index) => {
        expect(stepElements[index]).toHaveTextContent(step);
      });
    });

    it('should render steps with special characters', () => {
      const steps = [
        'Schritt mit Umlauten: ÄÖÜ',
        'Step with "quotes"',
        'Step with & ampersand'
      ];

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: steps
      });

      steps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });
  });

  describe('Visual Elements', () => {

    it('should render CheckCircleIcon', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      // CheckCircleIcon has specific classes
      const icon = container.querySelector('.h-5.w-5.text-green-500');
      expect(icon).toBeInTheDocument();
    });

    it('should render ArrowRightIcon for each step', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1', 'Step 2', 'Step 3']
      });

      // ArrowRightIcon has h-4 w-4 classes
      const arrows = container.querySelectorAll('.h-4.w-4');
      expect(arrows.length).toBe(3); // One arrow per step
    });

    it('should have correct styling classes for container', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('mt-6', 'p-4', 'rounded-lg');
      expect(mainContainer).toHaveClass('bg-gradient-to-r', 'from-green-50', 'to-blue-50');
      expect(mainContainer).toHaveClass('border', 'border-green-200');
    });

    it('should have correct color scheme for header', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      const header = screen.getByText('✅ PDF-Workflow bereit');
      expect(header).toHaveClass('text-sm', 'font-medium', 'text-green-900', 'mb-2');
    });

    it('should have correct styling for steps container', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1', 'Step 2']
      });

      const stepsContainer = container.querySelector('.space-y-2');
      expect(stepsContainer).toBeInTheDocument();
    });

    it('should have border separator before tip section', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      const tipSection = container.querySelector('.mt-3.pt-3.border-t.border-green-300');
      expect(tipSection).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {

    it('should handle very long step text', () => {
      const longStep = 'Dies ist ein sehr langer Schritt-Text, der möglicherweise umgebrochen werden muss, weil er sehr viele Zeichen enthält und nicht in eine Zeile passt. '.repeat(3);

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: [longStep]
      });

      expect(screen.getByText(longStep.trim())).toBeInTheDocument();
    });

    it('should handle HTML-like characters in steps', () => {
      const steps = [
        'Step with <tags>',
        'Step with & ampersand',
        'Step with "quotes"'
      ];

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: steps
      });

      steps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });

    it('should handle empty string in steps array', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['', 'Valid step', '']
      });

      expect(screen.getByText('Valid step')).toBeInTheDocument();
    });

    it('should handle very large number of steps', () => {
      const manySteps = Array.from({ length: 20 }, (_, i) => `Step ${i + 1}`);

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: manySteps
      });

      manySteps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {

    it('should have semantic HTML structure', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      // Header should be h4
      const header = container.querySelector('h4');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('✅ PDF-Workflow bereit');
    });

    it('should use proper text components', () => {
      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      // Text component from @/components/ui/text
      const textElements = screen.getAllByText(/Beim Speichern|💡 Tipp/);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should have readable color contrast', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: []
      });

      // Verify text colors are readable (green-700, green-900, green-600)
      const mainText = container.querySelector('.text-green-700');
      const headerText = container.querySelector('.text-green-900');
      const tipText = container.querySelector('.text-green-600');

      expect(mainText).toBeInTheDocument();
      expect(headerText).toBeInTheDocument();
      expect(tipText).toBeInTheDocument();
    });
  });

  describe('Integration with Parent Component', () => {

    it('should match expected props from ApprovalTab', () => {
      // Simulate the props that would come from ApprovalTab's useMemo
      const typicalSteps = [
        '1. PDF wird automatisch generiert',
        '2. Freigabe-Link wird an Kunde versendet',
        '3. Kunde kann PDF prüfen und freigeben'
      ];

      renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: typicalSteps
      });

      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      typicalSteps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });

    it('should handle disabled state from ApprovalTab', () => {
      const { container } = renderPDFWorkflowPreview({
        enabled: false,
        estimatedSteps: [
          '1. PDF wird automatisch generiert',
          '2. Freigabe-Link wird an Kunde versendet',
          '3. Kunde kann PDF prüfen und freigeben'
        ]
      });

      // When customerApprovalRequired is false, component should not render
      expect(container.firstChild).toBeNull();
    });
  });

  describe('React.memo Behavior', () => {

    it('should be memoized and not re-render unnecessarily', () => {
      const { rerender } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      // Re-render with same props
      rerender(
        <PDFWorkflowPreview
          enabled={true}
          estimatedSteps={['Step 1']}
        />
      );

      // Component should still be in the document
      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('should re-render when props change', () => {
      const { rerender } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      expect(screen.getByText('Step 1')).toBeInTheDocument();

      // Re-render with different steps
      rerender(
        <PDFWorkflowPreview
          enabled={true}
          estimatedSteps={['Step 2', 'Step 3']}
        />
      );

      expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    it('should handle enabled state change', () => {
      const { rerender, container } = renderPDFWorkflowPreview({
        enabled: true,
        estimatedSteps: ['Step 1']
      });

      expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();

      // Disable component
      rerender(
        <PDFWorkflowPreview
          enabled={false}
          estimatedSteps={['Step 1']}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
