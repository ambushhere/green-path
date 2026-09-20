import axios from 'axios';
import type { LatLng } from '@/types';

/**
 * Two ways of answering "where is the visitor?", used at different moments.
 *
 * `detectCityByIp` runs on first paint. It is approximate (city-level) but costs
 * the visitor nothing: no permission prompt, no interaction, no wait beyond one
 * request. It exists so the map opens somewhere meaningful instead of a hardcoded
 * default city.
 *
 * `getPreciseLocation` runs only when the visitor presses the locate control. It
 * triggers the browser permission prompt, so it must never fire on load: a prompt
 * shown before the product has explained itself is usually denied for good, and a
 * denied permission cannot be re-requested without the visitor digging through
 * browser settings.
 *
 * IP lookups deliberately bypass the API proxy. The proxy would resolve its OWN
 * address rather than the visitor's, which is exactly the wrong answer.
 */

export interface DetectedLocation extends LatLng {
  /** City name when the provider knows it, e.g. "Rostov-on-Don". */
  city: string | null;
  /** Country name when the provider knows it. */
  country: string | null;
}

const IP_LOOKUP_TIMEOUT_MS = 4000;

const PRIMARY_IP_API = import.meta.env.VITE_IP_GEOLOCATION_API_BASE_URL || 'https://ipwho.is';
const FALLBACK_IP_API = 'https://get.geojs.io/v1/ip/geo.json';

type IpWhoIsResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
};

type GeoJsResponse = {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
};

const isUsableCoordinate = (lat: unknown, lng: unknown): boolean => {
  const latitude = Number(lat);
  const longitude = Number(lng);

  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
    // Exactly (0, 0) is the null island a provider returns when it knows nothing.
    && !(latitude === 0 && longitude === 0);
};

const fetchFromIpWhoIs = async (): Promise<DetectedLocation | null> => {
  const response = await axios.get<IpWhoIsResponse>(`${PRIMARY_IP_API}/`, {
    timeout: IP_LOOKUP_TIMEOUT_MS,
  });

  const { success, latitude, longitude, city, country } = response.data ?? {};
  if (success === false || !isUsableCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    lat: Number(latitude),
    lng: Number(longitude),
    city: city ?? null,
    country: country ?? null,
  };
};

const fetchFromGeoJs = async (): Promise<DetectedLocation | null> => {
  const response = await axios.get<GeoJsResponse>(FALLBACK_IP_API, {
    timeout: IP_LOOKUP_TIMEOUT_MS,
  });

  const { latitude, longitude, city, country } = response.data ?? {};
  if (!isUsableCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    lat: Number(latitude),
    lng: Number(longitude),
    city: city ?? null,
    country: country ?? null,
  };
};

/**
 * Best-effort city-level position from the visitor's IP address.
 * Returns null rather than throwing: a failed lookup must degrade to the default
 * map view, never to an error the visitor has to dismiss.
 */
export const detectCityByIp = async (): Promise<DetectedLocation | null> => {
  try {
    const primary = await fetchFromIpWhoIs();
    if (primary) return primary;
  } catch {
    // Fall through to the secondary provider.
  }

  try {
    return await fetchFromGeoJs();
  } catch {
    return null;
  }
};

export type PreciseLocationErrorKind = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class PreciseLocationError extends Error {
  readonly kind: PreciseLocationErrorKind;

  constructor(kind: PreciseLocationErrorKind, message: string) {
    super(message);
    this.name = 'PreciseLocationError';
    this.kind = kind;
  }
}

const PRECISE_LOCATION_TIMEOUT_MS = 10000;

/**
 * Precise position from the device, behind the browser permission prompt.
 * Call this only from a control the visitor pressed.
 */
export const getPreciseLocation = (): Promise<LatLng> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new PreciseLocationError('unsupported', 'This browser cannot share a precise location.'),
    );
  }

  return new Promise<LatLng>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new PreciseLocationError(
            'denied',
            'Location access is blocked. Allow it in your browser settings, or set the start point on the map.',
          ));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new PreciseLocationError(
            'timeout',
            'Finding your location took too long. Try again, or set the start point on the map.',
          ));
          return;
        }

        reject(new PreciseLocationError(
          'unavailable',
          'Your device could not determine a position. Set the start point on the map instead.',
        ));
      },
      {
        enableHighAccuracy: true,
        timeout: PRECISE_LOCATION_TIMEOUT_MS,
        maximumAge: 60000,
      },
    );
  });
};
