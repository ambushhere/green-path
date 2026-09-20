import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { LatLng, Route, RouteType, SearchLocation, TravelMode } from '@/types';
import { calculateMultipleRoutes } from '@/services/routing';
import { reverseGeocode } from '@/services/geocoding';
import { detectCityByIp, getPreciseLocation, PreciseLocationError } from '@/services/geolocation';

/** Fallback view when nothing is known about the visitor. */
const DEFAULT_MAP_CENTER: LatLng = { lat: 55.7558, lng: 37.6173 };
const DEFAULT_MAP_ZOOM = 13;
/** City-level: wide enough to show a whole urban area from an IP-derived centre. */
const CITY_MAP_ZOOM = 12;
/** Street-level: only ever used for a position the device actually measured. */
const PRECISE_MAP_ZOOM = 16;

const isValidCoordinate = (latlng: LatLng): boolean =>
  Number.isFinite(latlng.lat)
  && Number.isFinite(latlng.lng)
  && latlng.lat >= -90
  && latlng.lat <= 90
  && latlng.lng >= -180
  && latlng.lng <= 180;

const formatCoordinateFallback = (location: LatLng): string =>
  `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;

/**
 * Which route to select once a set comes back.
 *
 * The product exists to surface the cleanest option, so that is the default, not
 * the first element. The one exception is a set with no live air data at all:
 * ranking those by PM2.5 would be ranking invented numbers, so the geometrically
 * direct route wins instead and the UI says why.
 */
const pickDefaultRouteIndex = (routes: Route[]): number => {
  if (routes.length === 0) return 0;

  const hasLiveAirQuality = routes.some((route) => route.airQualitySource !== 'mock');
  if (!hasLiveAirQuality) return 0;

  return routes.reduce(
    (bestIndex, route, index) => (route.avgPM25 < routes[bestIndex].avgPM25 ? index : bestIndex),
    0,
  );
};

/**
 * Keep a deliberate choice alive across a recalculation by matching on route type.
 * Resetting to the default here would silently discard a decision the visitor made.
 */
const preserveRouteSelection = (routes: Route[], previousType: RouteType | null): number => {
  if (previousType) {
    const matchingIndex = routes.findIndex((route) => route.type === previousType);
    if (matchingIndex >= 0) return matchingIndex;
  }

  return pickDefaultRouteIndex(routes);
};

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
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  /**
   * True once the visitor has moved the map themselves. After that, an IP lookup
   * that arrives late must not yank the view out from under them.
   */
  const hasUserPositionedMap = useRef(false);

  const allAirQualityData = useMemo(
    () => routes.flatMap((route) => route.points.filter((point) => point.airQuality).map((point) => point.airQuality!)),
    [routes],
  );

  /** True when not one route carries a real measurement, so air claims must be withheld. */
  const isAirQualityUnavailable = useMemo(
    () => routes.length > 0 && routes.every((route) => route.airQualitySource === 'mock'),
    [routes],
  );

  // Open the map on the visitor's own city. IP-derived, so it costs no permission
  // prompt and no interaction; it is approximate by nature and never fills in a
  // route point, it only chooses where the map starts.
  useEffect(() => {
    let cancelled = false;

    detectCityByIp().then((detected) => {
      if (cancelled || !detected || hasUserPositionedMap.current) return;

      setMapCenter({ lat: detected.lat, lng: detected.lng });
      setMapZoom(CITY_MAP_ZOOM);
      setDetectedCity(detected.city);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const calculateRoutes = useCallback(async () => {
    if (!startPoint || !endPoint) {
      toast.error('Set both a start and a destination first.');
      return;
    }

    setRouteError(null);
    setIsCalculating(true);

    try {
      const calculatedRoutes = await calculateMultipleRoutes(startPoint, endPoint, travelMode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(pickDefaultRouteIndex(calculatedRoutes));

      if (calculatedRoutes.length > 0) {
        toast.success(`${calculatedRoutes.length} routes found`);
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

    const previouslySelectedType = routes[selectedRouteIndex]?.type ?? null;

    setRouteError(null);
    setIsCalculating(true);

    try {
      const calculatedRoutes = await calculateMultipleRoutes(startPoint, endPoint, mode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(preserveRouteSelection(calculatedRoutes, previouslySelectedType));
      toast.success(mode === 'bike' ? 'Bicycle routes updated' : 'Walking routes updated');
    } catch (error) {
      const fallbackMessage = 'Unable to update routes for selected travel mode.';
      const message = error instanceof Error ? error.message : fallbackMessage;
      setRouteError(message);
      toast.error(message);
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, isCalculating, routes, selectedRouteIndex]);

  const handleStartSelect = useCallback((location: SearchLocation) => {
    hasUserPositionedMap.current = true;
    setStartPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
    setMapZoom(DEFAULT_MAP_ZOOM);
    setRouteError(null);
  }, []);

  const handleEndSelect = useCallback((location: SearchLocation) => {
    hasUserPositionedMap.current = true;
    setEndPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
    setMapZoom(DEFAULT_MAP_ZOOM);
    setRouteError(null);
  }, []);

  const resolveAddress = useCallback(async (
    latlng: LatLng,
    apply: (address: string) => void,
  ) => {
    try {
      const address = await reverseGeocode(latlng);
      apply(address || formatCoordinateFallback(latlng));
    } catch {
      apply(formatCoordinateFallback(latlng));
    }
  }, []);

  const handleMapClick = useCallback(async (latlng: LatLng) => {
    if (!isValidCoordinate(latlng)) return;

    hasUserPositionedMap.current = true;

    if (!startPoint) {
      setStartPoint(latlng);
      setRouteError(null);
      toast.info('Start set. Now choose your destination.');
      await resolveAddress(latlng, setStartAddress);
      return;
    }

    if (!endPoint) {
      setEndPoint(latlng);
      setRouteError(null);
      toast.success('Destination set.');
      await resolveAddress(latlng, setEndAddress);
      return;
    }

    // Both points exist. Previously this branch did nothing at all, which quietly
    // broke the "tap the map to place a point" model the app had just taught.
    toast.info('Both points are set. Drag a marker to move it, or press Clear to start over.');
  }, [startPoint, endPoint, resolveAddress]);

  /** Move an existing point by dragging its marker, then refresh any routes on screen. */
  const handleMarkerDrag = useCallback(async (marker: 'start' | 'end', latlng: LatLng) => {
    if (!isValidCoordinate(latlng)) return;

    hasUserPositionedMap.current = true;
    setRouteError(null);

    const nextStart = marker === 'start' ? latlng : startPoint;
    const nextEnd = marker === 'end' ? latlng : endPoint;

    if (marker === 'start') {
      setStartPoint(latlng);
      await resolveAddress(latlng, setStartAddress);
    } else {
      setEndPoint(latlng);
      await resolveAddress(latlng, setEndAddress);
    }

    if (routes.length === 0 || !nextStart || !nextEnd) return;

    const previouslySelectedType = routes[selectedRouteIndex]?.type ?? null;

    try {
      setIsCalculating(true);
      const recalculatedRoutes = await calculateMultipleRoutes(nextStart, nextEnd, travelMode);
      setRoutes(recalculatedRoutes);
      setSelectedRouteIndex(preserveRouteSelection(recalculatedRoutes, previouslySelectedType));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to recalculate after moving the point.';
      setRouteError(message);
      toast.error(message);
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, routes, selectedRouteIndex, travelMode, resolveAddress]);

  /**
   * Precise position, on demand only. This is the one path that shows the browser
   * permission prompt, and it runs because the visitor pressed a control.
   */
  const locateMe = useCallback(async () => {
    setIsLocating(true);

    try {
      const position = await getPreciseLocation();
      hasUserPositionedMap.current = true;
      setCurrentLocation(position);
      setMapCenter(position);
      setMapZoom(PRECISE_MAP_ZOOM);
      toast.success('Centred on your location.');
    } catch (error) {
      const message = error instanceof PreciseLocationError
        ? error.message
        : 'Could not determine your location.';
      toast.error(message);
    } finally {
      setIsLocating(false);
    }
  }, []);

  /** Promote the measured position to the start point, on an explicit press. */
  const useCurrentLocationAsStart = useCallback(async () => {
    if (!currentLocation) return;

    hasUserPositionedMap.current = true;
    setStartPoint(currentLocation);
    setRouteError(null);
    await resolveAddress(currentLocation, setStartAddress);
    toast.success('Start set to your location.');
  }, [currentLocation, resolveAddress]);

  const markMapMovedByUser = useCallback(() => {
    hasUserPositionedMap.current = true;
  }, []);

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
    const previouslySelectedType = routes[selectedRouteIndex]?.type ?? null;

    setStartPoint(endPoint);
    setStartAddress(endAddress);
    setEndPoint(startPoint);
    setEndAddress(startAddress);
    setRouteError(null);

    if (routes.length > 0 && nextStartPoint && startPoint) {
      try {
        setIsCalculating(true);
        const recalculatedRoutes = await calculateMultipleRoutes(nextStartPoint, startPoint, travelMode);
        setRoutes(recalculatedRoutes);
        setSelectedRouteIndex(preserveRouteSelection(recalculatedRoutes, previouslySelectedType));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to recalculate route after swapping points.';
        setRouteError(message);
        toast.error(message);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [startPoint, endPoint, startAddress, endAddress, routes, selectedRouteIndex, travelMode]);

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
    mapZoom,
    routeError,
    allAirQualityData,
    isAirQualityUnavailable,
    currentLocation,
    isLocating,
    detectedCity,
    setStartAddress,
    setEndAddress,
    setSelectedRouteIndex,
    handleTravelModeChange,
    handleStartSelect,
    handleEndSelect,
    handleMapClick,
    handleMarkerDrag,
    locateMe,
    useCurrentLocationAsStart,
    markMapMovedByUser,
    calculateRoutes,
    clearRoute,
    swapPoints,
  };
};
