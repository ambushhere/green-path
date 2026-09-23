import type { Route, TravelMode } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';
import { getAirQualityBands, getAirQualityLevel } from '@/services/airQuality';
import type { AirQualityBand } from '@/services/airQuality';
import {
  Bike,
  Clock,
  Cloud,
  Footprints,
  Leaf,
  Loader2,
  Navigation,
  OctagonAlert,
  Shield,
  Sparkles,
  TriangleAlert,
  Wind,
} from 'lucide-react';

interface RouteInfoProps {
  routes: Route[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  isLoading?: boolean;
  /** True when no route carries a real measurement, so every air claim is withheld. */
  isAirQualityUnavailable?: boolean;
}

/** Non-colour severity cue, so a band survives greyscale and colour blindness. */
const BandIcon = ({ band, size = 13 }: { band: AirQualityBand; size?: number }) => {
  const props = { size, 'aria-hidden': true as const };

  switch (band.icon) {
    case 'leaf':
      return <Leaf {...props} />;
    case 'wind':
      return <Wind {...props} />;
    case 'cloud':
      return <Cloud {...props} />;
    case 'alert-triangle':
      return <TriangleAlert {...props} />;
    case 'alert-octagon':
      return <OctagonAlert {...props} />;
  }
};

/**
 * What each route option optimises.
 *
 * When air-quality data is missing the cleanliness claims have nothing behind them,
 * so the notes fall back to geometry. Naming a route "Balanced low pollution" on the
 * strength of an unavailable measurement is the kind of small lie this product cannot
 * afford.
 */
const getRouteMeta = (routeType: Route['type'], hasAirData: boolean) => {
  if (routeType === 'direct') {
    return {
      label: 'Direct',
      icon: <Navigation size={16} aria-hidden />,
      note: 'Shortest path',
    };
  }

  if (routeType === 'green') {
    return {
      label: hasAirData ? 'Green' : 'Alternative',
      icon: <Leaf size={16} aria-hidden />,
      note: hasAirData ? 'Balanced low pollution' : 'A different corridor',
    };
  }

  return {
    label: hasAirData ? 'Scenic' : 'Longer alternative',
    icon: <Sparkles size={16} aria-hidden />,
    note: hasAirData ? 'Cleaner with a light detour' : 'A longer way round',
  };
};

export const RouteInfo = ({
  routes,
  selectedIndex,
  onSelectRoute,
  travelMode,
  onTravelModeChange,
  isLoading = false,
  isAirQualityUnavailable = false,
}: RouteInfoProps) => {
  if (isLoading && routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8" role="status">
          <Loader2 size={32} className="animate-spin text-green-700" aria-hidden />
          <span className="ml-3 text-gray-600">Calculating routes…</span>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-600">
          <Leaf size={48} className="mx-auto mb-3 text-green-300" aria-hidden />
          <p>Set a start and a destination to compare routes.</p>
        </div>
      </div>
    );
  }

