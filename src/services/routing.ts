import axios from 'axios';
import type { LatLng, Route, RoutePoint, TravelMode } from '@/types';
import { getAirQuality, calculateRouteSafety } from './airQuality';

const OSRM_API_URL = 'https://router.project-osrm.org';

// Generate alternative waypoints to create "green" routes
const generateAlternativePoints = (
  start: LatLng, 
  end: LatLng, 
  mode: 'direct' | 'green' | 'scenic'
): LatLng[] => {
  const points: LatLng[] = [start];
  const numPoints = mode === 'direct' ? 0 : mode === 'green' ? 3 : 5;
  
  for (let i = 1; i <= numPoints; i++) {
    const t = i / (numPoints + 1);
    const baseLat = start.lat + (end.lat - start.lat) * t;
    const baseLng = start.lng + (end.lng - start.lng) * t;
    
    // Add offset to avoid highways (for green routes)
    const offsetAmount = mode === 'direct' ? 0 : 0.003;
    const offsetDirection = i % 2 === 0 ? 1 : -1;
    
    // Add some randomness for green routes to find cleaner air
    const randomOffset = mode === 'green' ? (Math.random() - 0.5) * 0.002 : 0;
    
    points.push({
      lat: baseLat + offsetAmount * offsetDirection + randomOffset,
      lng: baseLng + offsetAmount * offsetDirection * 0.5 + randomOffset
    });
  }
  
  points.push(end);
  return points;
};

const fetchOSRMRoute = async (points: LatLng[], mode: TravelMode): Promise<any> => {
  const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
  const profile = mode === 'foot' ? 'foot' : 'bike';
  
  const response = await axios.get(
    `${OSRM_API_URL}/route/v1/${profile}/${coordinates}`,
    {
      params: {
        overview: 'full',
        geometries: 'geojson',
        alternatives: false,
        steps: true
      },
      timeout: 10000
    }
  );
  
  return response.data;
};

export const calculateRoute = async (
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode = 'foot',
  routeType: 'direct' | 'green' | 'scenic' = 'green'
): Promise<Route> => {
  try {
    // Generate waypoints based on route type
    const waypoints = generateAlternativePoints(start, end, routeType);
    
    // Get route from OSRM
    const routeData = await fetchOSRMRoute(waypoints, travelMode);
    
    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = routeData.routes[0];
    const coordinates: number[][] = route.geometry.coordinates;
    
    // Convert to RoutePoints
    const routePoints: RoutePoint[] = coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0]
    }));
    
    // Sample points for air quality (every ~100m)
    const sampleInterval = Math.max(1, Math.floor(routePoints.length / 20));
    const samplePoints = routePoints.filter((_, i) => i % sampleInterval === 0);
    
    // Get air quality for sample points
    const airQualityData = await Promise.all(
      samplePoints.map(p => getAirQuality({ lat: p.lat, lng: p.lng }))
    );
    
    // Calculate average PM2.5
    const avgPM25 = airQualityData.reduce((sum, aq) => sum + aq.pm25, 0) / airQualityData.length;
    
    // Add air quality data to route points
    let aqIndex = 0;
    const enrichedRoutePoints = routePoints.map((point, i) => {
      if (i % sampleInterval === 0 && aqIndex < airQualityData.length) {
        return { ...point, airQuality: airQualityData[aqIndex++] };
      }
      return point;
    });
    
    return {
      points: enrichedRoutePoints,
      distance: route.distance,
      duration: route.duration,
      avgPM25: Math.round(avgPM25 * 10) / 10,
      safety: calculateRouteSafety(avgPM25)
    };
  } catch (error) {
    console.error('Route calculation error:', error);
    throw error;
  }
};

export const calculateMultipleRoutes = async (
  start: LatLng,
  end: LatLng,
  travelMode: TravelMode = 'foot'
): Promise<Route[]> => {
  const routeTypes: ('direct' | 'green' | 'scenic')[] = ['direct', 'green', 'scenic'];
  
  const routes = await Promise.all(
    routeTypes.map(type => 
      calculateRoute(start, end, travelMode, type).catch(() => null)
    )
  );
  
  return routes.filter((r): r is Route => r !== null);
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} min`;
};
