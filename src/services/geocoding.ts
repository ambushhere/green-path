import axios from 'axios';
import type { LatLng, SearchLocation } from '@/types';

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org';

export const searchLocation = async (query: string): Promise<SearchLocation[]> => {
  if (!query.trim()) return [];
  
  try {
    const response = await axios.get(`${NOMINATIM_API_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'SafePath/1.0'
      },
      timeout: 5000
    });

    return response.data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};

export const reverseGeocode = async (location: LatLng): Promise<string> => {
  try {
    const response = await axios.get(`${NOMINATIM_API_URL}/reverse`, {
      params: {
        lat: location.lat,
        lon: location.lng,
        format: 'json',
        'accept-language': 'ru'
      },
      headers: {
        'User-Agent': 'SafePath/1.0'
      },
      timeout: 5000
    });
    
    return response.data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown location';
  }
};
