type ApiService = 'routing' | 'geocoding' | 'airQuality' | 'waqi';

type ApiConfigInput = {
  proxyBaseUrl?: string;
  routingBaseUrl?: string;
  geocodingBaseUrl?: string;
  airQualityBaseUrl?: string;
  waqiBaseUrl?: string;
};

const DEFAULT_BASE_URLS: Record<ApiService, string> = {
  routing: 'https://router.project-osrm.org',
  geocoding: 'https://nominatim.openstreetmap.org',
  airQuality: 'https://api.openaq.org/v2',
  waqi: 'https://api.waqi.info',
};

const PROXY_PATHS: Record<ApiService, string> = {
  routing: 'routing',
  geocoding: 'geocoding',
  airQuality: 'air-quality',
  waqi: 'waqi',
};

const trimTrailingSlash = (value?: string): string | undefined => {
  if (!value) return undefined;
  return value.replace(/\/+$/, '');
};

export const createApiConfig = (input: ApiConfigInput = {}) => {
  const proxyBaseUrl = trimTrailingSlash(input.proxyBaseUrl);

  const directBases: Record<ApiService, string> = {
    routing: trimTrailingSlash(input.routingBaseUrl) || DEFAULT_BASE_URLS.routing,
    geocoding: trimTrailingSlash(input.geocodingBaseUrl) || DEFAULT_BASE_URLS.geocoding,
    airQuality: trimTrailingSlash(input.airQualityBaseUrl) || DEFAULT_BASE_URLS.airQuality,
    waqi: trimTrailingSlash(input.waqiBaseUrl) || DEFAULT_BASE_URLS.waqi,
  };

  const getBaseUrl = (service: ApiService): string => {
    if (!proxyBaseUrl) {
      return directBases[service];
    }

    return `${proxyBaseUrl}/${PROXY_PATHS[service]}`;
  };

  return {
    proxyBaseUrl,
    isProxyEnabled: Boolean(proxyBaseUrl),
    getBaseUrl,
  };
};

export const apiConfig = createApiConfig({
  proxyBaseUrl: import.meta.env.VITE_API_PROXY_BASE_URL,
  routingBaseUrl: import.meta.env.VITE_ROUTING_API_BASE_URL,
  geocodingBaseUrl: import.meta.env.VITE_GEOCODING_API_BASE_URL,
  airQualityBaseUrl: import.meta.env.VITE_AIR_QUALITY_API_BASE_URL,
  waqiBaseUrl: import.meta.env.VITE_WAQI_API_BASE_URL,
});
