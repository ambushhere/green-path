import { describe, expect, it } from 'vitest';
import type { Route } from '@/types';
import { selectRouteVariants, formatDuration, generateCandidateCorridors, type ScoredRouteCandidate } from './routing';

const makeRoute = (overrides: Partial<Route>): Route => ({
  type: 'direct',
  points: [],
  distance: 1000,
  duration: 600,
  avgPM25: 20,
  score: 80,
  airQualitySource: 'live',
  safety: 'safe',
  ...overrides,
});

const makeCandidate = (
  id: string,
  route: Partial<Route>,
  metrics: Pick<ScoredRouteCandidate, 'distanceNorm' | 'durationNorm' | 'pmNorm' | 'corridorScore'>,
): ScoredRouteCandidate => ({
  id,
  route: makeRoute(route),
  ...metrics,
});

describe('selectRouteVariants', () => {
  it('returns direct, green, scenic route types in order', () => {
    const candidates: ScoredRouteCandidate[] = [
      makeCandidate('fast', { distance: 800, duration: 500, avgPM25: 35 }, {
        distanceNorm: 1,
        durationNorm: 1,
        pmNorm: 1.5,
        corridorScore: 1,
      }),
      makeCandidate('clean', { distance: 1100, duration: 640, avgPM25: 10 }, {
        distanceNorm: 1.3,
        durationNorm: 1.28,
        pmNorm: 1,
        corridorScore: 1.1,
      }),
      makeCandidate('balanced', { distance: 980, duration: 580, avgPM25: 18 }, {
        distanceNorm: 1.1,
        durationNorm: 1.12,
        pmNorm: 1.1,
        corridorScore: 1.02,
      }),
    ];

    const selected = selectRouteVariants(candidates);

    expect(selected).toHaveLength(3);
    expect(selected[0].type).toBe('direct');
    expect(selected[1].type).toBe('green');
    expect(selected[2].type).toBe('scenic');
  });

  it('keeps route IDs unique when enough candidates exist', () => {
    const candidates: ScoredRouteCandidate[] = [
      makeCandidate('a', { distance: 900, duration: 500, avgPM25: 28 }, {
        distanceNorm: 1,
        durationNorm: 1,
        pmNorm: 1.2,
        corridorScore: 1,
      }),
      makeCandidate('b', { distance: 980, duration: 560, avgPM25: 17 }, {
        distanceNorm: 1.1,
        durationNorm: 1.2,
        pmNorm: 1,
        corridorScore: 1.1,
      }),
      makeCandidate('c', { distance: 1100, duration: 620, avgPM25: 19 }, {
        distanceNorm: 1.25,
        durationNorm: 1.15,
        pmNorm: 1.05,
        corridorScore: 1.15,
      }),
    ];

    const selected = selectRouteVariants(candidates);
    const uniqueByShape = new Set(selected.map((route) => `${route.distance}-${route.duration}-${route.avgPM25}`));

    expect(uniqueByShape.size).toBe(selected.length);
  });

  it('changes ranking between walking and bicycle mode', () => {
    const candidates: ScoredRouteCandidate[] = [
      makeCandidate('fast-shorter', { distance: 900, duration: 650, avgPM25: 35 }, {
        distanceNorm: 1,
        durationNorm: 1.3,
        pmNorm: 1.4,
        corridorScore: 1,
      }),
      makeCandidate('cleaner-longer', { distance: 1080, duration: 620, avgPM25: 13 }, {
        distanceNorm: 1.2,
        durationNorm: 1.24,
        pmNorm: 1,
        corridorScore: 1.05,
      }),
      makeCandidate('balanced', { distance: 1020, duration: 600, avgPM25: 22 }, {
        distanceNorm: 1.13,
        durationNorm: 1.2,
        pmNorm: 1.15,
        corridorScore: 1.1,
      }),
    ];

    const walking = selectRouteVariants(candidates, 'foot');
    const biking = selectRouteVariants(candidates, 'bike');

    expect(walking[0].distance).not.toBe(biking[0].distance);
  });
});

describe('generateCandidateCorridors', () => {
  it('places both waypoints on the same side of the start-end line (no S-curves)', () => {
    const start = { lat: 55.75, lng: 37.62 };
    const end = { lat: 55.76, lng: 37.64 };
    const deltaLat = end.lat - start.lat;
    const deltaLng = end.lng - start.lng;

    // Cross product sign tells which side of the start→end line a point is on.
    // cross > 0: left side; cross < 0: right side; 0: on the line.
    const crossSign = (p: { lat: number; lng: number }) =>
      Math.sign(deltaLng * (p.lat - start.lat) - deltaLat * (p.lng - start.lng));

    const corridors = generateCandidateCorridors(start, end, 'foot');

    for (const corridor of corridors) {
      const [, wp1, wp2] = corridor.waypoints;
      const s1 = crossSign(wp1);
      const s2 = crossSign(wp2);
      // Both waypoints must be on the same side (or on the line for the center corridor).
      const onSameSide = s1 === 0 || s2 === 0 || s1 === s2;
      expect(onSameSide).toBe(true);
    }
  });
});

describe('formatDuration', () => {
  it('formats short durations in minutes', () => {
    expect(formatDuration(9 * 60)).toBe('9 min');
  });

  it('formats long durations in hours and minutes', () => {
    expect(formatDuration(90 * 60)).toBe('1 h 30 min');
  });
});
