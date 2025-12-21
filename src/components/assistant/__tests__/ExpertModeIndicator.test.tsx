// src/components/assistant/__tests__/ExpertModeIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpertModeIndicator } from '../ExpertModeIndicator';

describe('ExpertModeIndicator Component', () => {
  describe('Rendering', () => {
    it('should render the expert mode active header', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={true} />
      );
      expect(screen.getByText('Experten-Modus aktiv')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={true} />
      );
      const header = screen.getByText('Experten-Modus aktiv').parentElement;
      expect(header?.querySelector('svg')).toBeInTheDocument();
    });

    it('should have purple styling', () => {
      const { container } = render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={true} />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-purple-50', 'border-purple-200');
    });
  });

  describe('DNA Synthese Display', () => {
    it('should show DNA Synthese when hasDNASynthese is true', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={false} />
      );
      expect(
        screen.getByText('DNA Synthese wird verwendet')
      ).toBeInTheDocument();
    });

    it('should not show DNA Synthese when hasDNASynthese is false', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={false} hasKernbotschaft={true} />
      );
      expect(
        screen.queryByText('DNA Synthese wird verwendet')
      ).not.toBeInTheDocument();
    });

    it('should show DNA Synthese with check icon', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={false} />
      );
      const dnaItem = screen
        .getByText('DNA Synthese wird verwendet')
        .closest('li');
      expect(dnaItem?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Kernbotschaft Display', () => {
    it('should show Kernbotschaft when hasKernbotschaft is true', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={false} hasKernbotschaft={true} />
      );
      expect(
        screen.getByText('Kernbotschaft wird verwendet')
      ).toBeInTheDocument();
    });

    it('should not show Kernbotschaft when hasKernbotschaft is false', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={false} />
      );
      expect(
        screen.queryByText('Kernbotschaft wird verwendet')
      ).not.toBeInTheDocument();
    });

    it('should show Kernbotschaft with check icon', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={false} hasKernbotschaft={true} />
      );
      const kernItem = screen
        .getByText('Kernbotschaft wird verwendet')
        .closest('li');
      expect(kernItem?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Combined Data Display', () => {
    it('should show both when both are true', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={true} />
      );
      expect(
        screen.getByText('DNA Synthese wird verwendet')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Kernbotschaft wird verwendet')
      ).toBeInTheDocument();
    });

    it('should show neither when both are false', () => {
      const { container } = render(
        <ExpertModeIndicator hasDNASynthese={false} hasKernbotschaft={false} />
      );
      const list = container.querySelector('ul');
      expect(list?.children).toHaveLength(0);
    });

    it('should show only DNA Synthese when only DNA is true', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={true} hasKernbotschaft={false} />
      );
      expect(
        screen.getByText('DNA Synthese wird verwendet')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Kernbotschaft wird verwendet')
      ).not.toBeInTheDocument();
    });

    it('should show only Kernbotschaft when only Kernbotschaft is true', () => {
      render(
        <ExpertModeIndicator hasDNASynthese={false} hasKernbotschaft={true} />
      );
      expect(
        screen.queryByText('DNA Synthese wird verwendet')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Kernbotschaft wird verwendet')
      ).toBeInTheDocument();
    });
  });
});
