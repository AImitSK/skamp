// src/components/assistant/__tests__/ExpertModeToggle.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpertModeToggle } from '../ExpertModeToggle';

describe('ExpertModeToggle Component', () => {
  const defaultProps = {
    mode: 'standard' as const,
    onModeChange: jest.fn(),
    hasDNASynthese: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both mode buttons', () => {
      render(<ExpertModeToggle {...defaultProps} />);
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Experte')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<ExpertModeToggle {...defaultProps} />);
      expect(screen.getByText('Modus')).toBeInTheDocument();
    });

    it('should render expert button with icon', () => {
      render(<ExpertModeToggle {...defaultProps} />);
      const expertButton = screen.getByText('Experte').parentElement;
      expect(expertButton?.querySelector('svg')).toBeInTheDocument();
    });

    it('should highlight standard button when mode is standard', () => {
      render(<ExpertModeToggle {...defaultProps} mode="standard" />);
      const standardButton = screen.getByText('Standard');
      expect(standardButton).toHaveClass('bg-primary');
    });

    it('should highlight expert button when mode is expert', () => {
      render(<ExpertModeToggle {...defaultProps} mode="expert" />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).toHaveClass('bg-primary');
    });
  });

  describe('Mode Switching', () => {
    it('should call onModeChange with standard when standard button clicked', async () => {
      const user = userEvent.setup();
      render(<ExpertModeToggle {...defaultProps} mode="expert" />);

      const standardButton = screen.getByText('Standard');
      await user.click(standardButton);

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('standard');
      expect(defaultProps.onModeChange).toHaveBeenCalledTimes(1);
    });

    it('should call onModeChange with expert when expert button clicked', async () => {
      const user = userEvent.setup();
      render(<ExpertModeToggle {...defaultProps} mode="standard" />);

      const expertButton = screen.getByText('Experte');
      await user.click(expertButton);

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('expert');
      expect(defaultProps.onModeChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State (No DNA)', () => {
    it('should disable expert button when hasDNASynthese is false', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={false} />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).toBeDisabled();
    });

    it('should not disable expert button when hasDNASynthese is true', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={true} />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).not.toBeDisabled();
    });

    it('should show tooltip when expert button is disabled', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={false} />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).toHaveAttribute(
        'title',
        'Erstellen Sie zuerst eine DNA Synthese'
      );
    });

    it('should not show tooltip when expert button is enabled', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={true} />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).not.toHaveAttribute('title');
    });

    it('should apply opacity styling when expert button is disabled', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={false} />);
      const expertButton = screen.getByText('Experte');
      expect(expertButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not call onModeChange when disabled expert button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={false} />);

      const expertButton = screen.getByText('Experte');
      await user.click(expertButton);

      expect(defaultProps.onModeChange).not.toHaveBeenCalled();
    });

    it('should never disable standard button', () => {
      render(<ExpertModeToggle {...defaultProps} hasDNASynthese={false} />);
      const standardButton = screen.getByText('Standard');
      expect(standardButton).not.toBeDisabled();
    });
  });
});
