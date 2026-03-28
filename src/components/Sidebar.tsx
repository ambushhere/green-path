import { useState } from 'react';
import { Heart, Leaf, MapPin, Shield, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocationSearch } from '@/components/LocationSearch';
import { RouteInfo } from '@/components/RouteInfo';
import { AirQualityPanel } from '@/components/AirQualityPanel';
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
  onStartAddressChange: (value: string) => void;
  onEndAddressChange: (value: string) => void;
  onStartSelect: (location: SearchLocation) => void;
  onEndSelect: (location: SearchLocation) => void;
  onCalculateRoutes: () => void;
  onClearRoute: () => void;
  onSwapPoints: () => void;
  onSelectRoute: (index: number) => void;
  onTravelModeChange: (mode: TravelMode) => void;
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
  onStartAddressChange,
  onEndAddressChange,
  onStartSelect,
  onEndSelect,
  onCalculateRoutes,
  onClearRoute,
  onSwapPoints,
  onSelectRoute,
  onTravelModeChange,
}: SidebarProps) => {
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasError = routeError || searchError;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={18} />
          Route
        </h2>

        <div className="space-y-3">
          <LocationSearch
            label="From"
            placeholder="Enter address or click on the map"
            value={startAddress}
            onChange={onStartAddressChange}
            onSelect={onStartSelect}
            onError={setSearchError}
            icon={<span className="text-green-600 font-bold">A</span>}
          />

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwapPoints}
              className="h-8 w-8 p-0 rounded-full"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 2L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 10L8 14L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>

          <LocationSearch
            label="To"
            placeholder="Enter address or click on the map"
            value={endAddress}
            onChange={onEndAddressChange}
            onSelect={onEndSelect}
            onError={setSearchError}
            icon={<span className="text-red-600 font-bold">B</span>}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={onCalculateRoutes}
            disabled={isCalculating || !startPoint || !endPoint}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Calculating...
              </>
            ) : (
              'Calculate Route'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClearRoute}
            disabled={!startPoint && !endPoint}
          >
            Clear
          </Button>
        </div>
      </div>

      {hasError && (
        <Alert className="border-red-300 bg-red-50 text-red-900">
          <TriangleAlert size={16} />
          <AlertTitle>Route data issue</AlertTitle>
          <AlertDescription>{routeError || searchError}</AlertDescription>
        </Alert>
      )}

      <RouteInfo
        routes={routes}
        selectedIndex={selectedRouteIndex}
        onSelectRoute={onSelectRoute}
        travelMode={travelMode}
        onTravelModeChange={onTravelModeChange}
        isLoading={isCalculating}
      />

      <AirQualityPanel location={startPoint || endPoint} />

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
          <Shield size={18} />
          About Safe Path
        </h3>
        <p className="text-sm text-green-800 mb-3">
          Safe Path combines route distance, travel time, and live air quality to prioritize healthier paths.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-green-700">
          <span className="inline-flex items-center gap-1">
            <Leaf size={13} />
            API-aware routing
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={13} />
            Health-first scoring
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
