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

/**
 * OpenAQ v2 was retired and now answers every request with HTTP 410 Gone, so calling
 * it unconditionally guarantees one failed request per lookup before the real
 * provider is even tried. It stays reachable only behind an explicit base-URL
 * override, which is what a v3 deployment or a self-hosted mirror would set.
 */
const isOpenAQConfigured = Boolean(
  import.meta.env.VITE_AIR_QUALITY_API_BASE_URL || apiConfig.isProxyEnabled,
);

const fetchOpenAQAirQuality = async (location: LatLng): Promise<AirQualityData | null> => {
  if (!isOpenAQConfigured) return null;

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

const WAQI_BROWSER_TOKEN = import.meta.env.VITE_WAQI_TOKEN;

/**
 * WAQI is reachable two ways, and until now the app allowed only one of them.
 *
 * Through the proxy the token stays server-side, which is what a deployment should
 * do. But WAQI also answers cross-origin requests with `Access-Control-Allow-Origin: *`,
 * so a token in VITE_WAQI_TOKEN works straight from the browser. Refusing that path
 * meant a developer with a valid token still saw no live data at all.
 *
 * The direct path ships the token in the bundle, so it is for local work, not production.
 */
const canQueryWAQI = apiConfig.isProxyEnabled || Boolean(WAQI_BROWSER_TOKEN);

const fetchWAQIAirQuality = async (location: LatLng): Promise<AirQualityData | null> => {
  if (!canQueryWAQI) return null;

  const response = await axios.get<WAQIResponse>(`${WAQI_API_URL}/feed/geo:${location.lat};${location.lng}/`, {
    timeout: 5000,
    // The proxy injects the token itself; a direct call has to carry it.
    params: apiConfig.isProxyEnabled ? undefined : { token: WAQI_BROWSER_TOKEN },
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

/**
 * Explains, in the user's terms, why no live measurement could be obtained.
 * This is surfaced in the UI; it must never be swallowed into a debug log,
 * because the alternative is an interface that shows invented numbers silently.
 */
const describeUnavailability = (providersAttempted: boolean, providersFailed: boolean): string => {
  if (!providersAttempted) {
    return 'No air-quality provider is configured. Safe Path reads WAQI, which needs a free '
      + 'token: set VITE_WAQI_TOKEN for local use, or run `npm run proxy` with WAQI_TOKEN set '
      + 'and point VITE_API_PROXY_BASE_URL at it to keep the token off the client.';
  }

  if (providersFailed) {
    return apiConfig.isProxyEnabled
      ? 'The air-quality provider did not respond through the proxy. Check that WAQI_TOKEN is '
        + 'set in the proxy environment and that the proxy can reach the internet.'
      : 'The air-quality provider rejected the request. Check that VITE_WAQI_TOKEN holds a valid key.';
  }

  return 'No monitoring station reported a recent measurement near this location.';
};

export const getAirQuality = async (location: LatLng): Promise<AirQualityData> => {
  const providersAttempted = isOpenAQConfigured || canQueryWAQI;
  let providersFailed = false;

  try {
    const openAQData = await fetchOpenAQAirQuality(location);
    if (openAQData) return openAQData;
  } catch {
    providersFailed = true;
  }

  try {
    const waqiData = await fetchWAQIAirQuality(location);
    if (waqiData) return waqiData;
  } catch {
    providersFailed = true;
  }

  return {
    ...getMockAirQuality(location),
    warning: describeUnavailability(providersAttempted, providersFailed),
  };
};

export const getAirQualityForRoute = async (points: LatLng[]): Promise<AirQualityData[]> => {
  const promises = points.map(point => getAirQuality(point));
  return Promise.all(promises);
};

/**
 * Severity bands for PM2.5.
 *
 * Each band carries three separate colour roles, because one saturated hue cannot
 * serve all of them:
 *   - `color` is a saturated mid-tone for map strokes and fills only. It is NOT
 *     legible as text on white and must never be used as a foreground colour.
 *   - `fill`  is a light tint for badge and panel backgrounds.
 *   - `text`  is a dark tone that clears WCAG AA (4.5:1) on white and on `fill`.
 *
 * `icon` gives every band a non-colour cue so the severity survives greyscale and
 * red-green colour blindness. `range` is the single source of truth for the legend,
 * so badge labels and legend labels can no longer drift apart.
 */
export interface AirQualityBand {
  /** Full band name, used where there is room for it. */
  level: string;
  /** Compact band name for pills and dense rows. */
  shortLevel: string;
  /** Saturated hue. Map strokes and fills only, never text. */
  color: string;
  /** Light tint for badge/panel backgrounds. */
  fill: string;
  /** Dark tone, AA-compliant on white and on `fill`. */
  text: string;
  /** Human-readable µg/m³ range, e.g. "0-12". */
  range: string;
  /** Non-colour severity cue. Matches a lucide icon name. */
  icon: 'leaf' | 'wind' | 'cloud' | 'alert-triangle' | 'alert-octagon';
}

/** Upper PM2.5 bound for each band, aligned index-for-index with AIR_QUALITY_BANDS. */
const AIR_QUALITY_BAND_MAXIMA = [12, 35, 55, 150, Number.POSITIVE_INFINITY];

const AIR_QUALITY_BANDS: AirQualityBand[] = [
  {
    level: 'Excellent',
    shortLevel: 'Excellent',
    color: '#22c55e',
    fill: '#dcfce7',
    text: '#15803d',
    range: '0-12',
    icon: 'leaf',
  },
  {
    level: 'Good',
    shortLevel: 'Good',
    color: '#84cc16',
    fill: '#ecfccb',
    text: '#4d7c0f',
    range: '12-35',
    icon: 'wind',
  },
  {
    level: 'Moderate',
    shortLevel: 'Moderate',
    color: '#eab308',
    fill: '#fef9c3',
    text: '#854d0e',
    range: '35-55',
    icon: 'cloud',
  },
  {
    level: 'Unhealthy for sensitive groups',
    shortLevel: 'Sensitive groups',
    color: '#f97316',
    fill: '#ffedd5',
    text: '#9a3412',
    range: '55-150',
    icon: 'alert-triangle',
  },
  {
    level: 'Unhealthy',
    shortLevel: 'Unhealthy',
    color: '#ef4444',
    fill: '#fee2e2',
    text: '#991b1b',
    range: '150+',
    icon: 'alert-octagon',
  },
];

/** Every band, in ascending severity. The legend renders from this. */
export const getAirQualityBands = (): AirQualityBand[] => AIR_QUALITY_BANDS;

export const getAirQualityLevel = (pm25: number): AirQualityBand => {
  const index = AIR_QUALITY_BAND_MAXIMA.findIndex((max) => pm25 <= max);
  return AIR_QUALITY_BANDS[index === -1 ? AIR_QUALITY_BANDS.length - 1 : index];
};

export const calculateRouteSafety = (avgPM25: number): 'safe' | 'moderate' | 'unsafe' => {
  if (avgPM25 <= 35) return 'safe';
  if (avgPM25 <= 75) return 'moderate';
  return 'unsafe';
};
