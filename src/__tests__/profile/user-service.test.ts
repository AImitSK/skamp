// src/__tests__/profile/user-service.test.ts
import { userService } from '@/lib/firebase/user-service';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, User } from 'firebase/auth';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date())
}));

jest.mock('firebase/auth', () => ({
  updateProfile: jest.fn()
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

describe('UserService', () => {
  const mockUser: Partial<User> = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true,
    providerData: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateProfile', () => {
    it('sollte ein neues Profil erstellen, wenn keines existiert', async () => {
      const mockDocRef = { id: 'test-user-123' };
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      await userService.createOrUpdateProfile(mockUser as User);

      expect(doc).toHaveBeenCalledWith({}, 'users', 'test-user-123');
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: expect.any(Date)
        }),
        { merge: true }
      );
    });

    it('sollte ein existierendes Profil aktualisieren', async () => {
      const mockDocRef = { id: 'test-user-123' };
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'test-user-123',
          createdAt: new Date('2024-01-01')
        })
      });

      await userService.createOrUpdateProfile(mockUser as User);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          uid: 'test-user-123',
          email: 'test@example.com',
          updatedAt: expect.any(Date)
        }),
        { merge: true }
      );
      
      // createdAt sollte nicht überschrieben werden
      const callData = (setDoc as jest.Mock).mock.calls[0][1];
      expect(callData).not.toHaveProperty('createdAt');
    });
  });

  describe('getProfile', () => {
    it('sollte ein Profil abrufen', async () => {
      const mockDocRef = { id: 'test-user-123' };
      const mockProfileData = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        phoneNumber: '+49123456789',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-02') }
      };

      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProfileData
      });

      const profile = await userService.getProfile('test-user-123');

      expect(profile).toEqual({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        phoneNumber: '+49123456789',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      });
    });

    it('sollte null zurückgeben, wenn kein Profil existiert', async () => {
      (doc as jest.Mock).mockReturnValue({ id: 'test-user-123' });
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      const profile = await userService.getProfile('test-user-123');

      expect(profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('sollte displayName in Firebase Auth und Firestore aktualisieren', async () => {
      const mockDocRef = { id: 'test-user-123' };
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (updateProfile as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await userService.updateProfile(mockUser as User, {
        displayName: 'New Name'
      });

      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'New Name'
      });

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          displayName: 'New Name'
        })
      );
    });

    it('sollte phoneNumber nur in Firestore aktualisieren', async () => {
      const mockDocRef = { id: 'test-user-123' };
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await userService.updateProfile(mockUser as User, {
        phoneNumber: '+49987654321'
      });

      expect(updateProfile).not.toHaveBeenCalled();

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          phoneNumber: '+49987654321'
        })
      );
    });

    it('sollte bei Fehlern eine aussagekräftige Fehlermeldung werfen', async () => {
      (updateProfile as jest.Mock).mockRejectedValue(new Error('Auth error'));

      await expect(
        userService.updateProfile(mockUser as User, {
          displayName: 'New Name'
        })
      ).rejects.toThrow('Profil konnte nicht aktualisiert werden');
    });
  });

  describe('validatePhoneNumber', () => {
    it('sollte gültige Telefonnummern akzeptieren', () => {
      expect(userService.validatePhoneNumber('+49123456789')).toBe(true);
      expect(userService.validatePhoneNumber('49123456789')).toBe(true);
      expect(userService.validatePhoneNumber('+1234567890')).toBe(true);
      expect(userService.validatePhoneNumber('123456789')).toBe(true);
    });

    it('sollte ungültige Telefonnummern ablehnen', () => {
      expect(userService.validatePhoneNumber('')).toBe(false);
      expect(userService.validatePhoneNumber('abc')).toBe(false);
      expect(userService.validatePhoneNumber('12')).toBe(false);  // Zu kurz
      expect(userService.validatePhoneNumber('+0123')).toBe(false);
    });

    it('sollte Formatierungszeichen ignorieren', () => {
      expect(userService.validatePhoneNumber('+49 123 456 789')).toBe(true);
      expect(userService.validatePhoneNumber('+49-123-456-789')).toBe(true);
      expect(userService.validatePhoneNumber('+49 (123) 456-789')).toBe(true);
    });
  });

  describe('validateDisplayName', () => {
    it('sollte gültige Anzeigenamen akzeptieren', () => {
      expect(userService.validateDisplayName('John Doe')).toEqual({
        valid: true
      });
      expect(userService.validateDisplayName('A')).toEqual({
        valid: false,
        error: 'Anzeigename muss mindestens 2 Zeichen haben'
      });
    });

    it('sollte leere oder zu kurze Namen ablehnen', () => {
      expect(userService.validateDisplayName('')).toEqual({
        valid: false,
        error: 'Anzeigename ist erforderlich'
      });
      expect(userService.validateDisplayName(' ')).toEqual({
        valid: false,
        error: 'Anzeigename ist erforderlich'
      });
      expect(userService.validateDisplayName('A')).toEqual({
        valid: false,
        error: 'Anzeigename muss mindestens 2 Zeichen haben'
      });
    });

    it('sollte zu lange Namen ablehnen', () => {
      const longName = 'a'.repeat(51);
      expect(userService.validateDisplayName(longName)).toEqual({
        valid: false,
        error: 'Anzeigename darf maximal 50 Zeichen haben'
      });
    });
  });

  describe('deleteProfile', () => {
    it('sollte ein Profil als gelöscht markieren (soft delete)', async () => {
      const mockDocRef = { id: 'test-user-123' };
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await userService.deleteProfile('test-user-123');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          deleted: true
        })
      );
    });
  });
});