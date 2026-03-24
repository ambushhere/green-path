import type { Route, TravelMode } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';
import { getAirQualityLevel } from '@/services/airQuality';
import { Wind, Clock, Navigation, Shield, Leaf, Bike, Footprints } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RouteInfoProps {
  routes: Route[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  isLoading?: boolean;
}

export const RouteInfo = ({
  routes,
  selectedIndex,
  onSelectRoute,
  travelMode,
  onTravelModeChange,
  isLoading = false
}: RouteInfoProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Calculating routes...</span>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">
          <Leaf size={48} className="mx-auto mb-3 text-green-300" />
          <p>Select point A and point B to calculate a route</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Travel mode selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onTravelModeChange('foot')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
            travelMode === 'foot'
              ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Footprints size={18} />
          <span className="font-medium">Walk</span>
        </button>
        <button
          onClick={() => onTravelModeChange('bike')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
            travelMode === 'bike'
              ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Bike size={18} />
          <span className="font-medium">Bicycle</span>
        </button>
      </div>

      {/* Route cards */}
      <div className="p-4 space-y-3">
        {routes.map((route, index) => {
          const { level, color } = getAirQualityLevel(route.avgPM25);
          const isSelected = index === selectedIndex;
          
          let routeLabel = 'Direct';
          let routeIcon = <Navigation size={16} />;
          if (index === 1) {
            routeLabel = 'Green';
            routeIcon = <Leaf size={16} />;
          } else if (index === 2) {
            routeLabel = 'Cleanest';
            routeIcon = <Shield size={16} />;
          }

          return (
            <button
              key={index}
              onClick={() => onSelectRoute(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`${isSelected ? 'text-green-700' : 'text-gray-600'}`}>
                    {routeIcon}
                  </span>
                  <span className={`font-semibold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                    {routeLabel}
                  </span>
                  {isSelected && (
                    <Badge variant="default" className="bg-green-600">
                      Selected
                    </Badge>
                  )}
                </div>
                <div 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: `${color}20`,
                    color: color 
                  }}
                >
                  {level}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Navigation size={16} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Distance</div>
                    <div className="font-medium text-gray-900">
                      {formatDistance(route.distance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Time</div>
                    <div className="font-medium text-gray-900">
                      {formatDuration(route.duration)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wind size={16} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">PM2.5</div>
                    <div className="font-medium" style={{ color }}>
                      {route.avgPM25} µg/m³
                    </div>
                  </div>
                </div>
              </div>

              {/* Health tip */}
              {route.safety === 'safe' && (
                <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800 flex items-center gap-2">
                  <Shield size={14} />
                  Great choice for allergy sufferers and children!
                </div>
              )}
              {route.safety === 'unsafe' && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800 flex items-center gap-2">
                  <Wind size={14} />
                  High pollution level — not recommended
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 mb-2">Air quality:</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
            Excellent (0-12)
          </span>
          <span className="px-2 py-1 rounded text-xs bg-lime-100 text-lime-700">
            Good (12-35)
          </span>
          <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
            Moderate (35-55)
          </span>
          <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
            Unhealthy (55-150)
          </span>
        </div>
      </div>
    </div>
  );
};

export default RouteInfo;
