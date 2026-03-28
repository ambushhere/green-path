import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LatLng, Route, SearchLocation, TravelMode } from '@/types';
import { calculateMultipleRoutes } from '@/services/routing';
import { reverseGeocode } from '@/services/geocoding';

const DEFAULT_MAP_CENTER: LatLng = { lat: 55.7558, lng: 37.6173 };

const formatCoordinateFallback = (location: LatLng): string =>
  `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;

export const useRoutePlanner = () => {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>('foot');
  const [isCalculating, setIsCalculating] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER);
  const [routeError, setRouteError] = useState<string | null>(null);

  const allAirQualityData = useMemo(
    () => routes.flatMap((route) => route.points.filter((point) => point.airQuality).map((point) => point.airQuality!)),
    [routes],
  );

  const calculateRoutes = useCallback(async () => {
    if (!startPoint || !endPoint) {
      toast.error('Please select point A and point B');
      return;
    }

    setRouteError(null);
    setIsCalculating(true);

    try {
      const calculatedRoutes = await calculateMultipleRoutes(startPoint, endPoint, travelMode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);

      if (calculatedRoutes.length > 0) {
        toast.success(`${calculatedRoutes.length} routes calculated`);
      }
    } catch (error) {
      const fallbackMessage = 'Unable to calculate routes right now. Please try different points.';
      const message = error instanceof Error ? error.message : fallbackMessage;
      setRouteError(message);
      toast.error(message);
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, travelMode]);

  const handleTravelModeChange = useCallback(async (mode: TravelMode) => {
    setTravelMode(mode);

    if (!startPoint || !endPoint || isCalculating) {
      return;
    }

    setRouteError(null);
    setIsCalculating(true);

    try {
      const calculatedRoutes = await calculateMultipleRoutes(startPoint, endPoint, mode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
      toast.success(mode === 'bike' ? 'Bicycle routes updated' : 'Walking routes updated');
    } catch (error) {
      const fallbackMessage = 'Unable to update routes for selected travel mode.';
      const message = error instanceof Error ? error.message : fallbackMessage;
      setRouteError(message);
      toast.error(message);
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, isCalculating]);

  const handleStartSelect = useCallback((location: SearchLocation) => {
    setStartPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
    setRouteError(null);
  }, []);

  const handleEndSelect = useCallback((location: SearchLocation) => {
    setEndPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
    setRouteError(null);
  }, []);

  const handleMapClick = useCallback(async (latlng: LatLng) => {
    if (!startPoint) {
      setStartPoint(latlng);
      setMapCenter(latlng);
      setRouteError(null);
      toast.info('Point A set. Now select point B.');

      try {
        const address = await reverseGeocode(latlng);
        setStartAddress(address || formatCoordinateFallback(latlng));
      } catch {
        setStartAddress(formatCoordinateFallback(latlng));
      }

      return;
    }

    if (!endPoint) {
      setEndPoint(latlng);
      setMapCenter(latlng);
      setRouteError(null);
      toast.success('Point B set!');

      try {
        const address = await reverseGeocode(latlng);
        setEndAddress(address || formatCoordinateFallback(latlng));
      } catch {
        setEndAddress(formatCoordinateFallback(latlng));
      }
    }
  }, [startPoint, endPoint]);

  const clearRoute = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setStartAddress('');
    setEndAddress('');
    setRoutes([]);
    setSelectedRouteIndex(0);
    setRouteError(null);
    toast.info('Route cleared');
  }, []);

  const swapPoints = useCallback(async () => {
    const nextStartPoint = endPoint;

    setStartPoint(endPoint);
    setStartAddress(endAddress);
    setEndPoint(startPoint);
    setEndAddress(startAddress);
    setRouteError(null);

    if (nextStartPoint) {
      setMapCenter(nextStartPoint);
    }

    if (routes.length > 0 && nextStartPoint && startPoint) {
      try {
        setIsCalculating(true);
        const recalculatedRoutes = await calculateMultipleRoutes(nextStartPoint, startPoint, travelMode);
        setRoutes(recalculatedRoutes);
        setSelectedRouteIndex(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to recalculate route after swapping points.';
        setRouteError(message);
        toast.error(message);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [startPoint, endPoint, startAddress, endAddress, routes.length, travelMode]);

  return {
    startPoint,
    endPoint,
    startAddress,
    endAddress,
    routes,
    selectedRouteIndex,
    travelMode,
    isCalculating,
    mapCenter,
    routeError,
    allAirQualityData,
    setStartAddress,
    setEndAddress,
    setSelectedRouteIndex,
    handleTravelModeChange,
    handleStartSelect,
    handleEndSelect,
    handleMapClick,
    calculateRoutes,
    clearRoute,
    swapPoints,
  };
};
