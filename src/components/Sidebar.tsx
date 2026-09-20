import { useState } from 'react';
import { ArrowUpDown, Crosshair, Heart, Leaf, Loader2, MapPin, Shield, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocationSearch } from '@/components/LocationSearch';
import { RouteInfo } from '@/components/RouteInfo';
import { AirQualityPanel } from '@/components/AirQualityPanel';
import { ShareRouteMenu } from '@/components/ShareRouteMenu';
import type { LatLng, Route, SearchLocation, TravelMode } from '@/types';

interface SidebarProps {
  startAddress: string;
  endAddress: string;
  startPoint: LatLng | null;
  endPoint: LatLng | null;
  routes: Route[];
  selectedRouteIndex: number;
  travelMode: TravelMode;
  isCalculating: boolean;
  routeError: string | null;
  isAirQualityUnavailable: boolean;
  currentLocation: LatLng | null;
  isLocating: boolean;
  onStartAddressChange: (value: string) => void;
  onEndAddressChange: (value: string) => void;
  onStartSelect: (location: SearchLocation) => void;
  onEndSelect: (location: SearchLocation) => void;
  onCalculateRoutes: () => void;
  onClearRoute: () => void;
  onSwapPoints: () => void;
  onSelectRoute: (index: number) => void;
  onTravelModeChange: (mode: TravelMode) => void;
  onUseCurrentLocation: () => void;
  onLocate: () => void;
}

export const Sidebar = ({
  startAddress,
  endAddress,
  startPoint,
  endPoint,
  routes,
  selectedRouteIndex,
  travelMode,
  isCalculating,
  routeError,
  isAirQualityUnavailable,
  currentLocation,
  isLocating,
  onStartAddressChange,
  onEndAddressChange,
  onStartSelect,
  onEndSelect,
  onCalculateRoutes,
  onClearRoute,
  onSwapPoints,
  onSelectRoute,
  onTravelModeChange,
  onUseCurrentLocation,
  onLocate,
}: SidebarProps) => {
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasError = routeError || searchError;
  const airQualityPoint = startPoint ?? endPoint;
  const airQualityPointLabel = startPoint ? 'your start' : endPoint ? 'your destination' : undefined;

  return (
    <div className="p-4 space-y-4">
      <section className="bg-gray-50 rounded-lg p-4" aria-labelledby="route-heading">
        <h2 id="route-heading" className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={18} aria-hidden />
          Route
        </h2>

        <div className="space-y-3">
          <LocationSearch
            label="From"
            placeholder="Address, or tap the map"
            value={startAddress}
            onChange={onStartAddressChange}
            onSelect={onStartSelect}
            onError={setSearchError}
            icon={<span className="font-bold text-green-700">A</span>}
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={currentLocation ? onUseCurrentLocation : onLocate}
              disabled={isLocating}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-50 disabled:opacity-60"
            >
              {isLocating
                ? <Loader2 size={15} className="animate-spin" aria-hidden />
                : <Crosshair size={15} aria-hidden />}
              Use my location
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onSwapPoints}
              aria-label="Swap start and destination"
              className="h-11 w-11 flex-shrink-0 rounded-full p-0"
            >
              <ArrowUpDown size={18} aria-hidden />
            </Button>
          </div>

          <LocationSearch
            label="To"
            placeholder="Address, or tap the map"
            value={endAddress}
            onChange={onEndAddressChange}
            onSelect={onEndSelect}
            onError={setSearchError}
            icon={<span className="font-bold text-red-700">B</span>}
          />
        </div>

        <div className="flex gap-2 mt-4">
          {/* green-700 rather than green-600: the lighter tone measured 3.2:1 against
              its own label, below the 4.5:1 that normal-size text requires. */}
          <Button
            onClick={onCalculateRoutes}
            disabled={isCalculating || !startPoint || !endPoint}
            className="h-11 flex-1 bg-green-700 text-base hover:bg-green-800"
          >
            {isCalculating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" aria-hidden />
                Calculating…
              </>
            ) : (
              'Find routes'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClearRoute}
            disabled={!startPoint && !endPoint}
            className="h-11 px-4"
          >
            Clear
          </Button>
        </div>
      </section>

      {hasError && (
        <Alert className="border-red-300 bg-red-50 text-red-900">
          <TriangleAlert size={16} aria-hidden />
          <AlertTitle>Route data issue</AlertTitle>
          <AlertDescription>{routeError || searchError}</AlertDescription>
        </Alert>
      )}

      {/* Route results arrive asynchronously, so they are announced rather than
          silently appearing for anyone not watching this region. */}
      <div aria-live="polite" className="sr-only">
        {isCalculating
          ? 'Calculating routes'
          : routes.length > 0
            ? `${routes.length} routes found. Route ${selectedRouteIndex + 1} is selected.`
            : ''}
      </div>

      <RouteInfo
        routes={routes}
        selectedIndex={selectedRouteIndex}
        onSelectRoute={onSelectRoute}
        travelMode={travelMode}
        onTravelModeChange={onTravelModeChange}
        isLoading={isCalculating}
        isAirQualityUnavailable={isAirQualityUnavailable}
      />

      {routes.length > 0 && startPoint && endPoint && (
        <ShareRouteMenu
          startPoint={startPoint}
          endPoint={endPoint}
          startAddress={startAddress}
          endAddress={endAddress}
          selectedRoute={routes[selectedRouteIndex]}
          travelMode={travelMode}
        />
      )}

      <AirQualityPanel location={airQualityPoint} pointLabel={airQualityPointLabel} />

      <section className="rounded-lg bg-green-50 p-4" aria-labelledby="about-heading">
        <h3 id="about-heading" className="mb-2 flex items-center gap-2 font-semibold text-green-900">
          <Shield size={18} aria-hidden />
          About Safe Path
        </h3>
        <p className="mb-3 text-sm text-green-900">
          Safe Path weighs distance, travel time and measured air quality together, so you
          can trade a few extra minutes for cleaner air.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-green-900">
          <span className="inline-flex items-center gap-1">
            <Leaf size={13} aria-hidden />
            Measured air routing
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={13} aria-hidden />
            Health-first scoring
          </span>
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
