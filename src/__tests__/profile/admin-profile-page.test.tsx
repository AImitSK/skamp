// src/__tests__/profile/admin-profile-page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/dashboard/admin/profile/page';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() }))
}));

// Mock contexts
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: jest.fn()
}));

// Mock Firebase imports
jest.mock('@/lib/firebase/user-service', () => ({
  userService: {
    getProfile: jest.fn()
  }
}));

// Mock profile components
jest.mock('@/components/profile/EmailVerification', () => ({
  EmailVerification: () => <div data-testid="email-verification">Email Verification Mock</div>
}));

jest.mock('@/components/profile/PasswordChange', () => ({
  PasswordChange: () => <div data-testid="password-change">Password Change Mock</div>
}));

jest.mock('@/components/profile/TwoFactorSettings', () => ({
  TwoFactorSettings: () => <div data-testid="two-factor-settings">2FA Settings Mock</div>
}));

jest.mock('@/components/profile/SocialProviders', () => ({
  SocialProviders: () => <div data-testid="social-providers">Social Providers Mock</div>
}));

jest.mock('@/components/profile/DeleteAccount', () => ({
  DeleteAccount: () => <div data-testid="delete-account">Delete Account Mock</div>
}));

jest.mock('@/components/ui/image-cropper', () => ({
  ImageCropper: ({ src, onCropComplete, onCancel }: any) => (
    <div data-testid="image-cropper">
      <img src={src} alt="crop preview" />
      <button onClick={() => onCropComplete(new File([''], 'test.jpg', { type: 'image/jpeg' }))}>
        Zuschneiden
      </button>
      <button onClick={onCancel}>Abbrechen</button>
    </div>
  )
}));

