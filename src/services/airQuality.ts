import axios from 'axios';
import type { AirQualityData, LatLng } from '@/types';
import { apiConfig } from './apiConfig';

const OPENAQ_API_URL = apiConfig.getBaseUrl('airQuality');

const WAQI_API_URL = apiConfig.getBaseUrl('waqi');

type PollutantMeasurements = {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
};

type OpenAQMeasurement = {
  parameter: string;
  value?: number;
};

type OpenAQResult = {
  measurements?: OpenAQMeasurement[];
  date?: {
    utc?: string;
  };
};

type OpenAQLatestResponse = {
  results?: OpenAQResult[];
};

type WAQIPollutant = {
  v?: number;
};

type WAQIResponse = {
  status?: string;
  data?: {
    iaqi?: {
      pm25?: WAQIPollutant;
      pm10?: WAQIPollutant;
      no2?: WAQIPollutant;
      o3?: WAQIPollutant;
    };
    time?: {
      iso?: string;
    };
  };
};

const withFallbackValue = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeOpenAQMeasurements = (measurements: OpenAQMeasurement[]): PollutantMeasurements => {
  const byParam = (param: string) => measurements.find((m) => m.parameter === param)?.value;

  return {
    pm25: withFallbackValue(byParam('pm25')),
    pm10: withFallbackValue(byParam('pm10')),
    no2: withFallbackValue(byParam('no2')),
    o3: withFallbackValue(byParam('o3')),
  };
};

const fetchOpenAQAirQuality = async (location: LatLng): Promise<AirQualityData | null> => {
  const response = await axios.get<OpenAQLatestResponse>(`${OPENAQ_API_URL}/latest`, {
    params: {
      latitude: location.lat,
      longitude: location.lng,
      radius: 5000,
      limit: 1,
    },
    timeout: 5000,
  });

  if (!response.data.results || response.data.results.length === 0) {
    return null;
  }

  const result = response.data.results[0];
  const measurements = normalizeOpenAQMeasurements(result.measurements || []);

  return {
    location,
    pm25: measurements.pm25,
    pm10: measurements.pm10,
    no2: measurements.no2,
    o3: measurements.o3,
    timestamp: result.date?.utc || new Date().toISOString(),
    source: 'live',
  };
};

const fetchWAQIAirQuality = async (location: LatLng): Promise<AirQualityData | null> => {
  // WAQI requests are only supported through the proxy, which injects the token server-side.
  if (!apiConfig.isProxyEnabled) return null;

  const response = await axios.get<WAQIResponse>(`${WAQI_API_URL}/feed/geo:${location.lat};${location.lng}/`, {
    timeout: 5000,
  });

  const data = response.data?.data;
  if (response.data?.status !== 'ok' || !data) {
    return null;
  }

  const iaqi = data.iaqi || {};
  const pm25 = withFallbackValue(iaqi.pm25?.v);
  const pm10 = withFallbackValue(iaqi.pm10?.v, Math.round(pm25 * 1.3));
  const no2 = withFallbackValue(iaqi.no2?.v, Math.round(pm25 * 0.8));
  const o3 = withFallbackValue(iaqi.o3?.v, 40);

  return {
    location,
    pm25,
    pm10,
    no2,
    o3,
    timestamp: data.time?.iso || new Date().toISOString(),
    source: 'live',
  };
};

const getMockAirQuality = (location: LatLng): AirQualityData => {
  const locationHash = Math.abs(Math.sin(location.lat * 100 + location.lng * 100));
  const isNearHighway = (Math.floor(location.lat * 100) % 7 === 0)
    || (Math.floor(location.lng * 100) % 7 === 0);
  const isPark = (Math.floor(location.lat * 100) % 11 === 0)
    && (Math.floor(location.lng * 100) % 11 === 0);

  let basePM25 = 25 + locationHash * 30;
  if (isNearHighway) basePM25 += 80;
  if (isPark) basePM25 = Math.max(5, basePM25 - 20);

  return {
    location,
    pm25: Math.round(basePM25),
    pm10: Math.round(basePM25 * 1.3),
    no2: Math.round(basePM25 * 0.8),
    o3: Math.round(40 + locationHash * 20),
    timestamp: new Date().toISOString(),
    source: 'mock',
    warning: 'Showing estimated air quality because live data is unavailable.',
  };
};

export const getAirQuality = async (location: LatLng): Promise<AirQualityData> => {
  try {
    const openAQData = await fetchOpenAQAirQuality(location);
    if (openAQData) return openAQData;
  } catch {
    console.warn('OpenAQ fetch failed, trying WAQI source.');
  }

  try {
    const waqiData = await fetchWAQIAirQuality(location);
    if (waqiData) return waqiData;
  } catch {
    console.warn('WAQI fetch failed, using mock air quality values.');
  }

  return getMockAirQuality(location);
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
