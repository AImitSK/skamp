// src/__tests__/profile/profile-components.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailVerification } from '@/components/profile/EmailVerification';
import { PasswordChange } from '@/components/profile/PasswordChange';
import { DeleteAccount } from '@/components/profile/DeleteAccount';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  updatePassword: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn()
  },
  reauthenticateWithCredential: jest.fn(),
  deleteUser: jest.fn(),
  sendEmailVerification: jest.fn()
}));

// Mock Firebase Client Init
jest.mock('@/lib/firebase/client-init', () => ({
  auth: {}
}));

describe('EmailVerification Component', () => {
  const mockSendVerificationEmail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        email: 'test@example.com',
        emailVerified: false
      },
      sendVerificationEmail: mockSendVerificationEmail
    });
  });

  it('sollte den nicht-verifizierten Status anzeigen', () => {
    render(<EmailVerification />);

    // Badge mit "Nicht verifiziert" pruefen (getrennt vom Text)
    expect(screen.getByText('Nicht verifiziert')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verifizierungs-e-mail senden/i })).toBeInTheDocument();
  });

  it('sollte den verifizierten Status anzeigen', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        email: 'test@example.com',
        emailVerified: true
      },
      sendVerificationEmail: mockSendVerificationEmail
    });

    render(<EmailVerification />);

    // Badge mit "Verifiziert" pruefen
    expect(screen.getByText('Verifiziert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verifizierungs-e-mail senden/i })).not.toBeInTheDocument();
  });

  it('sollte eine Verifizierungs-E-Mail senden können', async () => {
    mockSendVerificationEmail.mockResolvedValue(undefined);
    
    render(<EmailVerification />);
    
    const sendButton = screen.getByRole('button', { name: /verifizierungs-e-mail senden/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendVerificationEmail).toHaveBeenCalled();
      expect(screen.getByText(/verifizierungs-e-mail wurde gesendet/i)).toBeInTheDocument();
    });
  });

  it('sollte Fehler beim Senden anzeigen', async () => {
    mockSendVerificationEmail.mockRejectedValue(new Error('Sendefehler'));

    render(<EmailVerification />);

    const sendButton = screen.getByRole('button', { name: /verifizierungs-e-mail senden/i });
    fireEvent.click(sendButton);

    // Warte auf Fehlermeldung - nur "Sendefehler" wird angezeigt (der Error.message)
    await waitFor(() => {
      expect(screen.getByText('Sendefehler')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

describe('PasswordChange Component', () => {
  const mockUser = {
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser
    });
  });

  it('sollte das Formular initial versteckt haben', () => {
    render(<PasswordChange />);
    
    expect(screen.getByRole('button', { name: /passwort ändern/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/aktuelles passwort/i)).not.toBeInTheDocument();
  });

  it('sollte das Formular beim Klick anzeigen', () => {
    render(<PasswordChange />);

    const changeButton = screen.getByRole('button', { name: /passwort ändern/i });
    fireEvent.click(changeButton);

    // Exakte Labels aus der Komponente verwenden
    expect(screen.getByText('Aktuelles Passwort')).toBeInTheDocument();
    expect(screen.getByText('Neues Passwort')).toBeInTheDocument();
    expect(screen.getByText('Neues Passwort bestätigen')).toBeInTheDocument();
  });

  it('sollte Validierungsfehler anzeigen', async () => {
    render(<PasswordChange />);
    
    const changeButton = screen.getByRole('button', { name: /passwort ändern/i });
    fireEvent.click(changeButton);

    // Fülle nur neues Passwort aus
    const newPasswordInput = screen.getByLabelText(/neues passwort$/i);
    fireEvent.change(newPasswordInput, { target: { value: 'new123' } });

    const submitButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('Passwort ändern')
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/aktuelles passwort ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('sollte Fehler bei nicht übereinstimmenden Passwörtern anzeigen', async () => {
    render(<PasswordChange />);
    
    const changeButton = screen.getByRole('button', { name: /passwort ändern/i });
    fireEvent.click(changeButton);

    fireEvent.change(screen.getByLabelText(/aktuelles passwort/i), { 
      target: { value: 'current123' } 
    });
    fireEvent.change(screen.getByLabelText(/neues passwort$/i), { 
      target: { value: 'new123456' } 
    });
    fireEvent.change(screen.getByLabelText(/neues passwort bestätigen/i), { 
      target: { value: 'different123' } 
    });

    const submitButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('Passwort ändern')
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/passwörter stimmen nicht überein/i)).toBeInTheDocument();
    });
  });
});

describe('DeleteAccount Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'test-user-123',
        email: 'test@example.com'
      }
    });
  });

  it('sollte die Gefahrenzone anzeigen', () => {
    render(<DeleteAccount />);
    
    expect(screen.getByText(/gefahrenzone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account löschen/i })).toBeInTheDocument();
  });

  it('sollte den Lösch-Dialog öffnen', () => {
    render(<DeleteAccount />);
    
    const deleteButton = screen.getByRole('button', { name: /account löschen/i });
    fireEvent.click(deleteButton);

    expect(screen.getByText(/diese aktion hat folgende konsequenzen/i)).toBeInTheDocument();
    expect(screen.getByText(/dein account wird permanent gelöscht/i)).toBeInTheDocument();
  });

  it('sollte durch alle Bestätigungsschritte navigieren', async () => {
    render(<DeleteAccount />);

    // Öffne Dialog
    const deleteButton = screen.getByRole('button', { name: /account löschen/i });
    fireEvent.click(deleteButton);

    // Schritt 1: Checkbox aktivieren
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const weiterButton = screen.getByRole('button', { name: /^weiter$/i });
    fireEvent.click(weiterButton);

    // Schritt 2: "LÖSCHEN" eingeben
    await waitFor(() => {
      // Text kommt aus der Komponente mit <strong>LÖSCHEN</strong>
      expect(screen.getByText(/um sicherzustellen/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const confirmInput = screen.getByPlaceholderText(/gib löschen ein/i);
    fireEvent.change(confirmInput, { target: { value: 'LÖSCHEN' } });

    const weiterButton2 = screen.getByRole('button', { name: /weiter zur finalen/i });
    fireEvent.click(weiterButton2);

    // Schritt 3: Passwort eingeben
    await waitFor(() => {
      expect(screen.getByText(/letzte chance/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Passwort')).toBeInTheDocument();
  });

  it('sollte Validierung für Bestätigungstext durchführen', async () => {
    render(<DeleteAccount />);
    
    const deleteButton = screen.getByRole('button', { name: /account löschen/i });
    fireEvent.click(deleteButton);

    // Checkbox aktivieren und weiter
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const weiterButton = screen.getByRole('button', { name: /weiter/i });
    fireEvent.click(weiterButton);

    // Falschen Text eingeben
    await waitFor(() => {
      const confirmInput = screen.getByPlaceholderText(/gib löschen ein/i);
      fireEvent.change(confirmInput, { target: { value: 'LOESCHEN' } });
    });

    const weiterButton2 = screen.getByRole('button', { name: /weiter zur finalen/i });
    
    // Button sollte disabled sein bei falschem Text
    expect(weiterButton2).toBeDisabled();
  });

  it('sollte Abbrechen-Funktionalität haben', async () => {
    render(<DeleteAccount />);

    const deleteButton = screen.getByRole('button', { name: /account löschen/i });
    fireEvent.click(deleteButton);

    const abbrechenButton = screen.getByRole('button', { name: /abbrechen/i });
    fireEvent.click(abbrechenButton);

    // Dialog sollte geschlossen sein - mit waitFor wegen HeadlessUI Animation
    await waitFor(() => {
      expect(screen.queryByText(/diese aktion hat folgende konsequenzen/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});