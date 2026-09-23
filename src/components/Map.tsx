import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';
import type { LatLng, Route, AirQualityData } from '@/types';
import { getAirQualityLevel } from '@/services/airQuality';

// Fix Leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/** Dash patterns give each route a non-colour identity on the map. */
const ROUTE_DASH_PATTERNS = ['1, 0', '10, 8', '2, 8'];

interface MapProps {
  center?: LatLng;
  zoom?: number;
  startPoint?: LatLng | null;
  endPoint?: LatLng | null;
  routes?: Route[];
  selectedRouteIndex?: number;
  onMapClick?: (latlng: LatLng) => void;
  onMarkerDrag?: (marker: 'start' | 'end', latlng: LatLng) => void;
  onUserMovedMap?: () => void;
  showAirQuality?: boolean;
  airQualityData?: AirQualityData[];
  /** Position the device measured, shown as a distinct dot. Never a route point. */
  currentLocation?: LatLng | null;
  onLocate?: () => void;
  isLocating?: boolean;
}

const buildEndpointIcon = (label: string, background: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px;
    height: 32px;
    background: ${background};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    cursor: grab;
  ">${label}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const Map = ({
  center = { lat: 55.7558, lng: 37.6173 },
  zoom = 13,
  startPoint,
  endPoint,
  routes = [],
  selectedRouteIndex = 0,
  onMapClick,
  onMarkerDrag,
  onUserMovedMap,
  showAirQuality = false,
  airQualityData = [],
  currentLocation,
  onLocate,
  isLocating = false,
}: MapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);
  const airQualityRef = useRef<L.LayerGroup | null>(null);
  const locationRef = useRef<L.LayerGroup | null>(null);
  /** Guards the one-time fit so a later render does not yank the view back. */
  const fittedRouteSignature = useRef<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    routesRef.current = L.layerGroup().addTo(map);
    airQualityRef.current = L.layerGroup().addTo(map);
    locationRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Mount-only: later centre changes are handled by their own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update click handler
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    map.off('click');

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
  }, [onMapClick]);

  // A drag or a manual zoom means the visitor has chosen the view themselves.
  useEffect(() => {
    if (!mapRef.current || !onUserMovedMap) return;

    const map = mapRef.current;
    map.on('dragstart', onUserMovedMap);

    return () => {
      map.off('dragstart', onUserMovedMap);
    };
  }, [onUserMovedMap]);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!markersRef.current) return;

    markersRef.current.clearLayers();

    if (startPoint) {
      const marker = L.marker([startPoint.lat, startPoint.lng], {
        // green-700, not green-600: the lighter tone put the white "A" at 3.2:1.
        icon: buildEndpointIcon('A', '#15803d'),
        draggable: Boolean(onMarkerDrag),
        autoPan: true,
        alt: 'Start point, draggable',
      })
        .addTo(markersRef.current)
        .bindPopup('Start. Drag to move.');

      if (onMarkerDrag) {
        marker.on('dragend', (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng();
          onMarkerDrag('start', { lat, lng });
        });
      }
    }

    if (endPoint) {
      const marker = L.marker([endPoint.lat, endPoint.lng], {
        icon: buildEndpointIcon('B', '#dc2626'),
        draggable: Boolean(onMarkerDrag),
        autoPan: true,
        alt: 'Destination, draggable',
      })
        .addTo(markersRef.current)
        .bindPopup('Destination. Drag to move.');

      if (onMarkerDrag) {
        marker.on('dragend', (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng();
          onMarkerDrag('end', { lat, lng });
        });
      }
    }
  }, [startPoint, endPoint, onMarkerDrag]);

  // The measured position, drawn in the conventional blue so it never reads as a
  // route endpoint.
  useEffect(() => {
    if (!locationRef.current) return;

    locationRef.current.clearLayers();
    if (!currentLocation) return;

    L.marker([currentLocation.lat, currentLocation.lng], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 18px;
          height: 18px;
          background: #2563eb;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25), 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: true,
      alt: 'Your location',
    })
      .addTo(locationRef.current)
      .bindPopup('Your location');
  }, [currentLocation]);

  // Update routes
  useEffect(() => {
    if (!routesRef.current) return;

    routesRef.current.clearLayers();

    routes.forEach((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const points = route.points.map(p => [p.lat, p.lng] as L.LatLngExpression);

      // High-contrast route colors based on safety
      let color = '#10b981'; // safe - emerald
      if (route.safety === 'moderate') color = '#f59e0b'; // amber
      if (route.safety === 'unsafe') color = '#ef4444'; // red
      // An unmeasured route gets a neutral colour, not a safety verdict.
      if (route.airQualitySource === 'mock') color = '#475569'; // slate

      const opacity = isSelected ? 0.98 : 0.45;
      const weight = isSelected ? 6 : 4;
      // Each route keeps its own dash pattern, so the three stay distinguishable
      // without relying on colour alone.
      const dashArray = ROUTE_DASH_PATTERNS[index % ROUTE_DASH_PATTERNS.length];

      // Draw a dark casing first so the route stays visible on any tile background
      L.polyline(points, {
        color: '#111827',
        weight: weight + 4,
        opacity: isSelected ? 0.85 : 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray,
      }).addTo(routesRef.current!);

      const polyline = L.polyline(points, {
        color,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray,
      }).addTo(routesRef.current!);

      if (isSelected) {
        const airLine = route.airQualitySource === 'mock'
          ? 'Air quality: no measurement'
          : `Avg PM2.5: ${route.avgPM25} µg/m³`;

        polyline.bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>Route ${index + 1}</strong><br/>
            Distance: ${(route.distance / 1000).toFixed(1)} km<br/>
            Time: ${Math.round(route.duration / 60)} min<br/>
            ${airLine}
          </div>
        `);
      }
    });
  }, [routes, selectedRouteIndex]);

  // Frame the whole route once it arrives. Without this a route longer than the
  // current viewport simply runs off the edge with no indication it did.
  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
      fittedRouteSignature.current = null;
      return;
    }

    const signature = routes
      .map((route) => `${route.type}:${route.points.length}:${Math.round(route.distance)}`)
      .join('|');

    if (signature === fittedRouteSignature.current) return;
    fittedRouteSignature.current = signature;

    const allPoints = routes.flatMap((route) =>
      route.points.map((point) => [point.lat, point.lng] as L.LatLngExpression),
    );

    if (allPoints.length === 0) return;

    mapRef.current.fitBounds(L.latLngBounds(allPoints), {
      padding: [48, 48],
      maxZoom: 16,
    });
  }, [routes]);

  // Update air quality circles
  useEffect(() => {
    if (!airQualityRef.current || !showAirQuality) {
      if (airQualityRef.current) {
        airQualityRef.current.clearLayers();
      }
      return;
    }

    airQualityRef.current.clearLayers();

    airQualityData.forEach((aq) => {
      const band = getAirQualityLevel(aq.pm25);
      const radius = 200;
      // Estimates are still drawn, but with a dashed outline and a labelled popup so
      // they never read as a station measurement.
      const isEstimate = aq.source === 'mock';

      L.circle([aq.location.lat, aq.location.lng], {
        radius,
        fillColor: band.color,
        // Kept low so overlapping samples do not compound into a darker patch that
        // implies worse air where there is only denser sampling.
        fillOpacity: isEstimate ? 0.14 : 0.18,
        color: band.color,
        weight: isEstimate ? 1.5 : 1,
        opacity: 0.6,
        dashArray: isEstimate ? '4, 4' : undefined,
      }).addTo(airQualityRef.current!)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>${band.level}</strong>${isEstimate ? ' <em>(estimate)</em>' : ''}<br/>
            PM2.5: ${aq.pm25} µg/m³<br/>
            PM10: ${aq.pm10} µg/m³<br/>
            NO₂: ${aq.no2} µg/m³
            ${isEstimate ? '<br/><small>No live station data here — modelled value.</small>' : ''}
          </div>
        `);
    });
  }, [airQualityData, showAirQuality]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        role="application"
        aria-label="Route planning map"
        className="h-full w-full overflow-hidden rounded-lg"
        style={{ minHeight: '400px' }}
      />

      {onLocate && (
        <button
          type="button"
          onClick={onLocate}
          disabled={isLocating}
          aria-label="Centre the map on my location"
          className="absolute right-3 z-[400] flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 shadow-lg transition-colors hover:bg-gray-50 disabled:opacity-60 bottom-28 lg:bottom-8"
        >
          {isLocating
            ? <Loader2 size={20} className="animate-spin" aria-hidden />
            : <Crosshair size={20} aria-hidden />}
        </button>
      )}
    </div>
  );
};

export default Map;
