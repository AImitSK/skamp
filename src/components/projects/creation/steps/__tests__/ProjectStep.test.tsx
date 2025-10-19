// src/components/projects/creation/steps/__tests__/ProjectStep.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectStep from '../ProjectStep';
import { ProjectCreationFormData } from '../types';

// Mock SimpleSwitch
jest.mock('@/components/notifications/SimpleSwitch', () => ({
  SimpleSwitch: ({ checked, onChange }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      data-testid="simple-switch"
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  )
}));

// Mock TagInput
jest.mock('@/components/ui/tag-input', () => ({
  TagInput: ({ selectedTagIds, onChange }: any) => (
    <div data-testid="tag-input">
      <button onClick={() => onChange([...selectedTagIds, 'new-tag'])}>
        Add Tag
      </button>
    </div>
  )
}));

describe('ProjectStep', () => {
  const mockUpdate = jest.fn();
  const mockCreateTag = jest.fn();

  const defaultFormData: ProjectCreationFormData = {
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    createCampaignImmediately: true,
    clientId: '',
    assignedTeamMembers: [],
    projectManager: ''
  };

  const defaultProps = {
    formData: defaultFormData,
    onUpdate: mockUpdate,
    creationOptions: null,
    tags: [],
    onCreateTag: mockCreateTag
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte alle Felder rendern', () => {
    render(<ProjectStep {...defaultProps} />);

    expect(screen.getByLabelText(/Projekt-Titel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Beschreibung/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priorität/i)).toBeInTheDocument();
    expect(screen.getByText(/PR-Kampagne erstellen/i)).toBeInTheDocument();
  });

  it('sollte SimpleSwitch default ON haben', () => {
    render(<ProjectStep {...defaultProps} />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
    expect(switchButton).toHaveTextContent('ON');
  });

  it('sollte Titel-Änderungen propagieren', async () => {
    const user = userEvent.setup();
    render(<ProjectStep {...defaultProps} />);

    const titleInput = screen.getByLabelText(/Projekt-Titel/i);
    await user.type(titleInput, 'Test Projekt');

    // userEvent.type() calls onChange for each character
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls.length).toBeGreaterThan(0);
  });

  it('sollte Beschreibung-Änderungen propagieren', async () => {
    const user = userEvent.setup();
    render(<ProjectStep {...defaultProps} />);

    const descInput = screen.getByLabelText(/Beschreibung/i);
    await user.type(descInput, 'Test Beschreibung');

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('sollte Priorität-Änderungen propagieren', async () => {
    const user = userEvent.setup();
    render(<ProjectStep {...defaultProps} />);

    const prioritySelect = screen.getByLabelText(/Priorität/i);
    await user.selectOptions(prioritySelect, 'high');

    expect(mockUpdate).toHaveBeenCalledWith({ priority: 'high' });
  });

  it('sollte SimpleSwitch Toggle propagieren', async () => {
    const user = userEvent.setup();
    render(<ProjectStep {...defaultProps} />);

    const switchButton = screen.getByRole('switch');
    await user.click(switchButton);

    expect(mockUpdate).toHaveBeenCalledWith({ createCampaignImmediately: false });
  });

  it('sollte Titel mit vorausgefülltem Wert anzeigen', () => {
    const formDataWithTitle = { ...defaultFormData, title: 'Vorhandener Titel' };
    render(<ProjectStep {...defaultProps} formData={formDataWithTitle} />);

    const titleInput = screen.getByLabelText(/Projekt-Titel/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Vorhandener Titel');
  });

  it('sollte SimpleSwitch OFF anzeigen wenn createCampaignImmediately false', () => {
    const formDataOff = { ...defaultFormData, createCampaignImmediately: false };
    render(<ProjectStep {...defaultProps} formData={formDataOff} />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    expect(switchButton).toHaveTextContent('OFF');
  });

  it('sollte Placeholder-Text im Titel-Input haben', () => {
    render(<ProjectStep {...defaultProps} />);

    const titleInput = screen.getByLabelText(/Projekt-Titel/i);
    expect(titleInput).toHaveAttribute('placeholder', expect.stringContaining('z.B.'));
  });

  it('sollte TagInput rendern', () => {
    render(<ProjectStep {...defaultProps} />);

    expect(screen.getByTestId('tag-input')).toBeInTheDocument();
  });

  it('sollte alle Prioritäts-Optionen haben', () => {
    render(<ProjectStep {...defaultProps} />);

    const prioritySelect = screen.getByLabelText(/Priorität/i);
    expect(prioritySelect).toHaveTextContent(/Niedrig/);
    expect(prioritySelect).toHaveTextContent(/Mittel/);
    expect(prioritySelect).toHaveTextContent(/Hoch/);
    expect(prioritySelect).toHaveTextContent(/Dringend/);
  });
});
