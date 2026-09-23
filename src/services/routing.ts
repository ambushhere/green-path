import axios from 'axios';
import type { AirQualityData, LatLng, Route, RouteAirQualitySource, RoutePoint, RouteType, TravelMode } from '@/types';
import { getAirQuality, calculateRouteSafety } from './airQuality';
import { apiConfig } from './apiConfig';

const OSRM_API_URL = apiConfig.getBaseUrl('routing');

const MODE_SPEED_MPS: Record<TravelMode, number> = {
  foot: 1.4,
  bike: 4.8,
};

type RouteCandidate = {
  id: string;
  corridor: number;
  waypoints: LatLng[];
};

type OSRMRoute = {
  distance: number;
  duration: number;
  geometry: {
    coordinates: number[][];
  };
};

type OSRMRouteResponse = {
  routes?: OSRMRoute[];
};

export type ScoredRouteCandidate = {
  id: string;
  route: Route;
  distanceNorm: number;
  durationNorm: number;
  pmNorm: number;
  corridorScore: number;
};

const ROUTE_CACHE_TTL_MS = 3 * 60 * 1000;
const ROUTE_CACHE_MAX_SIZE = 50;
const routeCache = new Map<string, { expiresAt: number; data: Route[] }>();

// ---------------------------------------------------------------------------
// Routing algorithm constants
// ---------------------------------------------------------------------------

// Fraction along the start→end vector where the two corridor waypoints are placed.
const CORRIDOR_FIRST_FRACTION = 0.28;
const CORRIDOR_SECOND_FRACTION = 0.72;

// Corridor jitter/bend multipliers control how much randomness is added to waypoints.
const JITTER_STRENGTH = 0.25;
const BEND_STRENGTH = 0.2;

// Health-score penalty weights
const PM25_PENALTY_MAX = 75;    // cap on the PM2.5 penalty contribution
const PM25_PENALTY_FACTOR = 0.8; // µg/m³ → penalty points
const DISTANCE_PENALTY_FACTOR = 15; // per unit of distance normalisation above 1.0
const DURATION_PENALTY_FACTOR = 10; // per unit of duration normalisation above 1.0

// Ranking weights for the "direct" route type (sum to 1.0 per mode)
const DIRECT_FOOT_DISTANCE_W = 0.42;
const DIRECT_FOOT_DURATION_W = 0.23;
const DIRECT_FOOT_PM_W = 0.35;

const DIRECT_BIKE_DISTANCE_W = 0.62;
const DIRECT_BIKE_DURATION_W = 0.28;
const DIRECT_BIKE_PM_W = 0.1;

// Ranking weights for the "green" (low-pollution) route type
const GREEN_FOOT_PM_W = 0.72;
const GREEN_FOOT_DISTANCE_W = 0.14;
const GREEN_FOOT_DURATION_W = 0.14;

const GREEN_BIKE_PM_W = 0.5;
const GREEN_BIKE_DISTANCE_W = 0.3;
const GREEN_BIKE_DURATION_W = 0.2;

// Ranking weights for the "scenic" (slight detour + clean air) route type
// Target detour factor: how far above the shortest route the scenic route aims to be.
const SCENIC_FOOT_DETOUR_TARGET = 1.15;
const SCENIC_BIKE_DETOUR_TARGET = 1.05;

const SCENIC_FOOT_PM_W = 0.58;
const SCENIC_FOOT_DETOUR_W = 0.27;
const SCENIC_FOOT_CORRIDOR_W = 0.15;

const SCENIC_BIKE_PM_W = 0.45;
const SCENIC_BIKE_DETOUR_W = 0.42;
const SCENIC_BIKE_CORRIDOR_W = 0.13;

// Corridor score bounds: prefers routes with moderate perpendicular offset.
const CORRIDOR_SCORE_MIN = 0.9;
const CORRIDOR_SCORE_BASE = 1.15;
const CORRIDOR_SCORE_BIAS = 0.2;

const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const buildRouteCacheKey = (start: LatLng, end: LatLng, travelMode: TravelMode): string => {
  const precision = 4;
  return [
    travelMode,
    start.lat.toFixed(precision),
    start.lng.toFixed(precision),
    end.lat.toFixed(precision),
    end.lng.toFixed(precision),
  ].join(':');
};

const getCachedRoutes = (cacheKey: string): Route[] | null => {
  const cached = routeCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    routeCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};

const cacheRoutes = (cacheKey: string, routes: Route[]) => {
  if (routeCache.size >= ROUTE_CACHE_MAX_SIZE) {
    const oldestKey = routeCache.keys().next().value;
    if (oldestKey !== undefined) routeCache.delete(oldestKey);
  }
  routeCache.set(cacheKey, {
    data: routes,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  });
};

