// src/lib/ai/flows/media-research/googlePlacesSearchFlow.ts
// Genkit Flow für die Google Places API Medien-Suche

import { ai } from '../../genkit-config';
import {
  GooglePlacesSearchInputSchema,
  GooglePlacesSearchOutputSchema,
  type GooglePlacesSearchInput,
  type GooglePlacesSearchOutput,
  type MediaPlace,
} from '../../schemas/media-research-schemas';

// ══════════════════════════════════════════════════════════════
// KONSTANTEN
// ══════════════════════════════════════════════════════════════

/**
 * Standard-Suchbegriffe für Medienunternehmen
 */
const DEFAULT_MEDIA_SEARCH_TERMS = [
  'Zeitung',
  'Verlag',
  'Redaktion',
  'Medienhaus',
  'Tageszeitung',
  'Wochenzeitung',
  'Lokalzeitung',
  'Anzeigenblatt',
  'Newsroom',
  'Presse',
];

/**
 * Google Places API Kosten (Stand März 2025)
 * Text Search (New): $0.032 pro Anfrage
 * Place Details (New): $0.017 pro Anfrage
 */
const COSTS = {
  TEXT_SEARCH: 0.032,
  PLACE_DETAILS: 0.017,
};

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Führt eine Google Places Text Search durch
 */
async function textSearch(
  query: string,
  center: { lat: number; lng: number },
  radiusMeters: number,
  apiKey: string
): Promise<any[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const body = {
    textQuery: query,
    locationBias: {
      circle: {
        center: {
          latitude: center.lat,
          longitude: center.lng,
        },
        radius: radiusMeters,
      },
    },
    languageCode: 'de',
    maxResultCount: 20,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types,places.rating,places.addressComponents',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GooglePlaces] Text Search Error:', response.status, errorText);
    throw new Error(`Google Places API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.places || [];
}

/**
 * Lädt Place Details für erweiterte Informationen
 */
async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<any | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,internationalPhoneNumber,addressComponents,types,rating,regularOpeningHours',
    },
  });

  if (!response.ok) {
    console.warn('[GooglePlaces] Details Error for', placeId, ':', response.status);
    return null;
  }

  return await response.json();
}

/**
 * Extrahiert die Stadt aus den Address Components
 */
function extractCity(addressComponents: any[] | undefined): string | undefined {
  if (!addressComponents) return undefined;

  const cityComponent = addressComponents.find((comp: any) =>
    comp.types?.includes('locality') ||
    comp.types?.includes('administrative_area_level_3')
  );

  return cityComponent?.longText || cityComponent?.shortText;
}

/**
 * Filtert und dedupliziert Ergebnisse basierend auf Place ID und Name
 */
function deduplicatePlaces(places: MediaPlace[]): MediaPlace[] {
  const seen = new Map<string, MediaPlace>();

  for (const place of places) {
    // Deduplizierung nach Place ID (primär) und normalisiertem Namen (sekundär)
    const normalizedName = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!seen.has(place.placeId) && !seen.has(normalizedName)) {
      seen.set(place.placeId, place);
      seen.set(normalizedName, place);
    }
  }

  // Nur die Place IDs zurückgeben (nicht die Namen-Duplikate)
  const unique: MediaPlace[] = [];
  const addedIds = new Set<string>();

  for (const [key, place] of seen) {
    if (!addedIds.has(place.placeId)) {
      unique.push(place);
      addedIds.add(place.placeId);
    }
  }

  return unique;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * googlePlacesSearchFlow
 *
 * Durchsucht Google Places nach Medienunternehmen in einer Region.
 * Kombiniert mehrere Suchbegriffe und dedupliziert Ergebnisse.
 */
export const googlePlacesSearchFlow = ai.defineFlow(
  {
    name: 'googlePlacesSearchFlow',
    inputSchema: GooglePlacesSearchInputSchema,
    outputSchema: GooglePlacesSearchOutputSchema,
  },
  async (input: GooglePlacesSearchInput): Promise<GooglePlacesSearchOutput> => {
    console.log('[GooglePlacesSearch] Start für Region:', input.region);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY ist nicht gesetzt in .env.local');
    }

    const radiusMeters = input.radiusKm * 1000;
    const searchTerms = input.searchTerms?.length
      ? input.searchTerms
      : DEFAULT_MEDIA_SEARCH_TERMS;

    let textSearchRequests = 0;
    let placeDetailsRequests = 0;
    const allPlaces: MediaPlace[] = [];

    // Für jeden Suchbegriff eine Suche durchführen
    for (const term of searchTerms) {
      const query = `${term} ${input.region}`;
      console.log('[GooglePlacesSearch] Suche:', query);

      try {
        const places = await textSearch(query, input.center, radiusMeters, apiKey);
        textSearchRequests++;

        console.log(`[GooglePlacesSearch] "${term}": ${places.length} Treffer`);

        for (const place of places) {
          // Basis-Daten aus Text Search
          const mediaPlace: MediaPlace = {
            placeId: place.id,
            name: place.displayName?.text || 'Unbekannt',
            address: place.formattedAddress,
            city: extractCity(place.addressComponents),
            phone: place.nationalPhoneNumber,
            website: place.websiteUri,
            types: place.types,
            rating: place.rating,
            searchTerm: term,
          };

          allPlaces.push(mediaPlace);
        }
      } catch (error) {
        console.error(`[GooglePlacesSearch] Fehler bei "${term}":`, error);
        // Fehler loggen aber weitermachen
      }

      // Rate Limiting: Kurze Pause zwischen Anfragen
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Deduplizieren
    const uniquePlaces = deduplicatePlaces(allPlaces);
    console.log(`[GooglePlacesSearch] Nach Deduplizierung: ${uniquePlaces.length} von ${allPlaces.length}`);

    // Für Places ohne Website: Details laden um Website zu bekommen
    const placesWithoutWebsite = uniquePlaces.filter(p => !p.website);
    console.log(`[GooglePlacesSearch] Lade Details für ${placesWithoutWebsite.length} Places ohne Website`);

    for (const place of placesWithoutWebsite) {
      try {
        const details = await getPlaceDetails(place.placeId, apiKey);
        placeDetailsRequests++;

        if (details) {
          place.website = details.websiteUri || place.website;
          place.phone = details.nationalPhoneNumber || details.internationalPhoneNumber || place.phone;
          place.city = extractCity(details.addressComponents) || place.city;
        }
      } catch (error) {
        console.warn('[GooglePlacesSearch] Details-Fehler für', place.name);
      }

      // Rate Limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Kosten berechnen
    const estimatedCostUSD =
      (textSearchRequests * COSTS.TEXT_SEARCH) +
      (placeDetailsRequests * COSTS.PLACE_DETAILS);

    console.log('[GooglePlacesSearch] Abgeschlossen:', {
      gefunden: uniquePlaces.length,
      textSearchRequests,
      placeDetailsRequests,
      geschätzteKosten: `$${estimatedCostUSD.toFixed(2)}`,
    });

    return {
      places: uniquePlaces,
      totalFound: uniquePlaces.length,
      searchTermsUsed: searchTerms,
      region: input.region,
      cost: {
        textSearchRequests,
        placeDetailsRequests,
        estimatedCostUSD,
      },
    };
  }
);
