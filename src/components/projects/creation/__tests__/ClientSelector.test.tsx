// src/components/projects/creation/__tests__/ClientSelector.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientSelector } from '../ClientSelector';

describe('ClientSelector', () => {
  
  const mockClients = [
    {
      id: 'client1',
      name: 'TechCorp GmbH',
      type: 'enterprise',
      contactCount: 15
    },
    {
      id: 'client2',
      name: 'StartUp AG',
      type: 'startup',
      contactCount: 5
    },
    {
      id: 'client3',
      name: 'Marketing Solutions Ltd',
      type: 'agency',
      contactCount: 8
    },
    {
      id: 'client4',
      name: 'Local Business',
      type: 'small_business',
      contactCount: 3
    }
  ];

  const mockProps = {
    clients: mockClients,
    selectedClientId: '',
    onSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    
    it('sollte Suchfeld rendern', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByPlaceholderText('Kunden suchen...')).toBeInTheDocument();
    });

    it('sollte alle Kunden rendern', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
      expect(screen.getByText('StartUp AG')).toBeInTheDocument();
      expect(screen.getByText('Marketing Solutions Ltd')).toBeInTheDocument();
      expect(screen.getByText('Local Business')).toBeInTheDocument();
    });

    it('sollte "Neuen Kunden anlegen" Button rendern', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('Neuen Kunden anlegen')).toBeInTheDocument();
    });

    it('sollte Kunden nach Contact Count sortiert anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      const clientElements = screen.getAllByText(/Typ:/);
      // TechCorp (15 Kontakte) sollte zuerst kommen
      const firstClient = clientElements[0].closest('div')?.querySelector('h4');
      expect(firstClient).toHaveTextContent('TechCorp GmbH');
    });
  });

  describe('Recent Clients Section', () => {
    
    it('sollte "Zuletzt verwendet" Section anzeigen wenn kein Suchbegriff', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('Zuletzt verwendet:')).toBeInTheDocument();
    });

    it('sollte Top 3 Clients als Recent Shortcuts anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      // Sollte die ersten 3 Kunden als Shortcuts zeigen
      const shortcuts = screen.getAllByRole('button').filter(btn => 
        btn.textContent && mockClients.slice(0, 3).some(client => 
          btn.textContent?.includes(client.name)
        )
      );
      expect(shortcuts).toHaveLength(3);
    });

    it('sollte Recent Client-Shortcut korrekt handhaben', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const shortcut = screen.getByRole('button', { name: 'TechCorp GmbH' });
      await user.click(shortcut);
      
      expect(mockProps.onSelect).toHaveBeenCalledWith('client1');
    });

    it('sollte Recent Clients bei Suche ausblenden', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'Tech');
      
      expect(screen.queryByText('Zuletzt verwendet:')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    
    it('sollte Kunden nach Namen filtern', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'Tech');
      
      expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
      expect(screen.queryByText('StartUp AG')).not.toBeInTheDocument();
      expect(screen.queryByText('Marketing Solutions Ltd')).not.toBeInTheDocument();
    });

    it('sollte Kunden nach Typ filtern', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'startup');
      
      expect(screen.getByText('StartUp AG')).toBeInTheDocument();
      expect(screen.queryByText('TechCorp GmbH')).not.toBeInTheDocument();
    });

    it('sollte case-insensitive Suche durchführen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'TECH');
      
      expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
    });

    it('sollte "Keine Kunden gefunden" bei leerem Suchergebnis zeigen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'NonexistentClient');
      
      expect(screen.getByText('Keine Kunden gefunden.')).toBeInTheDocument();
    });

    it('sollte Suchfeld-Wert korrekt aktualisieren', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      await user.type(searchInput, 'Marketing');
      
      expect(searchInput).toHaveValue('Marketing');
    });
  });

  describe('Client Selection', () => {
    
    it('sollte Client bei Klick auswählen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) {
        await user.click(clientCard);
      }
      
      expect(mockProps.onSelect).toHaveBeenCalledWith('client1');
    });

    it('sollte ausgewählten Client visuell hervorheben', () => {
      render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      const selectedClient = screen.getByText('TechCorp GmbH').closest('div');
      expect(selectedClient).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('sollte nicht ausgewählte Clients normal darstellen', () => {
      render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      const unselectedClient = screen.getByText('StartUp AG').closest('div');
      expect(unselectedClient).toHaveClass('border-gray-300');
      expect(unselectedClient).not.toHaveClass('border-blue-500');
    });

    it('sollte Client-Details bei Auswahl anzeigen', () => {
      render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      expect(screen.getByText('✓ Ausgewählt')).toBeInTheDocument();
      expect(screen.getByText('Kontakte: 15')).toBeInTheDocument();
    });

    it('sollte Recent Client-Shortcut als ausgewählt markieren', () => {
      render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      const shortcut = screen.getByRole('button', { name: 'TechCorp GmbH' });
      expect(shortcut).toHaveClass('bg-blue-100', 'border-blue-300', 'text-blue-800');
    });
  });

  describe('Client Information Display', () => {
    
    it('sollte Client-Namen korrekt anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
      expect(screen.getByText('StartUp AG')).toBeInTheDocument();
    });

    it('sollte Client-Typ-Information anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('Typ: enterprise')).toBeInTheDocument();
      expect(screen.getByText('Typ: startup')).toBeInTheDocument();
    });

    it('sollte Contact-Count anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      expect(screen.getByText('15 Kontakte')).toBeInTheDocument();
      expect(screen.getByText('5 Kontakte')).toBeInTheDocument();
    });

    it('sollte Client-Typ-Badges mit korrekten Farben anzeigen', () => {
      render(<ClientSelector {...mockProps} />);
      
      const enterpriseBadge = screen.getByText('enterprise');
      expect(enterpriseBadge).toHaveClass('bg-purple-100', 'text-purple-800');
      
      const startupBadge = screen.getByText('startup');
      expect(startupBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('sollte Default-Badge-Farben für unbekannte Typen verwenden', () => {
      const clientsWithUnknownType = [
        {
          id: 'client1',
          name: 'Unknown Type Client',
          type: 'unknown_type',
          contactCount: 10
        }
      ];

      render(<ClientSelector {...mockProps} clients={clientsWithUnknownType} />);
      
      const unknownBadge = screen.getByText('unknown_type');
      expect(unknownBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('New Client Creation Form', () => {
    
    it('sollte Neuen-Kunden-Form bei Button-Klick anzeigen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      await user.click(newClientButton);
      
      expect(screen.getByText('Neuen Kunden anlegen')).toBeInTheDocument();
      expect(screen.getByText('Zurück zur Auswahl')).toBeInTheDocument();
    });

    it('sollte Placeholder-Nachricht in Neuen-Kunden-Form anzeigen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      await user.click(newClientButton);
      
      expect(screen.getByText(/Diese Funktion ist noch nicht implementiert/)).toBeInTheDocument();
    });

    it('sollte von Neuen-Kunden-Form zurück zur Liste navigieren', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      // Öffne Form
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      await user.click(newClientButton);
      
      // Zurück zur Liste
      const backButton = screen.getByText('Zurück zur Auswahl');
      await user.click(backButton);
      
      expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Kunden suchen...')).toBeInTheDocument();
    });

    it('sollte Kunden-Liste verstecken wenn Neuen-Kunden-Form aktiv ist', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      await user.click(newClientButton);
      
      expect(screen.queryByText('TechCorp GmbH')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Kunden suchen...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    
    it('sollte "Keine Kunden verfügbar" bei leerer Kunden-Liste zeigen', () => {
      render(<ClientSelector {...mockProps} clients={[]} />);
      
      expect(screen.getByText('Keine Kunden verfügbar.')).toBeInTheDocument();
    });

    it('sollte keine Recent Clients bei leerer Liste zeigen', () => {
      render(<ClientSelector {...mockProps} clients={[]} />);
      
      expect(screen.queryByText('Zuletzt verwendet:')).not.toBeInTheDocument();
    });

    it('sollte trotzdem Neuen-Kunden-Button bei leerer Liste zeigen', () => {
      render(<ClientSelector {...mockProps} clients={[]} />);
      
      expect(screen.getByText('Neuen Kunden anlegen')).toBeInTheDocument();
    });
  });

  describe('Scrollable List', () => {
    
    it('sollte scrollbare Liste für viele Kunden haben', () => {
      const manyClients = Array(20).fill(null).map((_, index) => ({
        id: `client${index}`,
        name: `Client ${index}`,
        type: 'company',
        contactCount: index + 1
      }));

      render(<ClientSelector {...mockProps} clients={manyClients} />);
      
      const clientList = screen.getByText('Client 0').closest('div')?.parentElement;
      expect(clientList).toHaveClass('max-h-60', 'overflow-y-auto');
    });
  });

  describe('Keyboard Navigation', () => {
    
    it('sollte Suchfeld fokussierbar sein', () => {
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      searchInput.focus();
      
      expect(searchInput).toHaveFocus();
    });

    it('sollte Client-Cards anklickbar sein', () => {
      render(<ClientSelector {...mockProps} />);
      
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      expect(clientCard).toHaveClass('cursor-pointer');
    });

    it('sollte Buttons via Tab navigierbar sein', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('Kunden suchen...');
      searchInput.focus();
      
      // Tab zu Recent Client Shortcuts
      await user.tab();
      
      // Tab zu New Client Button
      for (let i = 0; i < 4; i++) {
        await user.tab(); // Durch Recent Clients und zum New Client Button
      }
      
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      expect(newClientButton).toHaveFocus();
    });
  });

  describe('Hover Effects', () => {
    
    it('sollte Hover-Effekte für Client-Cards haben', () => {
      render(<ClientSelector {...mockProps} />);
      
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      expect(clientCard).toHaveClass('hover:border-gray-400', 'hover:bg-gray-50');
    });

    it('sollte Hover-Effekte für Recent Shortcuts haben', () => {
      render(<ClientSelector {...mockProps} />);
      
      const shortcut = screen.getByRole('button', { name: 'TechCorp GmbH' });
      expect(shortcut).toHaveClass('hover:bg-gray-200');
    });

    it('sollte Hover-Effekte für New Client Button haben', () => {
      render(<ClientSelector {...mockProps} />);
      
      const newClientButton = screen.getByText('Neuen Kunden anlegen');
      expect(newClientButton).toHaveClass('hover:border-gray-400', 'hover:text-gray-800');
    });
  });

  describe('Multi-Selection Prevention', () => {
    
    it('sollte bei erneuter Auswahl desselben Clients onSelect aufrufen', async () => {
      const user = userEvent.setup();
      render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      const selectedClient = screen.getByText('TechCorp GmbH').closest('div');
      if (selectedClient) {
        await user.click(selectedClient);
      }
      
      expect(mockProps.onSelect).toHaveBeenCalledWith('client1');
    });

    it('sollte Auswahl zwischen Clients korrekt wechseln', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ClientSelector {...mockProps} selectedClientId="client1" />);
      
      // Verify first client is selected
      expect(screen.getByText('✓ Ausgewählt')).toBeInTheDocument();
      
      // Select different client
      const secondClient = screen.getByText('StartUp AG').closest('div');
      if (secondClient) {
        await user.click(secondClient);
      }
      
      expect(mockProps.onSelect).toHaveBeenCalledWith('client2');
      
      // Rerender with new selection
      rerender(<ClientSelector {...mockProps} selectedClientId="client2" />);
      
      // Verify selection changed
      const newSelectedClient = screen.getByText('StartUp AG').closest('div');
      expect(newSelectedClient).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });
});