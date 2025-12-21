import { textMatrixService, TextMatrix, TextMatrixData } from '../text-matrix-service';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

// Mock Firebase
jest.mock('../client-init', () => ({
  db: {},
}));

jest.mock('firebase/firestore');

describe('textMatrixService', () => {
  const mockOrganizationId = 'org-123';
  const mockProjectId = 'project-123';
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockTextMatrix: TextMatrix = {
    id: 'text-matrix-123',
    projectId: mockProjectId,
    companyId: mockCompanyId,
    organizationId: mockOrganizationId,
    content: '<h1>Pressemeldung</h1>',
    plainText: 'Pressemeldung',
    status: 'draft',
    finalizedAt: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: mockUserId,
    updatedBy: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTextMatrix', () => {
    it('sollte Text-Matrix für ein Projekt laden', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: mockTextMatrix.id,
            data: () => ({
              projectId: mockTextMatrix.projectId,
              companyId: mockTextMatrix.companyId,
              organizationId: mockTextMatrix.organizationId,
              content: mockTextMatrix.content,
              plainText: mockTextMatrix.plainText,
              status: mockTextMatrix.status,
              finalizedAt: mockTextMatrix.finalizedAt,
              createdAt: mockTextMatrix.createdAt,
              updatedAt: mockTextMatrix.updatedAt,
              createdBy: mockTextMatrix.createdBy,
              updatedBy: mockTextMatrix.updatedBy,
            }),
          },
        ],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await textMatrixService.getTextMatrix(mockProjectId);

      expect(getDocs).toHaveBeenCalled();
      expect(result).toEqual(mockTextMatrix);
    });

    it('sollte null zurückgeben wenn keine Text-Matrix existiert', async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await textMatrixService.getTextMatrix(mockProjectId);

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben bei Fehler', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore Error'));

      const result = await textMatrixService.getTextMatrix(mockProjectId);

      expect(result).toBeNull();
    });
  });

  describe('createTextMatrix', () => {
    it('sollte neue Text-Matrix erstellen', async () => {
      const mockData: TextMatrixData = {
        content: '<h1>Test</h1>',
        plainText: 'Test',
        status: 'draft',
      };

      // Mock getTextMatrix (keine existierende Matrix)
      (getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

      (addDoc as jest.Mock).mockResolvedValue({
        id: 'new-text-matrix-123',
      });

      const result = await textMatrixService.createTextMatrix(
        mockProjectId,
        mockCompanyId,
        mockOrganizationId,
        mockData,
        mockUserId
      );

      expect(addDoc).toHaveBeenCalled();
      expect(result).toBe('new-text-matrix-123');
    });

    it('sollte Fehler werfen wenn Text-Matrix bereits existiert', async () => {
      const mockData: TextMatrixData = {
        content: '<h1>Test</h1>',
        plainText: 'Test',
      };

      // Mock getTextMatrix (existierende Matrix)
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-123', data: () => ({}) }],
      });

      await expect(
        textMatrixService.createTextMatrix(
          mockProjectId,
          mockCompanyId,
          mockOrganizationId,
          mockData,
          mockUserId
        )
      ).rejects.toThrow('Text-Matrix für dieses Projekt existiert bereits');

      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  describe('updateTextMatrix', () => {
    it('sollte Text-Matrix aktualisieren', async () => {
      const mockData: Partial<TextMatrixData> = {
        content: '<h1>Updated</h1>',
        plainText: 'Updated',
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockTextMatrix,
      });

      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await textMatrixService.updateTextMatrix(
        mockTextMatrix.id,
        mockData,
        mockUserId
      );

      expect(getDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn Text-Matrix nicht existiert', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        textMatrixService.updateTextMatrix(
          'non-existent',
          { content: 'Test' },
          mockUserId
        )
      ).rejects.toThrow('Text-Matrix nicht gefunden');

      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  describe('finalizeTextMatrix', () => {
    it('sollte Text-Matrix finalisieren', async () => {
      const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 };
      const mockDocRef = { id: mockTextMatrix.id };

      (Timestamp.now as jest.Mock) = jest.fn().mockReturnValue(mockTimestamp);
      (doc as jest.Mock).mockReturnValue(mockDocRef);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockTextMatrix, status: 'draft' }),
      });

      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await textMatrixService.finalizeTextMatrix(
        mockTextMatrix.id,
        mockUserId
      );

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          status: 'finalized',
          finalizedAt: mockTimestamp,
          updatedAt: mockTimestamp,
          updatedBy: mockUserId,
        })
      );
    });

    it('sollte Fehler werfen wenn Text-Matrix bereits finalisiert', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockTextMatrix, status: 'finalized' }),
      });

      await expect(
        textMatrixService.finalizeTextMatrix(mockTextMatrix.id, mockUserId)
      ).rejects.toThrow('Text-Matrix ist bereits finalisiert');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn Text-Matrix nicht existiert', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        textMatrixService.finalizeTextMatrix('non-existent', mockUserId)
      ).rejects.toThrow('Text-Matrix nicht gefunden');
    });
  });

  describe('deleteTextMatrix', () => {
    it('sollte Text-Matrix löschen', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockTextMatrix,
      });

      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await textMatrixService.deleteTextMatrix(
        mockTextMatrix.id,
        mockOrganizationId
      );

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn organizationId nicht übereinstimmt', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockTextMatrix,
      });

      await expect(
        textMatrixService.deleteTextMatrix(mockTextMatrix.id, 'wrong-org-id')
      ).rejects.toThrow(
        'Keine Berechtigung zum Löschen dieser Text-Matrix'
      );

      expect(deleteDoc).not.toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn Text-Matrix nicht existiert', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        textMatrixService.deleteTextMatrix('non-existent', mockOrganizationId)
      ).rejects.toThrow('Text-Matrix nicht gefunden');
    });
  });

  describe('getAllTextMatrices', () => {
    it('sollte alle Text-Matrices für eine Organisation laden', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'matrix-1',
            data: () => ({ ...mockTextMatrix, id: 'matrix-1' }),
          },
          {
            id: 'matrix-2',
            data: () => ({ ...mockTextMatrix, id: 'matrix-2' }),
          },
        ],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await textMatrixService.getAllTextMatrices(
        mockOrganizationId
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('matrix-1');
      expect(result[1].id).toBe('matrix-2');
    });

    it('sollte leeres Array bei Fehler zurückgeben', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore Error'));

      const result = await textMatrixService.getAllTextMatrices(
        mockOrganizationId
      );

      expect(result).toEqual([]);
    });
  });

  describe('getTextMatricesByCompany', () => {
    it('sollte alle Text-Matrices für einen Kunden laden', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'matrix-1',
            data: () => ({ ...mockTextMatrix, id: 'matrix-1' }),
          },
        ],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await textMatrixService.getTextMatricesByCompany(
        mockCompanyId,
        mockOrganizationId
      );

      expect(result).toHaveLength(1);
      expect(result[0].companyId).toBe(mockCompanyId);
    });

    it('sollte leeres Array bei Fehler zurückgeben', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore Error'));

      const result = await textMatrixService.getTextMatricesByCompany(
        mockCompanyId,
        mockOrganizationId
      );

      expect(result).toEqual([]);
    });
  });
});
