// src/lib/hooks/useDNASynthese.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import { DNASynthese, DNASyntheseCreateData, DNASyntheseUpdateData } from '@/types/dna-synthese';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook um die DNA Synthese eines Kunden zu laden
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit DNA Synthese
 *
 * @example
 * ```tsx
 * const { data: synthese, isLoading } = useDNASynthese(companyId);
 * ```
 */
export function useDNASynthese(
  companyId: string | undefined,
  options?: Omit<UseQueryOptions<DNASynthese | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['dnaSynthese', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return dnaSyntheseService.getSynthese(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um eine DNA Synthese zu erstellen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Erstellen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: createSynthese, isPending } = useCreateDNASynthese();
 * createSynthese({
 *   data: { companyId, content: '...', plainText: '...', ... },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useCreateDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      organizationId,
      userId,
    }: {
      data: DNASyntheseCreateData;
      organizationId: string;
      userId: string;
    }) => {
      return dnaSyntheseService.createSynthese(data, { organizationId, userId });
    },
    onSuccess: (_, { data }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', data.companyId],
      });
      // Invalidiere Marken-DNA Status (weil Synthese erstellt wurde)
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', data.companyId],
      });
    },
  });
}

/**
 * Hook um eine DNA Synthese zu aktualisieren
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Update
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: updateSynthese, isPending } = useUpdateDNASynthese();
 * updateSynthese({
 *   companyId: 'comp-123',
 *   data: { content: 'Updated...', manuallyEdited: true },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useUpdateDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
      organizationId,
      userId,
    }: {
      companyId: string;
      data: DNASyntheseUpdateData;
      organizationId: string;
      userId: string;
    }) => {
      return dnaSyntheseService.updateSynthese(companyId, data, { organizationId, userId });
    },
    onSuccess: (_, { companyId }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', companyId],
      });
    },
  });
}

/**
 * Hook um eine DNA Synthese zu loeschen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Loeschen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: deleteSynthese, isPending } = useDeleteDNASynthese();
 * deleteSynthese({ companyId: 'comp-123' });
 * ```
 */
export function useDeleteDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      return dnaSyntheseService.deleteSynthese(companyId);
    },
    onSuccess: (_, { companyId }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', companyId],
      });
    },
  });
}

/**
 * Hook um eine DNA Synthese mit KI zu generieren
 *
 * Dieser Hook:
 * 1. Exportiert alle 6 Marken-DNA Dokumente als Plain-Text
 * 2. Ruft die KI-API auf um eine komprimierte Synthese (~500 Tokens) zu erstellen
 * 3. Speichert das Ergebnis in Firestore
 *
 * @returns Mutation-Objekt mit synthesize-Funktion
 *
 * @example
 * ```tsx
 * const { mutate: synthesize, isPending } = useSynthesizeDNA();
 *
 * synthesize({
 *   companyId: 'comp-123',
 *   companyName: 'Müller GmbH',
 *   organizationId: 'org-123',
 *   language: 'de'
 * });
 * ```
 */
export function useSynthesizeDNA() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      companyId,
      companyName,
      organizationId,
      language = 'de',
    }: {
      companyId: string;
      companyName: string;
      organizationId: string;
      language?: 'de' | 'en';
    }): Promise<DNASynthese> => {
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }

      // 1. Alle Marken-DNA Dokumente als Plain-Text exportieren (inkl. Ansprechpartner)
      const markenDNAContent = await markenDNAService.exportForAI(companyId, organizationId);

      if (!markenDNAContent) {
        throw new Error('Keine Marken-DNA Dokumente gefunden');
      }

      // 2. Hash für Versions-Tracking berechnen
      const markenDNAVersion = await markenDNAService.computeMarkenDNAHash(companyId);

      // 3. Auth-Token holen
      const token = await user.getIdToken();

      // 4. KI-API aufrufen für Komprimierung
      const response = await fetch('/api/ai/dna-synthese', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          companyName,
          language,
          markenDNAContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'KI-Synthese fehlgeschlagen');
      }

      const result = await response.json();

      // 5. Ergebnis in Firestore speichern
      const syntheseData: DNASyntheseCreateData = {
        companyId,
        content: result.synthese, // KI-generierte Synthese
        plainText: result.synthese,
        synthesizedFrom: ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'],
        markenDNAVersion,
      };

      await dnaSyntheseService.createSynthese(syntheseData, {
        organizationId,
        userId: user.uid,
      });

      // 6. Gespeicherte Synthese zurückgeben
      const synthese = await dnaSyntheseService.getSynthese(companyId);
      if (!synthese) {
        throw new Error('DNA Synthese konnte nicht geladen werden');
      }

      return synthese;
    },
    onSuccess: (_, { companyId }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', companyId],
      });
      // Invalidiere Marken-DNA Status
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', companyId],
      });
    },
  });
}

/**
 * Hook um zu prüfen ob die DNA Synthese veraltet ist
 *
 * @param companyId - ID des Kunden
 * @returns Query mit isOutdated boolean
 */
export function useIsDNASyntheseOutdated(companyId: string | undefined) {
  return useQuery({
    queryKey: ['dnaSynthese', 'isOutdated', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return dnaSyntheseService.isOutdated(companyId);
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 Minute
  });
}