export const generateCandidateCorridors = (start: LatLng, end: LatLng, travelMode: TravelMode): RouteCandidate[] => {
  const deltaLat = end.lat - start.lat;
  const deltaLng = end.lng - start.lng;
  const vectorLength = Math.hypot(deltaLat, deltaLng) || 0.0001;

  const unitLat = deltaLat / vectorLength;
  const unitLng = deltaLng / vectorLength;

  const perpendicularLat = -unitLng;
  const perpendicularLng = unitLat;

  const baseStrength = Math.min(0.009, Math.max(0.0018, vectorLength * 0.32));
  const corridorStrength = travelMode === 'bike' ? baseStrength * 0.8 : baseStrength * 1.1;
  const corridors = travelMode === 'bike'
    ? [-0.9, -0.45, 0, 0.45, 0.9]
    : [-1.3, -0.65, 0, 0.65, 1.3];

  return corridors.map((corridor, index) => {
    const seed =
      start.lat * 100
      + start.lng * 100
      + end.lat * 100
      + end.lng * 100
      + corridor * 10
      + index;

    const jitter = (pseudoRandom(seed) - 0.5) * corridorStrength * JITTER_STRENGTH;
    const bend = (pseudoRandom(seed + 21) - 0.5) * corridorStrength * BEND_STRENGTH;

    const offset = corridor * corridorStrength;

    const firstWaypoint: LatLng = {
      lat: start.lat + deltaLat * CORRIDOR_FIRST_FRACTION + perpendicularLat * (offset + jitter) + unitLat * bend,
      lng: start.lng + deltaLng * CORRIDOR_FIRST_FRACTION + perpendicularLng * (offset + jitter) + unitLng * bend,
    };

    const secondWaypoint: LatLng = {
      lat: start.lat + deltaLat * CORRIDOR_SECOND_FRACTION + perpendicularLat * (offset + jitter) - unitLat * bend,
      lng: start.lng + deltaLng * CORRIDOR_SECOND_FRACTION + perpendicularLng * (offset + jitter) - unitLng * bend,
    };

    return {
      id: `corridor-${index}`,
      corridor,
      waypoints: [start, firstWaypoint, secondWaypoint, end],
    };
  });
};

const fetchOSRMRoute = async (points: LatLng[], mode: TravelMode): Promise<OSRMRouteResponse> => {
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const profile = mode === 'foot' ? 'foot' : 'bike';

  const response = await axios.get<OSRMRouteResponse>(`${OSRM_API_URL}/route/v1/${profile}/${coordinates}`, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      alternatives: false,
      steps: false,
    },
    timeout: 10000,
  });

  return response.data;
};

const EARTH_RADIUS_M = 6371000;

const haversineMeters = (a: LatLng, b: LatLng): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

