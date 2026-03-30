import { describe, expect, it } from 'vitest';
import type { Route } from '@/types';
import { buildAppleMapsUrl, buildGoogleMapsUrl, buildShareText } from './share';

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
    expect(text).toContain('Green Path Route');
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

  it('capitalises route type in output', () => {
    const route = makeRoute({ type: 'scenic' });
    const text = buildShareText('A', 'B', route, 'foot');
    expect(text).toContain('Scenic');
  });
});
