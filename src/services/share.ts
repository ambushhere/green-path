import type { LatLng, Route, TravelMode } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';

export function buildGoogleMapsUrl(
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode,
): string {
  const mode = travelMode === 'bike' ? 'bicycling' : 'walking';
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${start.lat},${start.lng}` +
    `&destination=${end.lat},${end.lng}` +
    `&travelmode=${mode}`
  );
}

export function buildAppleMapsUrl(
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode,
): string {
  const dirflg = travelMode === 'bike' ? 'c' : 'w';
  return (
    `https://maps.apple.com/?` +
    `saddr=${start.lat},${start.lng}` +
    `&daddr=${end.lat},${end.lng}` +
    `&dirflg=${dirflg}`
  );
}

export function buildShareText(
  startAddress: string,
  endAddress: string,
  route: Route,
  travelMode: TravelMode,
): string {
  const mode = travelMode === 'bike' ? 'Bicycle' : 'Walking';
  return [
    `🌿 Green Path Route`,
    `From: ${startAddress}`,
    `To:   ${endAddress}`,
    `Mode: ${mode} · Type: ${route.type.charAt(0).toUpperCase() + route.type.slice(1)}`,
    `Distance: ${formatDistance(route.distance)} · Time: ${formatDuration(route.duration)}`,
    `PM2.5: ${route.avgPM25} µg/m³ · Health score: ${route.score}/100`,
  ].join('\n');
}
