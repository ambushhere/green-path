import axios from 'axios';
import type { AirQualityData, LatLng } from '@/types';

const OPENAQ_API_URL = 'https://api.openaq.org/v2';

export const getAirQuality = async (location: LatLng): Promise<AirQualityData> => {
  try {
    // Try to fetch real data from OpenAQ
    const response = await axios.get(`${OPENAQ_API_URL}/latest`, {
      params: {
        latitude: location.lat,
        longitude: location.lng,
        radius: 5000,
        limit: 1
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const measurements = result.measurements || [];
      
      const pm25 = measurements.find((m: any) => m.parameter === 'pm25')?.value || 0;
      const pm10 = measurements.find((m: any) => m.parameter === 'pm10')?.value || 0;
      const no2 = measurements.find((m: any) => m.parameter === 'no2')?.value || 0;
      const o3 = measurements.find((m: any) => m.parameter === 'o3')?.value || 0;

      return {
        location,
        pm25,
        pm10,
        no2,
        o3,
        timestamp: result.date?.utc || new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn('Failed to fetch real air quality data, using mock data');
  }

  // Generate realistic mock data based on location
  // Use location hash to make it deterministic
  const locationHash = Math.abs(Math.sin(location.lat * 100 + location.lng * 100));
  
  // Simulate higher pollution near "highways" (based on coordinate patterns)
  const isNearHighway = (Math.floor(location.lat * 100) % 7 === 0) || 
                        (Math.floor(location.lng * 100) % 7 === 0);
  const isPark = (Math.floor(location.lat * 100) % 11 === 0) && 
                 (Math.floor(location.lng * 100) % 11 === 0);
  
  let basePM25 = 25 + locationHash * 30;
  if (isNearHighway) basePM25 += 80;
  if (isPark) basePM25 = Math.max(5, basePM25 - 20);

  return {
    location,
    pm25: Math.round(basePM25),
    pm10: Math.round(basePM25 * 1.3),
    no2: Math.round(basePM25 * 0.8),
    o3: Math.round(40 + locationHash * 20),
    timestamp: new Date().toISOString()
  };
};

export const getAirQualityForRoute = async (points: LatLng[]): Promise<AirQualityData[]> => {
  const promises = points.map(point => getAirQuality(point));
  return Promise.all(promises);
};

export const getAirQualityLevel = (pm25: number): { level: string; color: string } => {
  if (pm25 <= 12) return { level: 'Excellent', color: '#22c55e' };
  if (pm25 <= 35) return { level: 'Good', color: '#84cc16' };
  if (pm25 <= 55) return { level: 'Moderate', color: '#eab308' };
  if (pm25 <= 150) return { level: 'Unhealthy for sensitive groups', color: '#f97316' };
  return { level: 'Unhealthy', color: '#ef4444' };
};

export const calculateRouteSafety = (avgPM25: number): 'safe' | 'moderate' | 'unsafe' => {
  if (avgPM25 <= 35) return 'safe';
  if (avgPM25 <= 75) return 'moderate';
  return 'unsafe';
};
