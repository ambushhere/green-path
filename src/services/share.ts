import type { LatLng, Route, RoutePoint, TravelMode } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';

/**
 * Google's directions URL accepts at most 9 intermediate waypoints. A computed
 * route has hundreds of points, so it has to be thinned down to a set that still
 * pins the path through the corridor Safe Path chose.
 */
export const MAX_GOOGLE_WAYPOINTS = 9;

/**
 * Pick evenly spaced interior points from a route.
 *
 * Endpoints are excluded because they travel as origin and destination. Spacing is
 * even along the point index rather than along distance, which is good enough to
 * hold the corridor and keeps the URL short.
 */
export function downsampleWaypoints(
  points: Array<LatLng | RoutePoint>,
  limit: number = MAX_GOOGLE_WAYPOINTS,
): LatLng[] {
  const interior = points.slice(1, -1);
  if (interior.length === 0 || limit <= 0) return [];

  if (interior.length <= limit) {
    return interior.map((point) => ({ lat: point.lat, lng: point.lng }));
  }

  const step = interior.length / limit;
  const sampled: LatLng[] = [];

  for (let index = 0; index < limit; index += 1) {
    const point = interior[Math.floor(index * step)];
    sampled.push({ lat: point.lat, lng: point.lng });
  }

  return sampled;
}

/**
 * A directions URL that carries the chosen path, not just its endpoints.
 *
 * Without waypoints Google re-plans the trip with its own defaults, which is how a
 * visitor who deliberately picked the cleanest route ends up walking the arterial
 * the whole product exists to avoid.
 */
export function buildGoogleMapsUrl(
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode,
  routePoints: Array<LatLng | RoutePoint> = [],
): string {
  const mode = travelMode === 'bike' ? 'bicycling' : 'walking';
  const waypoints = downsampleWaypoints(routePoints);

  const waypointParam = waypoints.length > 0
    ? `&waypoints=${waypoints.map((point) => `${point.lat},${point.lng}`).join('|')}`
    : '';

  return (
    `https://www.google.com/maps/dir/?api=1`
    + `&origin=${start.lat},${start.lng}`
    + `&destination=${end.lat},${end.lng}`
    + waypointParam
    + `&travelmode=${mode}`
  );
}

/**
 * Apple's maps URL scheme has no public multi-stop parameter, so only the endpoints
 * transfer. The UI says so rather than letting the visitor assume otherwise.
 */
export function buildAppleMapsUrl(
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode,
): string {
  const dirflg = travelMode === 'bike' ? 'c' : 'w';
  return (
    `https://maps.apple.com/?`
    + `saddr=${start.lat},${start.lng}`
    + `&daddr=${end.lat},${end.lng}`
    + `&dirflg=${dirflg}`
  );
}

export function buildShareText(
  startAddress: string,
  endAddress: string,
  route: Route,
  travelMode: TravelMode,
): string {
  const mode = travelMode === 'bike' ? 'Bicycle' : 'Walking';
  const hasAirData = route.airQualitySource !== 'mock';

  const lines = [
    `Safe Path route`,
    `From: ${startAddress}`,
    `To:   ${endAddress}`,
    `Mode: ${mode} · Type: ${route.type.charAt(0).toUpperCase() + route.type.slice(1)}`,
    `Distance: ${formatDistance(route.distance)} · Time: ${formatDuration(route.duration)}`,
  ];

  // Never share a PM2.5 figure that was never measured.
  lines.push(
    hasAirData
      ? `PM2.5: ${route.avgPM25} µg/m³ · Health score: ${route.score}/100`
      : `Air quality: no measurement available for this route`,
  );

  return lines.join('\n');
}
