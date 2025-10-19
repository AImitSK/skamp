// src/components/projects/creation/steps/__tests__/TeamStep.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamStep from '../TeamStep';
import { ProjectCreationFormData } from '../types';

// Mock useAuth
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-123' }
  })
}));

// Mock TeamMemberMultiSelect
jest.mock('../../TeamMemberMultiSelect', () => ({
  TeamMemberMultiSelect: ({ teamMembers, selectedMembers, onSelectionChange }: any) => (
    <div data-testid="team-member-multi-select">
      {teamMembers.map((member: any) => (
        <label key={member.id}>
          <input
            type="checkbox"
            checked={selectedMembers.includes(member.id)}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange([...selectedMembers, member.id]);
              } else {
                onSelectionChange(selectedMembers.filter((id: string) => id !== member.id));
              }
            }}
          />
          {member.displayName}
        </label>
      ))}
    </div>
  )
}));

describe('TeamStep', () => {
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

  const mockTeamMembers = [
    { id: 'member-1', displayName: 'Test User 1', role: 'Admin', userId: 'user-1' },
    { id: 'member-2', displayName: 'Test User 2', role: 'Editor', userId: 'user-2' },
    { id: 'member-3', displayName: 'Test User 3', role: 'Viewer', userId: 'user-3' }
  ];

  const mockCreationOptions = {
    availableClients: [],
    availableTeamMembers: mockTeamMembers,
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

  it('sollte TeamMemberMultiSelect rendern', () => {
    render(<TeamStep {...defaultProps} />);

    expect(screen.getByTestId('team-member-multi-select')).toBeInTheDocument();
  });

  it('sollte alle verfügbaren Team-Mitglieder anzeigen', () => {
    render(<TeamStep {...defaultProps} />);

    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText('Test User 2')).toBeInTheDocument();
    expect(screen.getByText('Test User 3')).toBeInTheDocument();
  });

  it('sollte Team-Mitglieder-Auswahl propagieren', async () => {
    const user = userEvent.setup();
    render(<TeamStep {...defaultProps} />);

    const checkbox = screen.getByLabelText('Test User 1');
    await user.click(checkbox);

    expect(mockUpdate).toHaveBeenCalledWith({ assignedTeamMembers: ['member-1'] });
  });

  it('sollte Projekt-Manager Dropdown immer anzeigen', () => {
    render(<TeamStep {...defaultProps} />);

    expect(screen.getByLabelText(/Projekt-Manager/i)).toBeInTheDocument();
  });

  it('sollte alle verfügbaren Team-Mitglieder im Projekt-Manager Dropdown zeigen', () => {
    render(<TeamStep {...defaultProps} />);

    const pmSelect = screen.getByLabelText(/Projekt-Manager/i);
    expect(pmSelect).toHaveTextContent('Test User 1');
    expect(pmSelect).toHaveTextContent('Test User 2');
    expect(pmSelect).toHaveTextContent('Test User 3');
  });

  it('sollte Projekt-Manager Auswahl propagieren', async () => {
    const user = userEvent.setup();
    const formDataWithTeam = {
      ...defaultFormData,
      assignedTeamMembers: ['member-1', 'member-2']
    };

    render(<TeamStep {...defaultProps} formData={formDataWithTeam} />);

    const pmSelect = screen.getByLabelText(/Projekt-Manager/i);
    await user.selectOptions(pmSelect, 'member-1');

    expect(mockUpdate).toHaveBeenCalledWith({ projectManager: 'member-1' });
  });

  it('sollte vorausgewählten Projekt-Manager anzeigen', () => {
    const formDataWithPM = {
      ...defaultFormData,
      assignedTeamMembers: ['member-1', 'member-2'],
      projectManager: 'member-2'
    };

    render(<TeamStep {...defaultProps} formData={formDataWithPM} />);

    const pmSelect = screen.getByLabelText(/Projekt-Manager/i) as HTMLSelectElement;
    expect(pmSelect.value).toBe('member-2');
  });

  it('sollte Projekt-Manager löschen wenn Team-Mitglied abgewählt wird', async () => {
    const user = userEvent.setup();
    const formDataWithPM = {
      ...defaultFormData,
      assignedTeamMembers: ['member-1'],
      projectManager: 'member-1'
    };

    render(<TeamStep {...defaultProps} formData={formDataWithPM} />);

    // Deselect the team member
    const checkbox = screen.getByLabelText('Test User 1');
    await user.click(checkbox);

    // Should clear project manager when the only team member is removed
    expect(mockUpdate).toHaveBeenCalled();
  });
});