export const measurePathMeters = (points: LatLng[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
};

// ~1 m grid: OSRM emits identical node coordinates when it retraces a street.
const pointKey = (point: LatLng): string => `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`;

/**
 * Removes out-and-back spurs and closed loops from a routed path.
 *
 * Corridor waypoints are synthetic: when one lands in a dead end or inside a block,
 * OSRM has to reach it and come back, which draws a stub or a lap around the block.
 * A walking or cycling route never needs to pass the same node twice, so whenever
 * the path revisits a point, everything since the first visit is cut.
 */
export const removeBacktracks = <T extends LatLng>(points: T[]): T[] => {
  const result: T[] = [];
  const indexByKey = new Map<string, number>();

  for (const point of points) {
    const key = pointKey(point);
    const seenAt = indexByKey.get(key);

    if (seenAt !== undefined) {
      for (let i = seenAt + 1; i < result.length; i += 1) {
        indexByKey.delete(pointKey(result[i]));
      }
      result.length = seenAt + 1;
      continue;
    }

    indexByKey.set(key, result.length);
    result.push(point);
  }

  return result;
};

const sampleRoutePoints = (points: RoutePoint[], targetSamples = 12): RoutePoint[] => {
  if (points.length <= targetSamples) {
    return points;
  }

  const interval = Math.max(1, Math.floor(points.length / targetSamples));
  return points.filter((_, index) => index % interval === 0);
};

const resolveAirQualitySource = (samples: AirQualityData[]): RouteAirQualitySource => {
  const sourceSet = new Set(samples.map((sample) => sample.source));
  if (sourceSet.size === 1 && sourceSet.has('live')) return 'live';
  if (sourceSet.size === 1 && sourceSet.has('mock')) return 'mock';
  return 'mixed';
};

const computeHealthScore = (avgPM25: number, distanceNorm: number, durationNorm: number): number => {
  const pmPenalty = Math.min(PM25_PENALTY_MAX, avgPM25 * PM25_PENALTY_FACTOR);
  const distancePenalty = (distanceNorm - 1) * DISTANCE_PENALTY_FACTOR;
  const durationPenalty = (durationNorm - 1) * DURATION_PENALTY_FACTOR;
  const rawScore = 100 - pmPenalty - distancePenalty - durationPenalty;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
};

const estimateTravelDuration = (distanceMeters: number, travelMode: TravelMode): number => {
  const speed = MODE_SPEED_MPS[travelMode] || MODE_SPEED_MPS.foot;
  return distanceMeters / speed;
};

const enrichCandidateRoute = async (candidate: RouteCandidate, travelMode: TravelMode): Promise<Route | null> => {
  try {
    const routeData = await fetchOSRMRoute(candidate.waypoints, travelMode);
    if (!routeData.routes || routeData.routes.length === 0) {
      return null;
    }

    const primaryRoute = routeData.routes[0];
    const coordinates: number[][] = primaryRoute.geometry.coordinates;

    const routePoints: RoutePoint[] = removeBacktracks(coordinates.map((coordinate) => ({
      lat: coordinate[1],
      lng: coordinate[0],
    })));
    if (routePoints.length < 2) return null;

    // OSRM's distance still counts the spurs that were just cut.
    const distance = Math.min(primaryRoute.distance, measurePathMeters(routePoints));

    const sampledPoints = sampleRoutePoints(routePoints, 12);
    const sampledAirQuality = await Promise.all(
      sampledPoints.map((point) => getAirQuality({ lat: point.lat, lng: point.lng })),
    );

    // Average only what was measured. Modelled samples are used solely when there is
    // nothing else, and such a route is flagged 'mock' so its figure is never shown.
    const measuredSamples = sampledAirQuality.filter((sample) => sample.source === 'live');
    const pmSamples = measuredSamples.length > 0 ? measuredSamples : sampledAirQuality;
    const avgPM25 = pmSamples.reduce((total, sample) => total + sample.pm25, 0) / pmSamples.length;
    const sampleLookup = new Map(
      sampledPoints.map((point, index) => [`${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`, sampledAirQuality[index]]),
    );

    const enrichedPoints = routePoints.map((point) => {
      const key = `${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`;
      const matchedSample = sampleLookup.get(key);
      return matchedSample ? { ...point, airQuality: matchedSample } : point;
    });

    const estimatedDuration = estimateTravelDuration(distance, travelMode);

    return {
      type: 'direct',
      points: enrichedPoints,
      distance,
      duration: estimatedDuration,
      avgPM25: Math.round(avgPM25 * 10) / 10,
      score: 0,
      airQualitySource: resolveAirQualitySource(sampledAirQuality),
      safety: calculateRouteSafety(avgPM25),
    };
  } catch (error) {
    console.error(`Route enrichment failed for candidate "${candidate.id}":`, error);
    return null;
  }
};

export const normalizeCandidateScores = (candidates: Array<{ candidate: RouteCandidate; route: Route }>): ScoredRouteCandidate[] => {
  const minDistance = Math.min(...candidates.map((item) => item.route.distance));
  const minDuration = Math.min(...candidates.map((item) => item.route.duration));
  const minPM25 = Math.min(...candidates.map((item) => item.route.avgPM25));
  // Pollution may steer the ranking only when every candidate was measured. Otherwise
  // modelled values would pick the routes while the UI says they were not used.
  const isPMComparable = candidates.every(({ route }) => route.airQualitySource !== 'mock');

  return candidates.map(({ candidate, route }) => {
    const distanceNorm = route.distance / minDistance;
    const durationNorm = route.duration / minDuration;
    const pmNorm = isPMComparable ? route.avgPM25 / Math.max(1, minPM25) : 1;

    const corridorBias = Math.abs(candidate.corridor);
    const corridorScore = Math.max(CORRIDOR_SCORE_MIN, CORRIDOR_SCORE_BASE - corridorBias * CORRIDOR_SCORE_BIAS);

    const score = computeHealthScore(route.avgPM25, distanceNorm, durationNorm);

    return {
      id: candidate.id,
      route: {
        ...route,
        score,
      },
      distanceNorm,
      durationNorm,
      pmNorm,
      corridorScore,
    };
  });
};

const rankForRouteType = (
  candidate: ScoredRouteCandidate,
  routeType: RouteType,
  travelMode: TravelMode,
): number => {
  if (routeType === 'direct') {
    if (travelMode === 'bike') {
      return (
        candidate.distanceNorm * DIRECT_BIKE_DISTANCE_W
        + candidate.durationNorm * DIRECT_BIKE_DURATION_W
        + candidate.pmNorm * DIRECT_BIKE_PM_W
      );
    }

    return (
      candidate.distanceNorm * DIRECT_FOOT_DISTANCE_W
      + candidate.durationNorm * DIRECT_FOOT_DURATION_W
      + candidate.pmNorm * DIRECT_FOOT_PM_W
    );
  }

  if (routeType === 'green') {
    if (travelMode === 'bike') {
      return (
        candidate.pmNorm * GREEN_BIKE_PM_W
        + candidate.distanceNorm * GREEN_BIKE_DISTANCE_W
        + candidate.durationNorm * GREEN_BIKE_DURATION_W
      );
    }

    return (
      candidate.pmNorm * GREEN_FOOT_PM_W
      + candidate.distanceNorm * GREEN_FOOT_DISTANCE_W
      + candidate.durationNorm * GREEN_FOOT_DURATION_W
    );
  }

  const detourFactor = (candidate.distanceNorm + candidate.durationNorm) / 2;
  const scenicTarget = travelMode === 'bike'
    ? Math.abs(detourFactor - SCENIC_BIKE_DETOUR_TARGET)
    : Math.abs(detourFactor - SCENIC_FOOT_DETOUR_TARGET);

  if (travelMode === 'bike') {
    return (
      candidate.pmNorm * SCENIC_BIKE_PM_W
      + scenicTarget * SCENIC_BIKE_DETOUR_W
      + (1 / candidate.corridorScore) * SCENIC_BIKE_CORRIDOR_W
    );
  }

  return (
    candidate.pmNorm * SCENIC_FOOT_PM_W
    + scenicTarget * SCENIC_FOOT_DETOUR_W
    + (1 / candidate.corridorScore) * SCENIC_FOOT_CORRIDOR_W
  );
};

export const selectRouteVariants = (
  candidates: ScoredRouteCandidate[],
  travelMode: TravelMode = 'foot',
): Route[] => {
  const used = new Set<string>();

  const pick = (routeType: RouteType): Route | null => {
    const sorted = [...candidates]
      .sort((a, b) => rankForRouteType(a, routeType, travelMode) - rankForRouteType(b, routeType, travelMode));

    const unused = sorted.find((candidate) => !used.has(candidate.id));
    const selected = unused;
    if (!selected) return null;

    used.add(selected.id);
    return {
      ...selected.route,
      type: routeType,
    };
  };

  const direct = pick('direct');
  const green = pick('green');
  const scenic = pick('scenic');

  return [direct, green, scenic].filter((route): route is Route => route !== null);
};

export const calculateMultipleRoutes = async (
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode = 'foot',
): Promise<Route[]> => {
  const cacheKey = buildRouteCacheKey(start, end, travelMode);
  const cachedRoutes = getCachedRoutes(cacheKey);
  if (cachedRoutes) {
    return cachedRoutes;
  }

  const candidates = generateCandidateCorridors(start, end, travelMode);

  const enrichedCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const route = await enrichCandidateRoute(candidate, travelMode);
      if (!route) return null;
      return { candidate, route };
    }),
  );

  // Once spurs are cut, several corridors often collapse onto the same streets;
  // offering the same path twice under different names is noise.
  const seenGeometries = new Set<string>();
  const validCandidates = enrichedCandidates.filter(
    (candidate): candidate is { candidate: RouteCandidate; route: Route } => {
      if (candidate === null) return false;
      const signature = candidate.route.points.map(pointKey).join('|');
      if (seenGeometries.has(signature)) return false;
      seenGeometries.add(signature);
      return true;
    },
  );

  if (validCandidates.length === 0) {
    throw new Error('No route found for selected points. Try different start/end locations.');
  }

  const scoredCandidates = normalizeCandidateScores(validCandidates);
  const selectedRoutes = selectRouteVariants(scoredCandidates, travelMode);

  cacheRoutes(cacheKey, selectedRoutes);
  return selectedRoutes;
};

export const calculateRoute = async (
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode = 'foot',
  routeType: RouteType = 'green',
): Promise<Route> => {
  const routes = await calculateMultipleRoutes(start, end, travelMode);
  const selectedRoute = routes.find((route) => route.type === routeType);
  if (selectedRoute) {
    return selectedRoute;
  }

  return routes[0];
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} min`;
};
