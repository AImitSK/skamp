// src/components/projects/creation/steps/__tests__/ClientStep.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientStep from '../ClientStep';
import { ProjectCreationFormData } from '../types';

// Mock ClientSelector
jest.mock('../../ClientSelector', () => ({
  ClientSelector: ({ selectedClientId, onSelect }: any) => (
    <div data-testid="client-selector">
      <select
        aria-label="Kunde auswählen"
        value={selectedClientId}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">-- Bitte wählen --</option>
        <option value="client-1">Test Client 1</option>
        <option value="client-2">Test Client 2</option>
      </select>
    </div>
  )
}));

describe('ClientStep', () => {
  const mockUpdate = jest.fn();

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

  const mockCreationOptions = {
    availableClients: [
      { id: 'client-1', name: 'Test Client 1', type: 'customer', contactCount: 0 },
      { id: 'client-2', name: 'Test Client 2', type: 'publisher', contactCount: 0 }
    ],
    availableTeamMembers: [],
    availableTemplates: [],
    availableDistributionLists: [],
    availableAssets: []
  };

  const defaultProps = {
    formData: defaultFormData,
    onUpdate: mockUpdate,
    creationOptions: mockCreationOptions
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte ClientSelector rendern', () => {
    render(<ClientStep {...defaultProps} />);

    expect(screen.getByTestId('client-selector')).toBeInTheDocument();
    expect(screen.getByLabelText(/Kunde auswählen/i)).toBeInTheDocument();
  });

  it('sollte Client-Auswahl propagieren', async () => {
    const user = userEvent.setup();
    render(<ClientStep {...defaultProps} />);

    const clientSelect = screen.getByLabelText(/Kunde auswählen/i);
    await user.selectOptions(clientSelect, 'client-1');

    expect(mockUpdate).toHaveBeenCalledWith({ clientId: 'client-1' });
  });

  it('sollte vorausgewählten Client anzeigen', () => {
    const formDataWithClient = { ...defaultFormData, clientId: 'client-2' };
    render(<ClientStep {...defaultProps} formData={formDataWithClient} />);

    const clientSelect = screen.getByLabelText(/Kunde auswählen/i) as HTMLSelectElement;
    expect(clientSelect.value).toBe('client-2');
  });

  it('sollte leeren Wert anzeigen wenn kein Client gewählt', () => {
    render(<ClientStep {...defaultProps} />);

    const clientSelect = screen.getByLabelText(/Kunde auswählen/i) as HTMLSelectElement;
    expect(clientSelect.value).toBe('');
  });

  it('sollte mit null creationOptions umgehen', () => {
    render(<ClientStep {...defaultProps} creationOptions={null} />);

    expect(screen.getByTestId('client-selector')).toBeInTheDocument();
  });
});