describe('Admin Profile Page', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
    emailVerified: true
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    role: 'owner' as const
  };

  const mockAuthMethods = {
    uploadProfileImage: jest.fn(),
    deleteProfileImage: jest.fn(),
    getAvatarUrl: jest.fn(),
    getInitials: jest.fn(),
    updateUserProfile: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      ...mockAuthMethods
    });

    (useOrganization as jest.Mock).mockReturnValue({
      currentOrganization: mockOrganization
    });

    mockAuthMethods.getAvatarUrl.mockReturnValue('https://example.com/avatar.jpg');
    mockAuthMethods.getInitials.mockReturnValue('TU');
  });

  it('sollte die Hauptseite mit allen Bereichen rendern', () => {
    render(<ProfilePage />);
    
    // Header
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Verwalte deine persönlichen Informationen und Einstellungen')).toBeInTheDocument();

    // InfoCard Bereiche
    expect(screen.getByText('Profilbild')).toBeInTheDocument();
    expect(screen.getByText('Persönliche Informationen')).toBeInTheDocument();
    expect(screen.getByText('Account-Informationen')).toBeInTheDocument();

    // Komponenten
    expect(screen.getByTestId('email-verification')).toBeInTheDocument();
    expect(screen.getByTestId('password-change')).toBeInTheDocument();
    expect(screen.getByTestId('two-factor-settings')).toBeInTheDocument();
    expect(screen.getByTestId('social-providers')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });

  it('sollte Profil-Daten korrekt anzeigen', () => {
    render(<ProfilePage />);
    
    // E-Mail-Feld
    const emailInput = screen.getByDisplayValue('test@example.com');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeDisabled();

    // Account-Informationen
    expect(screen.getByText('test-user-123')).toBeInTheDocument();
    expect(screen.getByText('Inhaber')).toBeInTheDocument();
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
  });

  it('sollte Avatar-Upload-Buttons korrekt anzeigen', () => {
    render(<ProfilePage />);
    
    // Upload-Button
    expect(screen.getByRole('button', { name: /ändern/i })).toBeInTheDocument();
    
    // Delete-Button sollte vorhanden sein, da photoURL existiert
    expect(screen.getByRole('button', { name: /entfernen/i })).toBeInTheDocument();
  });

  it('sollte Avatar-Upload-Flow funktionieren', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockAuthMethods.uploadProfileImage.mockResolvedValue({ success: true });
    
    render(<ProfilePage />);
    
    // File-Input triggern
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      configurable: true
    });
    
    fireEvent.change(fileInput);
    
    // Image-Cropper sollte erscheinen
    await waitFor(() => {
      expect(screen.getByTestId('image-cropper')).toBeInTheDocument();
    });
    
    // Zuschneiden bestätigen
    const cropButton = screen.getByRole('button', { name: /zuschneiden/i });
    fireEvent.click(cropButton);
    
    // Upload sollte aufgerufen werden
    await waitFor(() => {
      expect(mockAuthMethods.uploadProfileImage).toHaveBeenCalled();
      expect(screen.getByText(/profilbild erfolgreich aktualisiert/i)).toBeInTheDocument();
    });
  });

  it('sollte Avatar löschen können', async () => {
    mockAuthMethods.deleteProfileImage.mockResolvedValue({ success: true });
    
    render(<ProfilePage />);
    
    const deleteButton = screen.getByRole('button', { name: /entfernen/i });
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(mockAuthMethods.deleteProfileImage).toHaveBeenCalled();
      expect(screen.getByText(/profilbild erfolgreich entfernt/i)).toBeInTheDocument();
    });
  });

  it('sollte Profil-Daten speichern können', async () => {
    mockAuthMethods.updateUserProfile.mockResolvedValue(undefined);
    
    render(<ProfilePage />);
    
    // Anzeigenamen ändern
    const displayNameInput = screen.getByPlaceholderText('Dein Name');
    fireEvent.change(displayNameInput, { target: { value: 'Neuer Name' } });
    
    // Telefonnummer eingeben
    const phoneInput = screen.getByPlaceholderText('+49 123 456789');
    fireEvent.change(phoneInput, { target: { value: '+49 123 456789' } });
    
    // Speichern
    const saveButton = screen.getByRole('button', { name: /änderungen speichern/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockAuthMethods.updateUserProfile).toHaveBeenCalledWith({
        displayName: 'Neuer Name',
        phoneNumber: '+49 123 456789'
      });
      expect(screen.getByText(/profil erfolgreich gespeichert/i)).toBeInTheDocument();
    });
  });

  it('sollte Fehler beim Avatar-Upload anzeigen', async () => {
    mockAuthMethods.uploadProfileImage.mockResolvedValue({ 
      success: false, 
      error: 'Upload fehlgeschlagen' 
    });
    
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    render(<ProfilePage />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      configurable: true
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      const cropButton = screen.getByRole('button', { name: /zuschneiden/i });
      fireEvent.click(cropButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Upload fehlgeschlagen')).toBeInTheDocument();
    });
  });

  it('sollte Validierung für Dateigröße haben', async () => {
    // 11MB Datei (zu groß)
    const largeMockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });
    
    render(<ProfilePage />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [largeMockFile],
      configurable: true
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText(/datei ist zu groß/i)).toBeInTheDocument();
    });
  });

  it('sollte Abbrechen-Funktionalität haben', () => {
    render(<ProfilePage />);
    
    // Daten ändern
    const displayNameInput = screen.getByPlaceholderText('Dein Name');
    fireEvent.change(displayNameInput, { target: { value: 'Geändert' } });
    
    // Abbrechen
    const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
    fireEvent.click(cancelButton);
    
    // Werte sollten zurückgesetzt sein
    expect(displayNameInput).toHaveValue('Test User');
  });

  it('sollte ohne Avatar korrekt funktionieren', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { ...mockUser, photoURL: null },
      ...mockAuthMethods
    });
    
    mockAuthMethods.getAvatarUrl.mockReturnValue(null);
    
    render(<ProfilePage />);
    
    // Upload-Button sollte "Hochladen" statt "Ändern" anzeigen
    expect(screen.getByRole('button', { name: /hochladen/i })).toBeInTheDocument();
    
    // Delete-Button sollte nicht vorhanden sein
    expect(screen.queryByRole('button', { name: /entfernen/i })).not.toBeInTheDocument();
  });

  it('sollte verschiedene Rollen korrekt anzeigen', () => {
    // Test für Admin-Rolle
    (useOrganization as jest.Mock).mockReturnValue({
      currentOrganization: { ...mockOrganization, role: 'admin' }
    });
    
    const { rerender } = render(<ProfilePage />);
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    
    // Test für Member-Rolle
    (useOrganization as jest.Mock).mockReturnValue({
      currentOrganization: { ...mockOrganization, role: 'member' }
    });
    
    rerender(<ProfilePage />);
    expect(screen.getByText('Mitglied')).toBeInTheDocument();
  });
});