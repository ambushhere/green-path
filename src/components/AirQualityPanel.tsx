import { useState, useEffect, useCallback } from 'react';
import type { AirQualityData } from '@/types';
import { getAirQuality, getAirQualityLevel } from '@/services/airQuality';
import { Wind, Droplets, Sun, AlertCircle, RefreshCw, TriangleAlert, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AirQualityPanelProps {
  location: { lat: number; lng: number } | null;
}

export const AirQualityPanel = ({ location }: AirQualityPanelProps) => {
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500 py-4">
          <Wind size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Select a point on the map to view air quality</p>
        </div>
      </div>
    );
  }

  if (isLoading || !airQuality) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  const { level, color } = getAirQualityLevel(airQuality.pm25);

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Air Quality</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAirQuality}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Main PM2.5 indicator */}
      <div className="text-center mb-5">
        <div 
          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-3"
          style={{ backgroundColor: `${color}20` }}
        >
          <div>
            <div className="text-3xl font-bold" style={{ color }}>
              {airQuality.pm25}
            </div>
            <div className="text-xs text-gray-500">µg/m³</div>
          </div>
        </div>
        <Badge 
          className="text-sm px-3 py-1"
          style={{ backgroundColor: color, color: 'white' }}
        >
          {level}
        </Badge>

        <div className="mt-2 flex justify-center">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Radio size={12} />
            Data source: {airQuality.source}
          </Badge>
        </div>
      </div>

      {airQuality.warning && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
          <TriangleAlert size={16} />
          <AlertTitle>Estimated data</AlertTitle>
          <AlertDescription>{airQuality.warning}</AlertDescription>
        </Alert>
      )}

      {/* Detailed metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Wind size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">PM10</span>
          </div>
          <span className="font-medium">{airQuality.pm10} µg/m³</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">NO₂</span>
          </div>
          <span className="font-medium">{airQuality.no2} µg/m³</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">O₃</span>
          </div>
          <span className="font-medium">{airQuality.o3} µg/m³</span>
        </div>
      </div>

      {/* Health recommendations */}
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={18} style={{ color }} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-sm" style={{ color }}>
              Recommendations
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {airQuality.pm25 <= 12 && 'Air is clean. Great time for walks and outdoor activities.'}
              {airQuality.pm25 > 12 && airQuality.pm25 <= 35 && 'Air quality is good. You can walk freely without restrictions.'}
              {airQuality.pm25 > 35 && airQuality.pm25 <= 55 && 'Moderate pollution. People with sensitive respiratory systems should limit prolonged outdoor activity.'}
              {airQuality.pm25 > 55 && airQuality.pm25 <= 150 && 'Unhealthy air quality. Consider wearing a mask and avoid extended time outdoors.'}
              {airQuality.pm25 > 150 && 'Hazardous air quality. Avoid going outside; use a respirator if necessary.'}
            </p>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          Updated: {lastUpdated.toLocaleTimeString('en-US')}
        </div>
      )}
    </div>
  );
};

export default AirQualityPanel;