  // Names like "Green" and the legend claim a pollution comparison, which only holds
  // when every route was measured. Each card's own figures are gated per route below.
  const canCompareAir = routes.every((route) => route.airQualitySource !== 'mock');
  const hasAnyAirData = !isAirQualityUnavailable;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Travel mode selector. A tablist, so it announces as one control with a
          selected option rather than two unrelated buttons. */}
      <div className="flex border-b border-gray-200" role="tablist" aria-label="Travel mode">
        <button
          role="tab"
          aria-selected={travelMode === 'foot'}
          onClick={() => onTravelModeChange('foot')}
          disabled={isLoading}
          className={`flex-1 min-h-11 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
            travelMode === 'foot'
              ? 'bg-green-50 text-green-800 border-b-2 border-green-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Footprints size={18} aria-hidden />
          <span className="font-medium">Walk</span>
        </button>
        <button
          role="tab"
          aria-selected={travelMode === 'bike'}
          onClick={() => onTravelModeChange('bike')}
          disabled={isLoading}
          className={`flex-1 min-h-11 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
            travelMode === 'bike'
              ? 'bg-green-50 text-green-800 border-b-2 border-green-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Bike size={18} aria-hidden />
          <span className="font-medium">Bicycle</span>
        </button>
      </div>

      {isLoading && (
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-600 flex items-center gap-2" role="status">
          <Loader2 size={13} className="animate-spin" aria-hidden />
          Updating routes for {travelMode === 'bike' ? 'bicycle' : 'walking'} mode…
        </div>
      )}

      {/* The honest headline when no measurement exists. It sits above the cards,
          before any number is read, not below them as a footnote. */}
      {isAirQualityUnavailable && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <TriangleAlert size={16} className="mt-0.5 flex-shrink-0 text-amber-800" aria-hidden />
          <p className="text-xs leading-relaxed text-amber-900">
            <span className="font-semibold">No air-quality measurements available.</span>{' '}
            These routes are ranked by distance and time only. Safe Path will not show a
            pollution figure it could not measure.
          </p>
        </div>
      )}

      {/* Route cards */}
      <ul className="p-4 space-y-3 list-none">
        {routes.map((route, index) => {
          const band = getAirQualityLevel(route.avgPM25);
          const isSelected = index === selectedIndex;
          const routeMeta = getRouteMeta(route.type, canCompareAir);
          const hasAirData = route.airQualitySource !== 'mock';

          return (
            <li key={`${route.type}-${index}`}>
              <button
                onClick={() => onSelectRoute(index)}
                aria-pressed={isSelected}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                }`}
              >
                {/* Row 1: identity on the left, verdict right-aligned. Keeping these on
                    one shared baseline is what lets the three cards be scanned as a set. */}
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={isSelected ? 'text-green-800' : 'text-gray-600'}>
                      {routeMeta.icon}
                    </span>
                    <span className={`font-semibold truncate ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>
                      {routeMeta.label}
                    </span>
                    {isSelected && (
                      <span className="flex-shrink-0 rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-medium text-white">
                        Selected
                      </span>
                    )}
                  </span>

                  {hasAirData && (
                    <span
                      className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
                      style={{ backgroundColor: band.fill, color: band.text }}
                      title={band.level}
                    >
                      <BandIcon band={band} />
                      {band.shortLevel}
                    </span>
                  )}
                </div>

                {/* Row 2: the rationale gets its own line instead of fighting the pill. */}
                <p className="mt-1 text-xs text-gray-600">{routeMeta.note}</p>
                {!hasAirData && hasAnyAirData && (
                  <p className="mt-1 text-xs text-amber-900">No air-quality measurement along this route.</p>
                )}

                {/* Metrics. Fixed columns so distance, time and PM2.5 line up across all
                    three cards, which is the comparison the product exists to enable. */}
                <dl className={`mt-3 grid gap-3 ${hasAirData ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="min-w-0">
                    <dt className="flex items-center gap-1 text-[11px] text-gray-600">
                      <Navigation size={12} className="text-gray-500" aria-hidden />
                      Distance
                    </dt>
                    <dd className="mt-0.5 font-medium text-gray-900 tabular-nums">
                      {formatDistance(route.distance)}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="flex items-center gap-1 text-[11px] text-gray-600">
                      <Clock size={12} className="text-gray-500" aria-hidden />
                      Time
                    </dt>
                    <dd className="mt-0.5 font-medium text-gray-900 tabular-nums">
                      {formatDuration(route.duration)}
                    </dd>
                  </div>

                  {hasAirData && (
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Wind size={12} className="text-gray-500" aria-hidden />
                        PM2.5
                      </dt>
                      <dd className="mt-0.5 font-medium tabular-nums" style={{ color: band.text }}>
                        {route.avgPM25} µg/m³
                      </dd>
                    </div>
                  )}
                </dl>

                {hasAirData && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] text-gray-700 tabular-nums">
                      Health score {route.score}/100
                    </span>
                    {route.airQualitySource === 'mixed' && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900">
                        Partial measurements
                      </span>
                    )}
                  </div>
                )}

                {hasAirData && route.safety === 'safe' && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-green-100 p-2 text-xs text-green-900">
                    <Shield size={14} aria-hidden />
                    Well suited to allergy sufferers and children.
                  </p>
                )}
                {hasAirData && route.safety === 'unsafe' && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 p-2 text-xs text-red-900">
                    <OctagonAlert size={14} aria-hidden />
                    High pollution along this route. Not recommended today.
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Legend, generated from the same band table the badges read, so the two can
          no longer disagree about a name or a range. */}
      {hasAnyAirData && (
        <div className="px-4 pb-4">
          <h3 className="mb-2 text-xs font-medium text-gray-700">Air quality bands, µg/m³</h3>
          <ul className="flex list-none flex-wrap gap-1.5">
            {getAirQualityBands().map((band) => (
              <li
                key={band.level}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px]"
                style={{ backgroundColor: band.fill, color: band.text }}
              >
                <BandIcon band={band} size={12} />
                {band.shortLevel} <span className="tabular-nums opacity-80">{band.range}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RouteInfo;
