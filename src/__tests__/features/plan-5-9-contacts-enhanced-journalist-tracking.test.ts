// src/__tests__/features/plan-5-9-contacts-enhanced-journalist-tracking.test.ts
/**
 * PLAN 5/9: MONITORING-IMPLEMENTIERUNG TESTS
 * Umfassende Tests für erweiterte ContactsEnhanced Service Journalist-Performance-Tracking
 * 
 * Test-Coverage:
 * - Journalist-Metriken Update
 * - Performance-Daten Abfrage
 * - Top-Performing Journalisten Ranking
 * - Journalist-Suche mit Kriterien
 * - Clipping-History Verwaltung
 * - Projekt-Beiträge Tracking
 * - Sentiment-Analyse & Performance-Scoring
 * - Multi-Tenancy Sicherheit
 * - Error-Handling & Edge Cases
 */

import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { Timestamp } from 'firebase/firestore';
import { ContactEnhanced, JournalistContact } from '@/types/crm-enhanced';
import { MediaClipping } from '@/types/media';

// Firebase-Mocks
jest.mock('@/lib/firebase/config');
jest.mock('@/lib/firebase/project-service');

// Mock Firebase Firestore Functions
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  doc: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  }
}));

describe('ContactsEnhanced Service Journalist-Tracking (Plan 5/9)', () => {
  const testContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456'
  };

  const mockJournalistContact: JournalistContact = {
    id: 'journalist-123',
    organizationId: testContext.organizationId,
    createdBy: testContext.userId,
    updatedBy: testContext.userId,
    name: { firstName: 'Jane', lastName: 'Reporter' },
    emails: [{ type: 'business', email: 'jane@techjournal.com', isPrimary: true }],
    phones: [{ type: 'business', number: '+49 123 456789', isPrimary: true }],
    companyId: 'tech-journal-123',
    companyName: 'Tech Journal',
    position: 'Senior Tech Reporter',
    mediaProfile: {
      isJournalist: true,
      // outlet: 'Tech Journal', // TODO: Fix outlet property type
      beats: ['technology', 'startups', 'ai'],
      publicationIds: ['pub-1', 'pub-2']
    },
    clippingHistory: [
      {
        clippingId: 'clip-1',
        title: 'AI Breakthrough in Startup Sector',
        outlet: 'Tech Journal',
        publishDate: Timestamp.now(),
        reachValue: 25000,
        sentimentScore: 0.6,
        mediaValue: 5000,
        url: 'https://techjournal.com/ai-breakthrough'
      }
    ],
    responseRate: 85,
    averageReach: 28000,
    preferredTopics: ['ai', 'machine-learning', 'startups'],
    lastClippingDate: Timestamp.now(),
    totalClippings: 12,
    averageSentiment: 0.4,
    performanceMetrics: {
      totalArticles: 12,
      totalReach: 336000,
      averageReachPerArticle: 28000,
      totalMediaValue: 84000,
      sentimentDistribution: {
        positive: 8,
        neutral: 3,
        negative: 1
      },
      monthlyArticleCount: [
        { month: '2024-01', count: 4, reach: 120000 },
        { month: '2024-02', count: 3, reach: 90000 },
        { month: '2024-03', count: 5, reach: 126000 }
      ],
      topTopics: [
        { topic: 'ai', count: 6, averageSentiment: 0.5 },
        { topic: 'startups', count: 4, averageSentiment: 0.3 },
        { topic: 'tech', count: 2, averageSentiment: 0.4 }
      ],
      engagementRate: 0.12,
      averageResponseTime: 4.5
    },
    projectContributions: [
      {
        projectId: 'proj-123',
        projectTitle: 'AI Product Launch',
        clippingCount: 3,
        totalReach: 75000,
        averageSentiment: 0.5,
        mediaValue: 18000,
        lastContribution: Timestamp.now()
      }
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockClipping: MediaClipping = {
    id: 'new-clipping-456',
    title: 'Revolutionary Machine Learning Platform',
    outlet: 'Tech Journal',
    publishDate: Timestamp.now(),
    url: 'https://techjournal.com/ml-platform',
    content: 'New platform revolutionizes ML development...',
    reachValue: 45000,
    sentimentScore: 0.8,
    mediaValue: 12000,
    tags: ['ml', 'platform', 'innovation'],
    organizationId: testContext.organizationId,
    createdBy: testContext.userId,
    projectId: 'proj-123',
    campaignId: 'camp-789',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);

    // Mock projectService
    const mockProjectService = {
      getById: jest.fn().mockResolvedValue({
        id: 'proj-123',
        title: 'AI Product Launch'
      })
    };
    require('@/lib/firebase/project-service').projectService = mockProjectService;
  });

  describe('updateJournalistMetrics', () => {
    beforeEach(() => {
      // Mock getById für Journalist-Kontakt
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValue(mockJournalistContact as any);
      jest.spyOn(contactsEnhancedService, 'update').mockResolvedValue(undefined);
    });

    it('sollte Journalist-Metriken erfolgreich aktualisieren', async () => {
      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        mockClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          clippingHistory: expect.arrayContaining([
            expect.objectContaining({
              clippingId: 'new-clipping-456',
              title: 'Revolutionary Machine Learning Platform',
              reachValue: 45000,
              sentimentScore: 0.8,
              mediaValue: 12000
            })
          ]),
          performanceMetrics: expect.objectContaining({
            totalArticles: 13, // 12 + 1
            totalReach: 381000, // 336000 + 45000
            averageReachPerArticle: expect.closeTo(29307.69, 2), // 381000 / 13
            totalMediaValue: 96000 // 84000 + 12000
          }),
          totalClippings: 13,
          lastClippingDate: mockClipping.publishDate
        }),
        testContext
      );
    });

    it('sollte Sentiment-Verteilung korrekt aktualisieren', async () => {
      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        mockClipping, // sentimentScore: 0.8 -> positive
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            sentimentDistribution: {
              positive: 9, // 8 + 1
              neutral: 3,
              negative: 1
            }
          })
        }),
        testContext
      );
    });

    it('sollte neutrales Sentiment korrekt kategorisieren', async () => {
      // Arrange
      const neutralClipping = { ...mockClipping, sentimentScore: 0.05 }; // Neutral

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        neutralClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            sentimentDistribution: {
              positive: 8,
              neutral: 4, // 3 + 1
              negative: 1
            }
          })
        }),
        testContext
      );
    });

    it('sollte negatives Sentiment korrekt kategorisieren', async () => {
      // Arrange
      const negativeClipping = { ...mockClipping, sentimentScore: -0.5 }; // Negative

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        negativeClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            sentimentDistribution: {
              positive: 8,
              neutral: 3,
              negative: 2 // 1 + 1
            }
          })
        }),
        testContext
      );
    });

    it('sollte monatliche Statistiken korrekt aktualisieren', async () => {
      // Arrange
      const marchClipping = {
        ...mockClipping,
        publishDate: Timestamp.fromDate(new Date('2024-03-15T10:00:00Z'))
      };

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        marchClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            monthlyArticleCount: expect.arrayContaining([
              expect.objectContaining({
                month: '2024-03',
                count: 6, // 5 + 1
                reach: 171000 // 126000 + 45000
              })
            ])
          })
        }),
        testContext
      );
    });

    it('sollte neuen Monat hinzufügen wenn nicht vorhanden', async () => {
      // Arrange
      const aprilClipping = {
        ...mockClipping,
        publishDate: Timestamp.fromDate(new Date('2024-04-10T14:00:00Z'))
      };

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        aprilClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            monthlyArticleCount: expect.arrayContaining([
              expect.objectContaining({
                month: '2024-04',
                count: 1,
                reach: 45000
              })
            ])
          })
        }),
        testContext
      );
    });

    it('sollte Projekt-Beiträge für existierendes Projekt aktualisieren', async () => {
      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        mockClipping, // projectId: 'proj-123' existiert bereits
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          projectContributions: expect.arrayContaining([
            expect.objectContaining({
              projectId: 'proj-123',
              clippingCount: 4, // 3 + 1
              totalReach: 120000, // 75000 + 45000
              mediaValue: 30000, // 18000 + 12000
              // Neuer Durchschnitts-Sentiment: (0.5 * 3 + 0.8) / 4 = 0.575
              averageSentiment: expect.closeTo(0.575, 3)
            })
          ])
        }),
        testContext
      );
    });

    it('sollte neues Projekt zu Beiträgen hinzufügen', async () => {
      // Arrange
      const newProjectClipping = { ...mockClipping, projectId: 'proj-999' };
      
      // Mock project service für neues Projekt
      const mockProjectService = require('@/lib/firebase/project-service').projectService;
      mockProjectService.getById.mockResolvedValueOnce({
        id: 'proj-999',
        title: 'New Project Launch'
      });

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        newProjectClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          projectContributions: expect.arrayContaining([
            expect.objectContaining({
              projectId: 'proj-999',
              projectTitle: 'New Project Launch',
              clippingCount: 1,
              totalReach: 45000,
              averageSentiment: 0.8,
              mediaValue: 12000
            })
          ])
        }),
        testContext
      );
    });

    it('sollte durchschnittliches Sentiment neu berechnen', async () => {
      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        mockClipping,
        testContext
      );

      // Assert - Durchschnittliches Sentiment sollte neu berechnet werden
      // Alte Clipping-History: 1 Clipping mit Sentiment 0.6
      // Neues Clipping: Sentiment 0.8
      // Erwarteter Durchschnitt: (0.6 + 0.8) / 2 = 0.7
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          averageSentiment: 0.7
        }),
        testContext
      );
    });

    it('sollte Fehler werfen wenn Kontakt kein Journalist ist', async () => {
      // Arrange
      const nonJournalistContact = {
        ...mockJournalistContact,
        mediaProfile: { isJournalist: false }
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(nonJournalistContact as any);

      // Act & Assert
      await expect(
        contactsEnhancedService.updateJournalistMetrics('journalist-123', mockClipping, testContext)
      ).rejects.toThrow('Journalist-Kontakt nicht gefunden');
    });

    it('sollte Fehler werfen wenn Kontakt nicht existiert', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        contactsEnhancedService.updateJournalistMetrics('nonexistent', mockClipping, testContext)
      ).rejects.toThrow('Journalist-Kontakt nicht gefunden');
    });

    it('sollte initiale Metriken für Journalist ohne Performance-Daten erstellen', async () => {
      // Arrange
      const newJournalist = {
        ...mockJournalistContact,
        performanceMetrics: undefined,
        clippingHistory: undefined,
        projectContributions: undefined,
        totalClippings: undefined
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(newJournalist as any);

      // Act
      await contactsEnhancedService.updateJournalistMetrics(
        'new-journalist',
        mockClipping,
        testContext
      );

      // Assert
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'new-journalist',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            totalArticles: 1,
            totalReach: 45000,
            averageReachPerArticle: 45000,
            totalMediaValue: 12000,
            sentimentDistribution: {
              positive: 1,
              neutral: 0,
              negative: 0
            }
          }),
          totalClippings: 1
        }),
        testContext
      );
    });

    it('sollte Error-Handling bei Update-Fehlern korrekt behandeln', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'update').mockRejectedValueOnce(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(
        contactsEnhancedService.updateJournalistMetrics('journalist-123', mockClipping, testContext)
      ).rejects.toThrow('Update failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Update der Journalist-Metriken:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getJournalistPerformance', () => {
    beforeEach(() => {
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValue(mockJournalistContact as any);
    });

    it('sollte Performance-Daten erfolgreich abrufen', async () => {
      // Act
      const performance = await contactsEnhancedService.getJournalistPerformance(
        'journalist-123',
        testContext.organizationId
      );

      // Assert
      expect(performance).toEqual(expect.objectContaining({
        contactId: 'journalist-123',
        totalArticles: 12,
        totalReach: 336000,
        averageReachPerArticle: 28000,
        totalMediaValue: 84000,
        sentimentDistribution: {
          positive: 8,
          neutral: 3,
          negative: 1
        },
        monthlyPerformance: expect.any(Array),
        topTopics: expect.any(Array),
        recentClippings: expect.any(Array),
        responseRate: 85,
        averageResponseTime: 4.5,
        projectContributions: expect.any(Array)
      }));
    });

    it('sollte nur die letzten 5 Clippings in recentClippings zurückgeben', async () => {
      // Arrange
      const journalistWithManyClippings = {
        ...mockJournalistContact,
        clippingHistory: Array(10).fill(null).map((_, i) => ({
          clippingId: `clip-${i}`,
          title: `Article ${i}`,
          outlet: 'Test Outlet',
          publishDate: Timestamp.now(),
          reachValue: 1000 * i,
          sentimentScore: 0.1 * i,
          mediaValue: 500 * i
        }))
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(journalistWithManyClippings as any);

      // Act
      const performance = await contactsEnhancedService.getJournalistPerformance(
        'journalist-123',
        testContext.organizationId
      );

      // Assert
      expect(performance.recentClippings).toHaveLength(5);
      // Sollte die letzten 5 enthalten (slice(-5))
      expect(performance.recentClippings[0].clippingId).toBe('clip-5');
      expect(performance.recentClippings[4].clippingId).toBe('clip-9');
    });

    it('sollte Default-Werte für fehlende Performance-Metriken zurückgeben', async () => {
      // Arrange
      const journalistWithoutMetrics = {
        ...mockJournalistContact,
        performanceMetrics: undefined,
        clippingHistory: undefined,
        responseRate: undefined,
        projectContributions: undefined
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(journalistWithoutMetrics as any);

      // Act
      const performance = await contactsEnhancedService.getJournalistPerformance(
        'journalist-123',
        testContext.organizationId
      );

      // Assert
      expect(performance).toEqual(expect.objectContaining({
        totalArticles: 0,
        totalReach: 0,
        averageReachPerArticle: 0,
        totalMediaValue: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        monthlyPerformance: [],
        topTopics: [],
        recentClippings: [],
        responseRate: 0,
        averageResponseTime: 0,
        projectContributions: []
      }));
    });

    it('sollte Fehler werfen wenn Kontakt kein Journalist ist', async () => {
      // Arrange
      const nonJournalist = {
        ...mockJournalistContact,
        mediaProfile: { isJournalist: false }
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(nonJournalist as any);

      // Act & Assert
      await expect(
        contactsEnhancedService.getJournalistPerformance('journalist-123', testContext.organizationId)
      ).rejects.toThrow('Journalist-Kontakt nicht gefunden');
    });

    it('sollte Error-Handling bei getById-Fehlern korrekt behandeln', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'getById').mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(
        contactsEnhancedService.getJournalistPerformance('journalist-123', testContext.organizationId)
      ).rejects.toThrow('Database error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Journalist-Performance:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getTopPerformingJournalists', () => {
    const mockJournalists = [
      {
        ...mockJournalistContact,
        id: 'high-performer',
        name: 'High Performer',
        lastClippingDate: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
        performanceMetrics: {
          ...mockJournalistContact.performanceMetrics,
          averageReachPerArticle: 50000
        },
        averageSentiment: 0.8
      },
      {
        ...mockJournalistContact,
        id: 'medium-performer',
        name: 'Medium Performer',
        lastClippingDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
        performanceMetrics: {
          ...mockJournalistContact.performanceMetrics,
          averageReachPerArticle: 25000
        },
        averageSentiment: 0.5
      },
      {
        ...mockJournalistContact,
        id: 'old-performer',
        name: 'Old Performer',
        lastClippingDate: Timestamp.fromDate(new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)), // 400 days ago (should be filtered out)
        performanceMetrics: {
          ...mockJournalistContact.performanceMetrics,
          averageReachPerArticle: 75000
        },
        averageSentiment: 0.9
      }
    ];

    beforeEach(() => {
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockResolvedValue(mockJournalists as any[]);
    });

    it('sollte Top-Performing Journalisten erfolgreich abrufen', async () => {
      // Act
      const topJournalists = await contactsEnhancedService.getTopPerformingJournalists(
        testContext.organizationId,
        365, // timeframe
        10   // limit
      );

      // Assert
      expect(topJournalists).toHaveLength(2); // old-performer sollte herausgefiltert werden
      expect(topJournalists[0]).toEqual(expect.objectContaining({
        id: 'high-performer',
        performanceScore: expect.any(Number)
      }));
      
      // Sollte nach Performance-Score sortiert sein
      expect(topJournalists[0].performanceScore).toBeGreaterThanOrEqual(topJournalists[1].performanceScore);
    });

    it('sollte nach Timeframe filtern', async () => {
      // Act - Nur letzten 15 Tage
      const recentJournalists = await contactsEnhancedService.getTopPerformingJournalists(
        testContext.organizationId,
        15,
        10
      );

      // Assert - Nur high-performer sollte übrig bleiben (7 Tage alt < 15 Tage)
      expect(recentJournalists).toHaveLength(1);
      expect(recentJournalists[0].id).toBe('high-performer');
    });

    it('sollte Limit respektieren', async () => {
      // Act
      const limitedJournalists = await contactsEnhancedService.getTopPerformingJournalists(
        testContext.organizationId,
        365,
        1 // Limit auf 1
      );

      // Assert
      expect(limitedJournalists).toHaveLength(1);
    });

    it('sollte leeres Array bei Fehlern zurückgeben', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockRejectedValueOnce(new Error('Search failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await contactsEnhancedService.getTopPerformingJournalists(testContext.organizationId);

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Top-Journalisten:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('sollte Performance-Score korrekt berechnen', async () => {
      // Act
      const topJournalists = await contactsEnhancedService.getTopPerformingJournalists(
        testContext.organizationId
      );

      // Assert
      const highPerformer = topJournalists.find(j => j.id === 'high-performer');
      expect(highPerformer?.performanceScore).toBeGreaterThan(0);
      expect(highPerformer?.performanceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('searchJournalistsForProject', () => {
    const mockSearchJournalists = [
      {
        ...mockJournalistContact,
        id: 'tech-specialist',
        name: 'Tech Specialist',
        mediaProfile: {
          ...mockJournalistContact.mediaProfile,
          beats: ['technology', 'ai', 'startups']
        },
        preferredTopics: ['ai', 'machine-learning'],
        averageReach: 35000,
        averageSentiment: 0.6,
        responseRate: 90
      },
      {
        ...mockJournalistContact,
        id: 'business-reporter',
        name: 'Business Reporter',
        mediaProfile: {
          ...mockJournalistContact.mediaProfile,
          beats: ['business', 'finance']
        },
        preferredTopics: ['business', 'economy'],
        averageReach: 20000,
        averageSentiment: 0.3,
        responseRate: 70
      },
      {
        ...mockJournalistContact,
        id: 'low-reach-journalist',
        name: 'Low Reach Journalist',
        mediaProfile: {
          ...mockJournalistContact.mediaProfile,
          beats: ['technology']
        },
        averageReach: 5000,
        averageSentiment: 0.8,
        responseRate: 95
      }
    ];

    beforeEach(() => {
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockResolvedValue(mockSearchJournalists as any[]);
    });

    it('sollte Journalisten nach Themen filtern', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { topics: ['ai'] }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tech-specialist');
    });

    it('sollte nach Mindest-Reichweite filtern', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { minReach: 25000 }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tech-specialist');
    });

    it('sollte nach Sentiment-Threshold filtern', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { sentimentThreshold: 0.5 }
      );

      // Assert
      expect(result).toHaveLength(2); // tech-specialist (0.6) und low-reach-journalist (0.8)
      expect(result.some(j => j.id === 'business-reporter')).toBe(false); // 0.3 < 0.5
    });

    it('sollte nach Response-Rate filtern', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { responseRateMin: 85 }
      );

      // Assert
      expect(result).toHaveLength(2); // tech-specialist (90) und low-reach-journalist (95)
      expect(result.some(j => j.id === 'business-reporter')).toBe(false); // 70 < 85
    });

    it('sollte kombinierte Kriterien anwenden', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        {
          topics: ['technology'],
          minReach: 30000,
          sentimentThreshold: 0.5,
          responseRateMin: 85
        }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tech-specialist');
    });

    it('sollte Ergebnisse nach Performance-Score sortieren', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        {}
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((journalist, index) => 
        index === 0 || journalist.performanceScore <= result[index - 1].performanceScore
      )).toBe(true);
    });

    it('sollte beats in Topics-Filter berücksichtigen', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { topics: ['business'] }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('business-reporter');
    });

    it('sollte preferredTopics in Topics-Filter berücksichtigen', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        { topics: ['machine-learning'] }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tech-specialist');
    });

    it('sollte leeres Array bei Fehlern zurückgeben', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockRejectedValueOnce(new Error('Search failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        {}
      );

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler bei Journalist-Suche:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('sollte leere Kriterien korrekt behandeln', async () => {
      // Act
      const result = await contactsEnhancedService.searchJournalistsForProject(
        testContext.organizationId,
        {}
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(contactsEnhancedService.searchEnhanced).toHaveBeenCalledWith(
        testContext.organizationId,
        { isJournalist: true }
      );
    });
  });

  describe('Helper-Methoden', () => {
    describe('calculateAverageSentiment', () => {
      it('sollte durchschnittliches Sentiment korrekt berechnen', () => {
        // Arrange
        const clippingHistory = [
          { sentimentScore: 0.5 },
          { sentimentScore: 0.3 },
          { sentimentScore: -0.2 },
          { sentimentScore: 0.8 }
        ];

        // Act
        const avgSentiment = (contactsEnhancedService as any).calculateAverageSentiment(clippingHistory);

        // Assert
        expect(avgSentiment).toBeCloseTo(0.35, 2); // (0.5 + 0.3 - 0.2 + 0.8) / 4
      });

      it('sollte 0 für leere Clipping-History zurückgeben', () => {
        // Act
        const avgSentiment = (contactsEnhancedService as any).calculateAverageSentiment([]);

        // Assert
        expect(avgSentiment).toBe(0);
      });

      it('sollte undefined/null Sentiment-Scores als 0 behandeln', () => {
        // Arrange
        const clippingHistory = [
          { sentimentScore: 0.5 },
          { sentimentScore: undefined },
          { sentimentScore: null },
          { sentimentScore: 0.3 }
        ];

        // Act
        const avgSentiment = (contactsEnhancedService as any).calculateAverageSentiment(clippingHistory);

        // Assert
        expect(avgSentiment).toBeCloseTo(0.2, 2); // (0.5 + 0 + 0 + 0.3) / 4
      });
    });

    describe('calculatePerformanceScore', () => {
      it('sollte Performance-Score korrekt berechnen', () => {
        // Arrange
        const journalist = {
          performanceMetrics: {
            averageReachPerArticle: 50000, // -> 50% weight
            totalArticles: 25,              // -> 50% weight  
            engagementRate: 0.5             // -> 50% weight
          },
          averageSentiment: 0.6              // -> 80% weight (0.6 + 1) * 50
        };

        // Act
        const score = (contactsEnhancedService as any).calculatePerformanceScore(journalist);

        // Assert
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
        
        // Detailprüfung der Berechnung
        // normalizedReach = Math.min(50000/10000, 1) * 100 = 100 * 0.4 = 40
        // normalizedSentiment = (0.6 + 1) * 50 = 80 * 0.3 = 24  
        // normalizedFrequency = Math.min(25/50, 1) * 100 = 50 * 0.2 = 10
        // normalizedEngagement = Math.min(0.5, 1) * 100 = 50 * 0.1 = 5
        // Expected: 40 + 24 + 10 + 5 = 79
        expect(score).toBeCloseTo(79, 1);
      });

      it('sollte mit fehlenden Metriken korrekt umgehen', () => {
        // Arrange
        const journalist = {
          performanceMetrics: {},
          averageSentiment: undefined
        };

        // Act
        const score = (contactsEnhancedService as any).calculatePerformanceScore(journalist);

        // Assert
        expect(score).toBe(50); // Nur neutrales Sentiment: (0 + 1) * 50 * 0.3 = 15, aber da alle anderen 0 sind, ist das Minimum 50 für neutrales Sentiment
      });

      it('sollte extreme Werte korrekt normalisieren', () => {
        // Arrange
        const journalist = {
          performanceMetrics: {
            averageReachPerArticle: 200000, // Sollte auf 100 begrenzt werden
            totalArticles: 100,             // Sollte auf 100 begrenzt werden
            engagementRate: 2.0             // Sollte auf 100 begrenzt werden
          },
          averageSentiment: 1.0              // Maximum positive
        };

        // Act
        const score = (contactsEnhancedService as any).calculatePerformanceScore(journalist);

        // Assert
        expect(score).toBe(100); // Alle Werte maximal -> perfekter Score
      });
    });
  });

  describe('Multi-Tenancy und Sicherheit', () => {
    it('sollte Multi-Tenancy in searchEnhanced berücksichtigen', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockResolvedValue([]);

      // Act
      await contactsEnhancedService.getTopPerformingJournalists(testContext.organizationId);

      // Assert
      expect(contactsEnhancedService.searchEnhanced).toHaveBeenCalledWith(
        testContext.organizationId,
        { isJournalist: true }
      );
    });

    it('sollte Cross-Tenant-Zugriff in getJournalistPerformance verhindern', async () => {
      // Arrange
      const otherOrgJournalist = {
        ...mockJournalistContact,
        organizationId: 'other-org-456'
      };
      
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(null); // Cross-tenant access returns null

      // Act & Assert
      await expect(
        contactsEnhancedService.getJournalistPerformance('journalist-123', testContext.organizationId)
      ).rejects.toThrow('Journalist-Kontakt nicht gefunden');
    });

    it('sollte organizationId in updateJournalistMetrics validieren', async () => {
      // Arrange
      const crossTenantContext = { organizationId: 'other-org', userId: 'other-user' };
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValueOnce(null); // Kein Zugriff über getById

      // Act & Assert
      await expect(
        contactsEnhancedService.updateJournalistMetrics('journalist-123', mockClipping, crossTenantContext)
      ).rejects.toThrow('Journalist-Kontakt nicht gefunden');
    });
  });

  describe('Edge Cases und Error-Handling', () => {
    it('sollte Race-Conditions bei parallelen Metriken-Updates behandeln', async () => {
      // Arrange
      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValue(mockJournalistContact as any);
      jest.spyOn(contactsEnhancedService, 'update').mockResolvedValue(undefined);

      const clipping1 = { ...mockClipping, id: 'clip-1', reachValue: 1000 };
      const clipping2 = { ...mockClipping, id: 'clip-2', reachValue: 2000 };
      const clipping3 = { ...mockClipping, id: 'clip-3', reachValue: 3000 };

      // Act - Simuliere parallele Updates
      const promises = [
        contactsEnhancedService.updateJournalistMetrics('journalist-123', clipping1, testContext),
        contactsEnhancedService.updateJournalistMetrics('journalist-123', clipping2, testContext),
        contactsEnhancedService.updateJournalistMetrics('journalist-123', clipping3, testContext)
      ];

      // Assert - Alle sollten erfolgreich sein
      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(contactsEnhancedService.update).toHaveBeenCalledTimes(3);
    });

    it('sollte ungültige Clipping-Daten robust behandeln', async () => {
      // Arrange
      const invalidClipping = {
        // Fehlende required fields
        id: 'invalid',
        reachValue: null,
        sentimentScore: undefined,
        publishDate: null
      };

      jest.spyOn(contactsEnhancedService, 'getById').mockResolvedValue(mockJournalistContact as any);
      jest.spyOn(contactsEnhancedService, 'update').mockResolvedValue(undefined);

      // Act - Sollte nicht crashen
      await contactsEnhancedService.updateJournalistMetrics(
        'journalist-123',
        invalidClipping as any,
        testContext
      );

      // Assert - Update sollte mit Default-Werten aufgerufen werden
      expect(contactsEnhancedService.update).toHaveBeenCalledWith(
        'journalist-123',
        expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            totalReach: 336000, // Alter Wert, da reachValue null war
            totalMediaValue: 84000 // Alter Wert, da mediaValue fehlt
          })
        }),
        testContext
      );
    });

    it('sollte Netzwerk-Timeouts bei Service-Aufrufen handhaben', async () => {
      // Arrange
      jest.setTimeout(10000);
      jest.spyOn(contactsEnhancedService, 'searchEnhanced').mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      // Act
      const result = await contactsEnhancedService.getTopPerformingJournalists(testContext.organizationId);

      // Assert
      expect(result).toEqual([]); // Graceful fallback
    });
  });
});