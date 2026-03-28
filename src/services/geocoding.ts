import axios from 'axios';
import type { LatLng, SearchLocation } from '@/types';
import { apiConfig } from './apiConfig';

const NOMINATIM_API_URL = apiConfig.getBaseUrl('geocoding');
const GEOCODING_LANGUAGE = import.meta.env.VITE_GEOCODING_LANGUAGE || 'en';

type NominatimSearchItem = {
  display_name: string;
  lat: string;
  lon: string;
};

type NominatimReverseResponse = {
  display_name?: string;
};

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

const searchCache = new Map<string, { expiresAt: number; results: SearchLocation[] }>();

const getSearchCacheKey = (query: string): string => query.trim().toLowerCase();

const getCachedSearchResults = (query: string): SearchLocation[] | null => {
  const key = getSearchCacheKey(query);
  const cachedEntry = searchCache.get(key);
  if (!cachedEntry) return null;

  if (cachedEntry.expiresAt < Date.now()) {
    searchCache.delete(key);
    return null;
  }

  return cachedEntry.results;
};

const cacheSearchResults = (query: string, results: SearchLocation[]) => {
  const key = getSearchCacheKey(query);
  searchCache.set(key, {
    results,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
};

export const searchLocation = async (query: string): Promise<SearchLocation[]> => {
  if (!query.trim()) return [];

  const cachedResults = getCachedSearchResults(query);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const response = await axios.get<NominatimSearchItem[]>(`${NOMINATIM_API_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        'accept-language': GEOCODING_LANGUAGE,
      },
      headers: {
        'User-Agent': 'SafePath/1.0',
      },
      timeout: 5000,
    });

    const results = response.data.map((item) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    cacheSearchResults(query, results);
    return results;
  } catch {
    throw new Error('Could not fetch location suggestions. Check your connection or API proxy settings.');
  }
};

export const reverseGeocode = async (location: LatLng): Promise<string> => {
  try {
    const response = await axios.get<NominatimReverseResponse>(`${NOMINATIM_API_URL}/reverse`, {
      params: {
        lat: location.lat,
        lon: location.lng,
        format: 'json',
        'accept-language': GEOCODING_LANGUAGE,
      },
      headers: {
        'User-Agent': 'SafePath/1.0',
      },
      timeout: 5000,
    });

    return response.data.display_name || 'Unknown location';
  } catch {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
};
