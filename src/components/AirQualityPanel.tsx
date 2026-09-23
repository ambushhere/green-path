import { useState, useEffect, useCallback } from 'react';
import type { AirQualityData } from '@/types';
import { getAirQuality, getAirQualityLevel } from '@/services/airQuality';
import { Wind, Droplets, Sun, AlertCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AirQualityPanelProps {
  location: { lat: number; lng: number } | null;
  /** Which end of the journey this reading describes. */
  pointLabel?: string;
}

const healthAdviceFor = (pm25: number): string => {
  if (pm25 <= 12) return 'Air is clean. A good time for walks and outdoor activity.';
  if (pm25 <= 35) return 'Air quality is good. You can walk without restrictions.';
  if (pm25 <= 55) return 'Moderate pollution. People with sensitive airways should limit long periods outdoors.';
  if (pm25 <= 150) return 'Unhealthy air. Consider a mask and avoid extended time outdoors.';
  return 'Hazardous air. Avoid going outside; use a respirator if you must.';
};

export const AirQualityPanel = ({ location, pointLabel }: AirQualityPanelProps) => {
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAirQuality = useCallback(async () => {
    if (!location) return;

    setIsLoading(true);
    try {
      const data = await getAirQuality(location);
      setAirQuality(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch air quality:', error);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchAirQuality();
  }, [fetchAirQuality]);

  if (!location) {
    return (
      <section className="bg-white rounded-lg shadow-md p-6" aria-labelledby="air-quality-heading">
        <h3 id="air-quality-heading" className="sr-only">Air quality</h3>
        <div className="text-center text-gray-600 py-4">
          <Wind size={32} className="mx-auto mb-2 text-gray-400" aria-hidden />
          <p className="text-sm">Set a point on the map to see the air quality there.</p>
        </div>
      </section>
    );
  }

  if (isLoading || !airQuality) {
    return (
      <section className="bg-white rounded-lg shadow-md p-6" aria-labelledby="air-quality-heading">
        <h3 id="air-quality-heading" className="sr-only">Air quality</h3>
        <div className="flex items-center justify-center py-4" role="status">
          <Loader2 size={24} className="animate-spin text-green-700" aria-hidden />
          <span className="ml-2 text-sm text-gray-600">Loading air quality…</span>
        </div>
      </section>
    );
  }

  const headingSuffix = pointLabel ? ` at ${pointLabel}` : '';

  /**
   * No measurement could be obtained.
   *
   * The service still returns synthetic numbers so the routing algorithm has
   * something to rank with, but none of them are shown here. A fabricated µg/m³
   * beside a health recommendation is worse than no reading at all for an audience
   * that acts on it medically, so this branch renders the absence instead.
   */
  if (airQuality.source === 'mock') {
    return (
      <section className="bg-white rounded-lg shadow-md p-5" aria-labelledby="air-quality-heading">
        <div className="flex items-center justify-between mb-3">
          <h3 id="air-quality-heading" className="font-semibold text-gray-900">
            Air quality{headingSuffix}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAirQuality}
            disabled={isLoading}
            className="h-11 w-11 p-0"
            aria-label="Retry loading air quality"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} aria-hidden />
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <WifiOff size={28} className="mx-auto mb-2 text-gray-500" aria-hidden />
          <p className="text-sm font-medium text-gray-900">No measurement available here</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">
            {airQuality.warning}
          </p>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
          Safe Path shows a pollution figure only when a monitoring station reported one.
          Nothing on this panel is estimated or filled in.
        </p>
      </section>
    );
  }

  const band = getAirQualityLevel(airQuality.pm25);

  return (
    <section className="bg-white rounded-lg shadow-md p-5" aria-labelledby="air-quality-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="air-quality-heading" className="font-semibold text-gray-900">
          Air quality{headingSuffix}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAirQuality}
          disabled={isLoading}
          className="h-11 w-11 p-0"
          aria-label="Refresh air quality"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} aria-hidden />
        </Button>
      </div>

      {/* Main PM2.5 reading */}
      <div className="text-center mb-5">
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-3"
          style={{ backgroundColor: band.fill }}
        >
          <div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: band.text }}>
              {airQuality.pm25}
            </div>
            <div className="text-xs text-gray-600">µg/m³</div>
          </div>
        </div>
        <div>
          <span
            className="inline-block rounded-full px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: band.fill, color: band.text }}
          >
            {band.level}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-gray-600">
          Measured by a nearby monitoring station
        </p>
      </div>

      {/* Detailed metrics */}
      <dl className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <dt className="flex items-center gap-2">
            <Wind size={18} className="text-gray-500" aria-hidden />
            <span className="text-sm text-gray-700">PM10</span>
          </dt>
          <dd className="font-medium tabular-nums">{airQuality.pm10} µg/m³</dd>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <dt className="flex items-center gap-2">
            <Droplets size={18} className="text-gray-500" aria-hidden />
            <span className="text-sm text-gray-700">NO₂</span>
          </dt>
          <dd className="font-medium tabular-nums">{airQuality.no2} µg/m³</dd>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <dt className="flex items-center gap-2">
            <Sun size={18} className="text-gray-500" aria-hidden />
            <span className="text-sm text-gray-700">O₃</span>
          </dt>
          <dd className="font-medium tabular-nums">{airQuality.o3} µg/m³</dd>
        </div>
      </dl>

      {/* Health recommendation, shown only against a real measurement. */}
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: band.fill }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={18} style={{ color: band.text }} className="mt-0.5 flex-shrink-0" aria-hidden />
          <div>
            <div className="font-medium text-sm" style={{ color: band.text }}>
              What this means
            </div>
            <p className="text-xs text-gray-800 mt-1 leading-relaxed">
              {healthAdviceFor(airQuality.pm25)}
            </p>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <p className="mt-3 text-xs text-gray-600 text-center tabular-nums">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
};

export default AirQualityPanel;
