import { describe, expect, it } from 'vitest';
import type { Route } from '@/types';
import {
  MAX_GOOGLE_WAYPOINTS,
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  buildShareText,
  downsampleWaypoints,
} from './share';

const makeRoute = (overrides: Partial<Route> = {}): Route => ({
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

describe('buildGoogleMapsUrl', () => {
  it('builds a walking directions URL', () => {
    const url = buildGoogleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'foot');
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('origin=55.75,37.62');
    expect(url).toContain('destination=55.76,37.63');
    expect(url).toContain('travelmode=walking');
  });

  it('builds a bicycling directions URL', () => {
    const url = buildGoogleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'bike');
    expect(url).toContain('travelmode=bicycling');
  });

  it('omits the waypoints parameter when no route geometry is supplied', () => {
    const url = buildGoogleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'foot');
    expect(url).not.toContain('waypoints=');
  });

  it('carries the chosen path through as waypoints', () => {
    const points = [
      { lat: 55.75, lng: 37.62 },
      { lat: 55.752, lng: 37.622 },
      { lat: 55.754, lng: 37.624 },
      { lat: 55.76, lng: 37.63 },
    ];

    const url = buildGoogleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'foot', points);
    expect(url).toContain('waypoints=55.752,37.622|55.754,37.624');
  });
});

describe('downsampleWaypoints', () => {
  it('drops both endpoints, since they travel as origin and destination', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
    ];

    expect(downsampleWaypoints(points)).toEqual([{ lat: 1, lng: 1 }]);
  });

  it('returns nothing when the route has no interior points', () => {
    expect(downsampleWaypoints([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toEqual([]);
    expect(downsampleWaypoints([])).toEqual([]);
  });

  it('never exceeds the Google waypoint ceiling', () => {
    const points = Array.from({ length: 500 }, (_, index) => ({ lat: index, lng: index }));
    const sampled = downsampleWaypoints(points);

    expect(sampled).toHaveLength(MAX_GOOGLE_WAYPOINTS);
  });

  it('samples evenly across the route rather than clustering at the start', () => {
    const points = Array.from({ length: 100 }, (_, index) => ({ lat: index, lng: 0 }));
    const sampled = downsampleWaypoints(points, 4);

    expect(sampled.map((point) => point.lat)).toEqual([1, 25, 50, 74]);
  });
});

describe('buildAppleMapsUrl', () => {
  it('builds a walking directions URL', () => {
    const url = buildAppleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'foot');
    expect(url).toContain('https://maps.apple.com/?');
    expect(url).toContain('saddr=55.75,37.62');
    expect(url).toContain('daddr=55.76,37.63');
    expect(url).toContain('dirflg=w');
  });

  it('builds a cycling directions URL', () => {
    const url = buildAppleMapsUrl({ lat: 55.75, lng: 37.62 }, { lat: 55.76, lng: 37.63 }, 'bike');
    expect(url).toContain('dirflg=c');
  });
});

describe('buildShareText', () => {
  it('includes all key route details', () => {
    const route = makeRoute({ type: 'green', distance: 1500, duration: 900, avgPM25: 12, score: 90 });
    const text = buildShareText('Central Park', 'Times Square', route, 'foot');
    expect(text).toContain('Safe Path route');
    expect(text).toContain('From: Central Park');
    expect(text).toContain('To:   Times Square');
    expect(text).toContain('Walking');
    expect(text).toContain('Green');
    expect(text).toContain('PM2.5: 12');
    expect(text).toContain('90/100');
  });

  it('shows Bicycle for bike travel mode', () => {
    const route = makeRoute({ type: 'direct' });
    const text = buildShareText('A', 'B', route, 'bike');
    expect(text).toContain('Bicycle');
  });

  it('never shares a PM2.5 figure that was never measured', () => {
    const route = makeRoute({ airQualitySource: 'mock', avgPM25: 53, score: 44 });
    const text = buildShareText('A', 'B', route, 'foot');

    expect(text).toContain('no measurement available');
    expect(text).not.toContain('53');
    expect(text).not.toContain('44/100');
  });

  it('capitalises route type in output', () => {
    const route = makeRoute({ type: 'scenic' });
    const text = buildShareText('A', 'B', route, 'foot');
    expect(text).toContain('Scenic');
  });
});
