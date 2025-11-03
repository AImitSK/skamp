// src/components/pr/ai/structured-generation/components/__tests__/ErrorBanner.test.tsx
/**
 * Tests für ErrorBanner Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBanner from '../ErrorBanner';

describe('ErrorBanner', () => {
  describe('Rendering', () => {
    it('sollte Fehlermeldung anzeigen', () => {
      render(<ErrorBanner error="Test Fehler" />);

      expect(screen.getByText('Test Fehler')).toBeInTheDocument();
    });

    it('sollte Icon anzeigen', () => {
      const { container } = render(<ErrorBanner error="Fehler" />);

      // ExclamationTriangleIcon hat Klasse h-5 w-5
      const icon = container.querySelector('.h-5.w-5.text-red-600');
      expect(icon).toBeInTheDocument();
    });

    it('sollte roten Hintergrund haben', () => {
      const { container } = render(<ErrorBanner error="Fehler" />);

      const banner = container.querySelector('.bg-red-50.border-red-200');
      expect(banner).toBeInTheDocument();
    });

    it('sollte Shake-Animation haben', () => {
      const { container } = render(<ErrorBanner error="Fehler" />);

      const banner = container.querySelector('.animate-shake');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Null/Empty States', () => {
    it('sollte nichts rendern wenn error=null', () => {
      const { container } = render(<ErrorBanner error={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('sollte nichts rendern wenn error leerer String ist', () => {
      const { container } = render(<ErrorBanner error="" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Lange Fehlermeldungen', () => {
    it('sollte lange Fehler vollständig anzeigen', () => {
      const longError = 'Dies ist eine sehr lange Fehlermeldung die mehrere Zeilen umfassen könnte und trotzdem vollständig angezeigt werden sollte.';

      render(<ErrorBanner error={longError} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });
});
